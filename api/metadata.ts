import fs from 'fs-extra'
import random from 'random'

import type { CompleteMetadata, PartialMetadata } from '../lib/data'
import { DateTime } from 'luxon'
import { getEnv } from '@vercel/functions'

export default {
    async fetch(request: Request) {
        const metadata = await getFullMetadata()
        const { percentReleased, refreshInSeconds } = getProgress(
            request,
            metadata,
        )

        const filteredMetadata = getPartialMetadata(metadata, percentReleased)
        const directives = refreshInSeconds
            ? `max-age=${refreshInSeconds}`
            : `max-age=604800, must-revalidate`
        return new Response(JSON.stringify(filteredMetadata), {
            headers: {
                'Cache-control': `public, ${directives}`,
            },
        })
    },
}

function isDev() {
    // VERCEL_ENV is undefined here, so we use VERCEL_REGION instead
    // https://github.com/vercel/vercel/issues/14450
    const env = getEnv()
    const { VERCEL_REGION } = env
    return VERCEL_REGION?.startsWith('dev')
}

async function getFullMetadata(): Promise<CompleteMetadata> {
    if (isDev()) {
        const metadataPath = './build/metadata.json'
        const fullMetadata = JSON.parse(
            (await fs.readFile(metadataPath)).toString(),
        ) as CompleteMetadata
        const metadata = structuredClone(fullMetadata)
        return metadata
    }

    const blobUrl = process.env.METADATA_BLOB_URL
    if (!blobUrl) {
        throw new Error('METADATA_BLOB_URL is undefined')
    }

    const response = await fetch(blobUrl)
    const metadata = (await response.json()) as CompleteMetadata
    return metadata
}

interface Progress {
    percentReleased: number
    refreshInSeconds: number | null
}

function getProgress(request: Request, metadata: CompleteMetadata): Progress {
    let { releaseStart, releaseEnd } = metadata
    if (isDev()) {
        const params = new URL(request.url).searchParams
        const progressParam = params.get('progress')
        if (progressParam !== null) {
            return {
                percentReleased: parseFloat(progressParam),
                refreshInSeconds: null,
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
