import './App.css'
import type { PartialMetadata } from '../lib/data'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWindowSize } from '@uidotdev/usehooks'

async function getMetadataFake(): Promise<PartialMetadata> {
    // TODO: replace with API fetch
    const metadata = (await import('../public/build/metadata.json'))
        .default as PartialMetadata

    return metadata
}

function App() {
    const windowSize = useWindowSize()

    const [mediaMetadata, setMediaMetadata] = useState<PartialMetadata | null>(
        null,
    )
    const scale = useCallback(
        (value: number) => {
            if (!mediaMetadata) {
                throw new Error('Called scale() before loading media metadata')
            }
            if (windowSize.height === null || windowSize.width === null) {
                throw new Error('windowSize not initialized')
            }

            let scaleFactor = 1.0
            if (mediaMetadata.totalHeight > windowSize.height) {
                scaleFactor = windowSize.height / mediaMetadata.totalHeight
            }

            return scaleFactor * value
        },
        [windowSize, mediaMetadata],
    )

    function play(audioUrl?: string) {
        if (audioUrl) {
            const audio = new Audio(audioUrl)
            audio.play()
        }
    }

    useEffect(() => {
        getMetadataFake().then((metadata) => setMediaMetadata(metadata))
    }, [])

    if (!mediaMetadata) {
        return <div className="loading">Loading</div>
    }
    return (
        <div
            className="cover"
            style={{ height: scale(mediaMetadata.totalHeight) }}
        >
            {mediaMetadata.tracks.map(({ segments, height }, i) => (
                <div key={`track-${i}`} className="track">
                    {segments.map(({ imageUrl, audioUrl, width }, j) => (
                        <a
                            key={`segment-${i}-${j}`}
                            href="#"
                            onClick={() => play(audioUrl)}
                        >
                            <div
                                className="tile"
                                style={{
                                    width: scale(width),
                                    height: scale(height),
                                }}
                            >
                                <img
                                    title={`Track ${i} segment ${j}`}
                                    src={imageUrl}
                                    width={scale(width)}
                                    height={scale(height)}
                                />
                            </div>
                        </a>
                    ))}
                </div>
            ))}
        </div>
    )
}

export default App
