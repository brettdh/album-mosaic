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

    let audio: HTMLAudioElement | null
    const [activeSegment, setActiveSegment] = useState<[number, number] | null>(
        null,
    )

    function play(
        audioUrl: string,
        trackNumber: number,
        segmentNumber: number,
    ) {
        setActiveSegment([trackNumber, segmentNumber])
        if (audio) {
            audio.pause()
            audio.src = audioUrl
        } else {
            audio = new Audio(audioUrl)
        }
        audio.play()

        const playbackEnded = () => setActiveSegment(null)
        audio.addEventListener('ended', playbackEnded)
        audio.addEventListener('pause', playbackEnded)
    }

    const segmentIsPlaying = useCallback(
        (trackNumber: number, segmentNumber: number) =>
            activeSegment &&
            activeSegment[0] === trackNumber &&
            activeSegment[1] === segmentNumber,
        [activeSegment],
    )

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
                            href="#!"
                            onClick={() => audioUrl && play(audioUrl, i, j)}
                        >
                            <div
                                className={`tile ${segmentIsPlaying(i, j) ? 'playing' : ''}`}
                                style={{
                                    width: scale(width),
                                    height: scale(height),
                                }}
                            >
                                <img
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
