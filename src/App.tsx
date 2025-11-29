import './App.css'
import type { PartialMetadata } from '../lib/data'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useWindowSize } from '@uidotdev/usehooks'
import random from 'random'

import fullMetadata from '../public/build/metadata.json'

async function getMetadataFake(progress: number): Promise<PartialMetadata> {
    // TODO: replace with API fetch
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

    const audio = useRef<HTMLAudioElement | null>(null)
    const [activeSegment, setActiveSegment] = useState<[number, number] | null>(
        null,
    )

    function play(
        audioUrl: string,
        trackNumber: number,
        segmentNumber: number,
    ) {
        setActiveSegment([trackNumber, segmentNumber])
        if (audio.current) {
            audio.current.pause()
            audio.current.src = audioUrl
        } else {
            audio.current = new Audio(audioUrl)
        }
        audio.current.play()

        const playbackEnded = () => setActiveSegment(null)
        audio.current.addEventListener('ended', playbackEnded)
        audio.current.addEventListener('pause', playbackEnded)
    }

    const segmentIsPlaying = useCallback(
        (trackNumber: number, segmentNumber: number) =>
            activeSegment &&
            activeSegment[0] === trackNumber &&
            activeSegment[1] === segmentNumber,
        [activeSegment],
    )

    useEffect(() => {
        getMetadataFake(100).then((metadata) => setMediaMetadata(metadata))
    }, [])
    const [progress, setProgress] = useState(100)

    if (!mediaMetadata) {
        return <div className="loading">Loading</div>
    }
    return (
        <div className="container">
            <div
                className="cover"
                style={{ height: scale(mediaMetadata.totalHeight) }}
            >
                {mediaMetadata.tracks.map(({ segments, height }, i) => (
                    <div key={`track-${i}`} className="track">
                        {segments.map(({ imageUrl, audioUrl, width }, j) =>
                            imageUrl && audioUrl ? (
                                <a
                                    key={`segment-${i}-${j}`}
                                    href="#!"
                                    onClick={() =>
                                        audioUrl && play(audioUrl, i, j)
                                    }
                                >
                                    <div
                                        className={`tile filled ${segmentIsPlaying(i, j) ? 'playing' : ''}`}
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
                            ) : (
                                <div
                                    key={`segment-${i}-${j}`}
                                    className="tile empty"
                                    style={{
                                        width: scale(width),
                                        height: scale(height),
                                    }}
                                />
                            ),
                        )}
                    </div>
                ))}
            </div>
            {import.meta.env.MODE === 'development' && (
                <div className="controls">
                    <div>
                        {`Progress: ${progress.toFixed(2)}%`}
                        <input
                            type="range"
                            min={0}
                            max={100}
                            step="any"
                            value={progress}
                            onChange={(event) =>
                                setProgress(parseFloat(event.target.value))
                            }
                        />
                    </div>
                    <button
                        value="Update"
                        onClick={() => {
                            getMetadataFake(progress).then((metadata) =>
                                setMediaMetadata(metadata),
                            )
                        }}
                    >
                        Update
                    </button>
                </div>
            )}
        </div>
    )
}

export default App
