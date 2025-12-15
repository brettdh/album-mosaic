import random from 'random'

import type { CompleteMetadata, PartialMetadata } from '../lib/data'
import { DateTime } from 'luxon'

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url)
        if (url.pathname.startsWith('/api')) {
            const metadata = await getFullMetadata(env)
            const { percentReleased, refreshInSeconds } = getProgress(
                request,
                metadata,
            )

            const filteredMetadata = getPartialMetadata(
                metadata,
                percentReleased,
            )
            const directives = refreshInSeconds
                ? `max-age=${refreshInSeconds}`
                : `max-age=604800, must-revalidate`
            return Response.json(filteredMetadata, {
                headers: {
                    'Cache-control': `public, ${directives}`,
                },
            })
        }

        return env.ASSETS.fetch(request)
    },
} satisfies ExportedHandler<Env>

function isDev() {
    return import.meta.env.DEV
}

async function getFullMetadata(env: Env): Promise<CompleteMetadata> {
    const metadataBody = await env.metadata_bucket.get('metadata.json')
    if (!metadataBody) {
        throw new Error('Failed to get data from metadata bucket')
    }
    const metadata = await metadataBody.json()

    // TODO: use zod or something to validate this and generate a typed object
    return metadata as CompleteMetadata
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
