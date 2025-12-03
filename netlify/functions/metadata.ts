import random from 'random'

import fullMetadata from '../..//public/build/metadata.json'
import { PartialMetadata } from '../../lib/data'
import { Config } from '@netlify/functions'

export default async function (request: Request) {
    const progress = parseFloat(
        new URL(request.url).searchParams.get('progress') ?? '100',
    )
    const metadata = await getMetadataFake(progress)
    return new Response(JSON.stringify(metadata))
}

async function getMetadataFake(progress: number): Promise<PartialMetadata> {
    const metadata = structuredClone(fullMetadata) as PartialMetadata

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
