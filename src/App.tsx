import './App.css'
import type { PartialMetadata } from '../lib/data'
import { useMount } from '../lib/hooks'
import { useCallback, useRef, useState } from 'react'
import { useWindowSize } from '@uidotdev/usehooks'
import { parse } from 'cache-parser'
import { DateTime } from 'luxon'
import toast, { Toaster } from 'react-hot-toast'

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

    async function play(
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
        await audio.current.play()

        const playbackEnded = () => setActiveSegment(null)
        audio.current.addEventListener('ended', playbackEnded)
        audio.current.addEventListener('pause', playbackEnded)
    }

    function handlePlayError(e: Error) {
        console.error('Error playing audio:', e)
        toast.error('Error playing audio; please reload the page')
    }

    const segmentIsPlaying = useCallback(
        (trackNumber: number, segmentNumber: number) =>
            activeSegment &&
            activeSegment[0] === trackNumber &&
            activeSegment[1] === segmentNumber,
        [activeSegment],
    )

    interface FetchParams {
        progress?: number
        releaseStart?: string
        releaseEnd?: string
    }

    const fetchMetadata = useCallback(
        async (params: FetchParams) => {
            const stringParams = Object.entries(params)
                .filter(([_, v]) => !!v)
                .map(([k, v]) => [k, `${v}`])
            const searchParams = new URLSearchParams(stringParams)
            const response = await fetch(`/metadata?${searchParams.toString()}`)
            const metadata = (await response.json()) as PartialMetadata
            setMediaMetadata(metadata)

            const start = DateTime.fromISO(
                params.releaseStart ?? metadata.releaseStart,
            )
            const end = DateTime.fromISO(
                params.releaseEnd ?? metadata.releaseEnd,
            )
            const now = DateTime.now()
            if (start < now && now < end) {
                const ccHeader = response.headers.get('cache-control')
                if (ccHeader) {
                    const { maxAge } = parse(ccHeader)
                    if (maxAge) {
                        setTimeout(() => {
                            fetchMetadata(params).catch(handleFetchError)
                        }, maxAge * 1000)
                    }
                }
            }
        },
        [setMediaMetadata],
    )

    function handleFetchError(e: Error) {
        console.error('Error fetching metadata', e)
        toast.error('Error loading data; please reload the page')
    }

    useMount(() => {
        fetchMetadata({ progress: 100 }).catch(handleFetchError)
    })
    const [releaseDurationSeconds, setReleaseDurationSeconds] = useState(30)
    const [progress, setProgress] = useState(100)

    if (!mediaMetadata) {
        return <div className="loading">Loading</div>
    }
    return (
        <div className="container">
            <div>
                <Toaster position="top-right" />
            </div>
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
                                    onClick={() => {
                                        if (audioUrl) {
                                            play(audioUrl, i, j).catch(
                                                handlePlayError,
                                            )
                                        }
                                    }}
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
                            fetchMetadata({ progress }).catch(handleFetchError)
                        }}
                    >
                        Update
                    </button>
                    <div id="release-simulator">
                        <label htmlFor="release-duration">
                            Simulated release duration
                        </label>
                        <input
                            id="release-duration"
                            value={releaseDurationSeconds}
                            onChange={(e) =>
                                setReleaseDurationSeconds(
                                    parseInt(e.target.value, 10),
                                )
                            }
                        />
                    </div>
                    <button
                        value="Simulate"
                        onClick={() => {
                            const releaseStart = DateTime.now().toISO()
                            const releaseEnd = DateTime.now()
                                .plus({
                                    seconds: releaseDurationSeconds,
                                })
                                .toISO()
                            fetchMetadata({ releaseStart, releaseEnd }).catch(
                                handleFetchError,
                            )
                        }}
                    >
                        Simulate
                    </button>
                </div>
            )}
        </div>
    )
}

export default App
