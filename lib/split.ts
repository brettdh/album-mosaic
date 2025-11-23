import { exec as execOrig } from "child_process"
import { randomUUID } from "crypto"
import os from "os"
import path from "path"
import util from "util"

import { program, InvalidArgumentError } from "commander"
import fs from "fs-extra"
import cliProgress from "cli-progress"

import { durationToSeconds, getDuration } from "./audio.ts"

const exec = util.promisify(execOrig)
const glob = util.promisify(fs.glob)

import sharp from "sharp"

function positiveNumeric(value: string, _): number {
    const parsedValue = parseInt(value, 10)
    if (isNaN(parsedValue)) {
        throw new InvalidArgumentError("Not a number.")
    }
    if (parsedValue <= 0) {
        throw new InvalidArgumentError("Must be greater than zero.")
    }
    return parsedValue
}

const pathExistsPredicate =
    (expectDirectory: boolean) =>
    (value: string): string => {
        if (!fs.pathExistsSync(value)) {
            throw new InvalidArgumentError("Path does not exist")
        }

        const stat = fs.lstatSync(value)
        if (expectDirectory && !stat.isDirectory()) {
            throw new InvalidArgumentError("Path is not a directory")
        } else if (!expectDirectory && stat.isDirectory()) {
            throw new InvalidArgumentError("Path is a directory; expected a file")
        }

        return value
    }

const fileExists = pathExistsPredicate(false)
const directoryExists = pathExistsPredicate(true)

function emptyOrAbsentDirectory(value: string): string {
    if (fs.pathExistsSync(value)) {
        const stat = fs.lstatSync(value)
        if (!stat.isDirectory()) {
            throw new InvalidArgumentError("Path is not a directory")
        }
        const files = fs.readdirSync(value)
        if (files.length !== 0) {
            throw new InvalidArgumentError("Directory is not empty")
        }
    }

    return value
}

program
    .requiredOption("--out-dir <path>", "Output directory path", emptyOrAbsentDirectory)
    .requiredOption("--image <path>", "Path to album cover image file", fileExists)
    .requiredOption(
        "--audio-dir <path>",
        "Path to directory containing audio files",
        directoryExists
    )
    .option("--chunk-size <seconds>", "Size of output audio chunk in seconds", positiveNumeric, 1)

program.parse()
const options = program.opts()

if (!(await fs.pathExists(options.outDir))) {
    await fs.mkdir(options.outDir)
}

const imageExt = path.extname(options.image)
const imageData = await fs.readFile(options.image)
const imageMetadata = await sharp(imageData).metadata()

const audioFiles = await fs.readdir(options.audioDir)

const readProgress = new cliProgress.SingleBar(
    {
        format: "Reading audio | {bar} | {value}/{total}",
    },
    cliProgress.Presets.rect
)
readProgress.start(audioFiles.length, 0)

const results = await Promise.all(
    audioFiles.map(async (filename) => {
        const fullPath = path.join(options.audioDir, filename)
        const duration = await getDuration(fullPath)
        const seconds = durationToSeconds(duration)
        const chunks = Math.floor(seconds / options.chunkSize)
        readProgress.increment()
        return { filename, duration, seconds, chunks }
    })
)
readProgress.stop()

const totalChunks = results.map(({ chunks }) => chunks).reduce((a, b) => a + b)
console.log(`${results.length} tracks, total ${totalChunks} chunks`)

const maxFilenameLength = Math.max(...results.map(({ filename }) => filename.length))

console.log(`${"Filename".padEnd(maxFilenameLength, " ")} | Audio | Images`)
const progress = new cliProgress.MultiBar(
    {
        clearOnComplete: false,
        hideCursor: true,
        format: "{filenamePadded} |     {audioStatus} | {audioDuration} | {bar} | {value}/{total}",
    },
    cliProgress.Presets.rect
)

type Chunk = {
    start: number
    end: number
}
const chunkSize = (chunk: Chunk) => chunk.end - chunk.start

