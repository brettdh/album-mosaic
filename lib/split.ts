import { exec as execOrig } from 'child_process'
import path from 'path'
import util from 'util'

import { program, InvalidArgumentError } from 'commander'
import fs from 'fs-extra'
import cliProgress from 'cli-progress'

const exec = util.promisify(execOrig);

import sharp from 'sharp'
import { table } from 'table'


function positiveNumeric(value: string, _): number {
    const parsedValue = parseInt(value, 10)
    if (isNaN(parsedValue)) {
        throw new InvalidArgumentError('Not a number.')
    }
    if (parsedValue <= 0) {
        throw new InvalidArgumentError('Must be greater than zero.')
    }
    return parsedValue;
}

const pathExistsPredicate = (expectDirectory: boolean) => (value: string): string => {
    if (!fs.pathExistsSync(value)) {
        throw new InvalidArgumentError('Path does not exist')
    }

    const stat = fs.lstatSync(value)
    if (expectDirectory && !stat.isDirectory()) {
        throw new InvalidArgumentError('Path is not a directory')
    } else if (!expectDirectory && stat.isDirectory()) {
        throw new InvalidArgumentError('Path is a directory; expected a file')
    }

    return value
}

const fileExists = pathExistsPredicate(false)
const directoryExists = pathExistsPredicate(true)

function emptyOrAbsentDirectory(value: string): string {
    if (fs.pathExistsSync(value)) {
        const stat = fs.lstatSync(value)
        if (!stat.isDirectory()) {
            throw new InvalidArgumentError('Path is not a directory')
        }
        const files = fs.readdirSync(value)
        if (files.length !== 0) {
            throw new InvalidArgumentError('Directory is not empty')
        }
    }

    return value
}

program
    .requiredOption("--out-dir <path>", "Output directory path", emptyOrAbsentDirectory)
    .requiredOption("--image <path>", "Path to album cover image file", fileExists)
    .requiredOption("--audio-dir <path>", "Path to directory containing audio files", directoryExists)
    .option("--chunk-size <seconds>", "Size of output audio chunk in seconds", positiveNumeric, 1)

program.parse()
const options = program.opts()

if (!(await fs.pathExists(options.outDir))) {
    await fs.mkdir(options.outDir)
}

const imageExt = path.extname(options.image)
const imageData = await fs.readFile(options.image)
const metadata = await sharp(imageData).metadata()

const audioFiles = await fs.readdir(options.audioDir)

const readProgress = new cliProgress.SingleBar({
    format: 'Reading audio | {bar} | {value}/{total}',
}, cliProgress.Presets.rect);
readProgress.start(audioFiles.length, 0)

const results = await Promise.all(
    audioFiles.map(
        async filename => {
            const fullPath = path.join(options.audioDir, filename)
            const { stdout } = await exec(`ffmpeg -i "${fullPath}" -f null - 2>&1 | awk '/Duration/ {print $2}' | tr -d ,`)
            const duration = stdout.trim()
            const [hoursStr, minutesStr, secondsStr] = duration.split(":")
            const seconds = (
                parseInt(hoursStr, 10) * 3600 +
                parseInt(minutesStr, 10) * 60 +
                parseFloat(secondsStr)
            )
            const chunks = Math.floor(seconds / options.chunkSize)
            readProgress.increment()
            return { filename, duration, seconds, chunks }
        }
    )
)

readProgress.stop()

// console.log(
//     table(
//         [
//             [options.image, `${metadata.width}x${metadata.height}`],
//             ...results.map(({ filename, duration, chunks }) => [filename, `${duration} (${chunks} chunks)`])
//         ]
//     )
// )

const totalChunks = results.map(({ chunks }) => chunks).reduce((a, b) => (a + b))
console.log(`${results.length} tracks, total ${totalChunks} chunks`)

const maxFilenameLength = Math.max(...results.map(({ filename }) => filename.length))

console.log(`${'Filename'.padEnd(maxFilenameLength, ' ')} | Audio | Images`)
const progress = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    format: '{filenamePadded} |    {audioStatus} | {audioDuration} | {bar} | {value}/{total}',
}, cliProgress.Presets.rect);

type Chunk = {
    start: number
    end: number
}
const chunkSize = (chunk: Chunk) => (chunk.end - chunk.start)

function getChunk(total: number, numChunks: number, currentChunk: number): Chunk {
    const getChunkStart = (n: number) => Math.floor(total * n / numChunks)
    const start = getChunkStart(currentChunk)
    const end = getChunkStart(currentChunk + 1)
    return { start, end }
}

const imagesDir = path.join(options.outDir, 'images')
await fs.mkdir(imagesDir)
const audioDir = path.join(options.outDir, 'audio')
await fs.mkdir(audioDir)

await Promise.all(
    results.map(
        async ({ filename, duration, seconds, chunks }, fileIndex) => {
            const filenamePadded = filename.padEnd(maxFilenameLength, ' ')
            const bar = progress.create(chunks, 0, { filenamePadded, audioDuration: duration, audioStatus: '⏳' })
            const imageHeightChunk = getChunk(metadata.height, results.length, fileIndex)
            const paddedY = String(fileIndex).padStart(4, '0')

            const fullPath = path.join(options.audioDir, filename)
            const audioChunkSize = seconds / chunks
            const audioExt = path.extname(filename)
            const audioChunkTemplatePath = path.join(audioDir, `${paddedY}-%04d${audioExt}`)

            let chunksDone = 0
            const segmentPromise = exec(
                `ffmpeg -i "${fullPath}" -f segment -segment_time ${audioChunkSize} ${audioChunkTemplatePath}`
            ).then(() => {
                bar.update(chunksDone, { filenamePadded, audioDuration: duration, audioStatus: '✅' })
            })

            await Promise.all([
                segmentPromise,
                ...[...Array(chunks).keys()].map(
                    async (chunkNum) => {
                        const imageWidthChunk = getChunk(metadata.width, chunks, chunkNum)

                        const paddedX = String(chunkNum).padStart(5, '0')
                        const imageChunkFilename = path.join(
                            imagesDir,
                            `${paddedX}-${paddedY}${imageExt}`
                        )
                        const params = {
                            top: imageHeightChunk.start,
                            left: imageWidthChunk.start,
                            width: chunkSize(imageWidthChunk),
                            height: chunkSize(imageHeightChunk),
                        }
                        await sharp(imageData).extract(params).toFile(imageChunkFilename)

                        chunksDone++
                        bar.increment()
                    }
                )
            ])
        }
    )
)

// stop all bars
progress.stop();
