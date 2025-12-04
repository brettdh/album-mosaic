import random from 'random'

import { CompleteMetadata, PartialMetadata } from '../../lib/data'
import { Config } from '@netlify/functions'

export default async function (request: Request) {
    const metadata = await getFullMetadata()
    const progress = getProgress(request, metadata)

    const filteredMetadata = await getMetadataFake(metadata, progress)
    return new Response(JSON.stringify(filteredMetadata))
}

async function getFullMetadata(): Promise<CompleteMetadata> {
    if (process.env.CONTEXT === 'dev') {
        const { default: fullMetadata } = await import(
            '../../public/build/metadata.json'
        )
        const metadata = structuredClone(fullMetadata) as CompleteMetadata
        return metadata
    }
    // TODO: implement fetching metadata from blob storage
    throw new Error('not implemented')
}

function getProgress(request: Request, metadata: CompleteMetadata) {
    if (process.env.CONTEXT === 'dev') {
        const progressParam = new URL(request.url).searchParams.get('progress')
        if (progressParam !== null) {
        }
    }
}

async function getMetadataFake(
    completeMetadata: CompleteMetadata,
    progress: number,
): Promise<PartialMetadata> {
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