function getChunk(total: number, numChunks: number, currentChunk: number): Chunk {
    const getChunkStart = (n: number) => Math.floor((total * n) / numChunks)
    const start = getChunkStart(currentChunk)
    const end = getChunkStart(currentChunk + 1)
    return { start, end }
}

const imagesDir = path.join(options.outDir, "images")
await fs.mkdir(imagesDir)
const audioDir = path.join(options.outDir, "audio")
await fs.mkdir(audioDir)

const trackMetadata = await Promise.all(
    results.map(async ({ filename, duration, seconds, chunks }, fileIndex) => {
        const filenamePadded = filename.padEnd(maxFilenameLength, " ")
        const bar = progress.create(chunks, 0, {
            filenamePadded,
            audioDuration: duration,
            audioStatus: "⏳",
        })
        const imageHeightChunk = getChunk(imageMetadata.height, results.length, fileIndex)
        const yWidth = Math.ceil(Math.log10(results.length))
        const paddedY = String(fileIndex).padStart(yWidth, "0")

        const fullPath = path.join(options.audioDir, filename)
        const audioChunkSize = seconds / chunks
        const audioExt = path.extname(filename)
        const xWidth = Math.ceil(Math.log10(chunks))
        const indexTemplate = `%0${xWidth}d`
        const audioChunkTemplatePath = path.join(audioDir, `${paddedY}-${indexTemplate}${audioExt}`)

        await exec(
            `ffmpeg -i "${fullPath}" -f segment -segment_time ${audioChunkSize} -c copy -shortest ${audioChunkTemplatePath}`
        )
        const audioFiles = (await glob(
            audioChunkTemplatePath.replace(indexTemplate, "*")
        )) as string[]
        const endDurations = await Promise.all(
            audioFiles.slice(-2).map(async (file) => durationToSeconds(await getDuration(file)))
        )
        if (endDurations[1] < endDurations[0] / 4) {
            // concatenate last two audio files together, since the last one is very short
            const tmpdir = await fs.mkdtemp(os.tmpdir())
            const inputFile = path.join(tmpdir, "concat.txt")
            const lastFile = audioChunkTemplatePath.replace(indexTemplate, "last")
            const content = audioFiles
                .slice(-2)
                .map((f) => `file '${path.resolve(f)}'`)
                .join("\n")
            await fs.writeFile(inputFile, `${content}\n`)
            await exec(`ffmpeg -f concat -safe 0 -i ${inputFile} -c copy ${lastFile}`)
            audioFiles.pop()
            audioFiles.pop()
            audioFiles.push(lastFile)
            await fs.remove(inputFile)
            await fs.rmdir(tmpdir)
        }

        bar.setTotal(audioFiles.length)
        bar.update(0, {
            filenamePadded,
            audioDuration: duration,
            audioStatus: `✅`,
        })

        // We did the audio splitting first, because we can get a different number of chunks
        // than we asked for, based on bit rate considerations. We then use the number of cunks
        // that we got and split the image strip into the same number.

        const imageStripChunks = await Promise.all(
            [...Array(audioFiles.length).keys()].map(async (chunkNum) => {
                const imageWidthChunk = getChunk(imageMetadata.width, audioFiles.length, chunkNum)

                const imageChunkFilename = path.join(imagesDir, `${randomUUID()}${imageExt}`)
                const params = {
                    top: imageHeightChunk.start,
                    left: imageWidthChunk.start,
                    width: chunkSize(imageWidthChunk),
                    height: chunkSize(imageHeightChunk),
                }
                await sharp(imageData).extract(params).toFile(imageChunkFilename)

                bar.increment()

                return imageChunkFilename
            })
        )

        const renamedAudioFiles = await Promise.all(
            audioFiles.map(async (filename) => {
                const audioChunkExt = path.extname(filename)
                const newFilename = path.join(audioDir, `${randomUUID()}${audioChunkExt}`)
                await fs.rename(filename, newFilename)
                return newFilename
            })
        )
        return {
            images: imageStripChunks,
            audio: renamedAudioFiles,
        }
    })
)
// stop all bars
progress.stop()

const metadataPath = path.join(options.outDir, "metadata.json")
const metadata = { tracks: trackMetadata }
await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
