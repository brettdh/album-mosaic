import fs from 'fs-extra'
import random from 'random'

import type { CompleteMetadata, PartialMetadata } from '../../lib/data'
// import { getDeployStore } from '@netlify/blobs'
import type { Config } from '@netlify/functions'
import { DateTime } from 'luxon'

export default async function (request: Request) {
    const metadata = await getFullMetadata()
    const { percentReleased, refreshInSeconds } = getProgress(request, metadata)

    const filteredMetadata = getPartialMetadata(metadata, percentReleased)
    const directives = refreshInSeconds
        ? `max-age=${refreshInSeconds}`
        : `max-age=604800, must-revalidate`
    return new Response(JSON.stringify(filteredMetadata), {
        headers: {
            'Cache-control': `public, ${directives}`,
        },
    })
}

async function getFullMetadata(): Promise<CompleteMetadata> {
    if (process.env.CONTEXT === 'dev') {
        const metadataPath = '../../build/metadata.json'
        const fullMetadata = JSON.parse(
            (await fs.readFile(metadataPath)).toString(),
        ) as CompleteMetadata
        const metadata = structuredClone(fullMetadata)
        return metadata
    }

    // const store = getDeployStore()
    throw new Error('WIP')
}

interface Progress {
    percentReleased: number
    refreshInSeconds: number | null
}

function getProgress(request: Request, metadata: CompleteMetadata): Progress {
    let { releaseStart, releaseEnd } = metadata
    if (process.env.CONTEXT === 'dev') {
        const params = new URL(request.url).searchParams
        const progressParam = params.get('progress')
        if (progressParam !== null) {
            return {
                percentReleased: parseFloat(progressParam),
                refreshInSeconds: 0,
            }
        }
        const startParam = params.get('releaseStart')
        const endParam = params.get('releaseEnd')
        if (startParam !== null && endParam !== null) {
            releaseStart = startParam
            releaseEnd = endParam
        }
    }
    const start = DateTime.fromISO(releaseStart)
    const end = DateTime.fromISO(releaseEnd)
    const now = DateTime.now()
    if (now <= start) {
        return {
            percentReleased: 0,
            refreshInSeconds: null,
        }
    }
    if (now >= end) {
        return {
            percentReleased: 100,
            refreshInSeconds: null,
        }
    }
    const percentReleased =
        100 * (now.diff(start).toMillis() / end.diff(start).toMillis())
    const releaseInterval = Math.ceil(
        end.diff(start).toMillis() / metadata.segmentCount,
    )
    const refreshInSeconds = Math.ceil(
        (releaseInterval - (now.diff(start).toMillis() % releaseInterval)) /
            1000,
    )
    return { percentReleased, refreshInSeconds }
}

function getPartialMetadata(
    completeMetadata: CompleteMetadata,
    progress: number,
): PartialMetadata {
    const metadata: PartialMetadata = completeMetadata
    const segmentsFlat = metadata.tracks.map(({ segments }) => segments).flat()

    const seed = 42
    const prng = random.clone(seed)
    const sampleSize = Math.ceil((1 - progress / 100) * segmentsFlat.length)

    const sample = prng.sample(segmentsFlat, sampleSize)

    for (const segment of sample) {
        segment.audioUrl = undefined
        segment.imageUrl = undefined
    }

    return metadata
}

export const config: Config = {
    path: '/metadata',
}
