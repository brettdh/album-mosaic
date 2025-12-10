import fs from 'fs-extra'
import path from 'path'

import { program, InvalidArgumentError } from '@commander-js/extra-typings'
import { DateTime, Duration } from 'luxon'

import type { CompleteMetadata } from './data.ts'

function isoTimestamp(value: string): DateTime {
    try {
        return DateTime.fromISO(value)
    } catch (_) {
        throw new InvalidArgumentError('Not a valid timestamp')
    }
}

const command = program
    .requiredOption(
        '--release-start <iso-timestamp>',
        'Start of release period (ISO 8601 timestamp)',
        isoTimestamp,
    )
    .requiredOption(
        '--release-end <iso-timestamp>',
        'End of release period (ISO 8601 timestamp)',
        isoTimestamp,
    )
command.parse()
const options = command.opts()
const { releaseStart, releaseEnd } = options
if (releaseEnd <= releaseStart) {
    throw new InvalidArgumentError('releaseEnd must be after releaseStart')
}

const buildDir = 'build'
const metadataPath = path.join(buildDir, 'metadata.json')
const metadata = JSON.parse(
    (await fs.readFile(metadataPath)).toString(),
) as CompleteMetadata
metadata.releaseStart = releaseStart.toISO()!
metadata.releaseEnd = releaseEnd.toISO()!

const segmentCount = metadata.tracks
    .map(({ segments }) => segments.length)
    .reduce((a, b) => a + b, 0)
metadata.segmentCount = segmentCount

const duration = releaseEnd.diff(releaseStart).rescale()
console.log(
    `Release period: ${metadata.releaseStart} - ${metadata.releaseEnd} (${duration.toHuman()})`,
)

const interval = Duration.fromMillis(
    duration.toMillis() / segmentCount,
).rescale()
console.log(`Segment release interval: ${interval.toHuman()}`)

await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
