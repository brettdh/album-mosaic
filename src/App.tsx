import './App.css'
import type { PartialMetadata } from '../lib/data'
import { useMount } from '../lib/hooks'
import { useCallback, useRef, useState } from 'react'
import { useWindowSize } from '@uidotdev/usehooks'
import { parse } from 'cache-parser'
import { DateTime, Duration } from 'luxon'
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
            if (windowSize.width > windowSize.height) {
                if (mediaMetadata.totalHeight > windowSize.height) {
                    scaleFactor = windowSize.height / mediaMetadata.totalHeight
                }
            } else {
                if (mediaMetadata.totalWidth > windowSize.width) {
                    scaleFactor = windowSize.width / mediaMetadata.totalWidth
                }
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

    const nextFetchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

    const fetchMetadata = useCallback(
        async (params: FetchParams = {}) => {
            if (nextFetchTimeout.current) {
                clearTimeout(nextFetchTimeout.current)
                nextFetchTimeout.current = undefined
            }

            const stringParams = Object.entries(params)
                .filter(([_, v]) => !!v)
                .map(([k, v]) => [k, `${v}`])
            const searchParams = new URLSearchParams(stringParams)
            const response = await fetch(
                `/api/metadata?${searchParams.toString()}`,
            )
            const metadata = (await response.json()) as PartialMetadata

            if (params.releaseStart) {
                metadata.releaseStart = params.releaseStart
            }
            if (params.releaseEnd) {
                metadata.releaseEnd = params.releaseEnd
            }
            setMediaMetadata(metadata)

            if (params.progress !== undefined) {
                return
            }

            const start = DateTime.fromISO(metadata.releaseStart)
            const end = DateTime.fromISO(metadata.releaseEnd)

            const now = DateTime.now()
            if (start < now && now < end) {
                const ccHeader = response.headers.get('cache-control')
                if (ccHeader) {
                    const { maxAge } = parse(ccHeader)
                    if (maxAge) {
                        setNextFetchTime(
                            DateTime.now().plus({ seconds: maxAge }),
                        )
                        nextFetchTimeout.current = setTimeout(() => {
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

    const [nextFetchTime, setNextFetchTime] = useState<DateTime | null>(null)
    const [currentTime, setCurrentTime] = useState(DateTime.now())
    useMount(() => {
        const params = import.meta.env.DEV ? { progress: 100 } : undefined
        fetchMetadata(params).catch(handleFetchError)
        setInterval(() => setCurrentTime(DateTime.now()), 1000)
    })

    const timeUntilRelease = useCallback(() => {
        if (!mediaMetadata) {
            return ''
        }
        const end = DateTime.fromISO(mediaMetadata.releaseEnd)
        if (currentTime >= end) {
            return `Completed ${end.toRelative()}`
        }
        return `Complete  ${end.toRelative({ rounding: 'ceil' })}`
    }, [mediaMetadata, currentTime])

    const timeUntilNextChunk = useCallback(() => {
        if (!mediaMetadata || !nextFetchTime) {
            return ''
        }
        const end = DateTime.fromISO(mediaMetadata.releaseEnd)
        if (nextFetchTime >= end) {
            return ''
        }
        const rounded = nextFetchTime.toRelative({ rounding: 'round' })
        return `Next chunk ${rounded}`
    }, [mediaMetadata, nextFetchTime])

    const [releaseDurationSeconds, setReleaseDurationSeconds] = useState(30)
    const [progress, setProgress] = useState(100)

    if (!mediaMetadata) {
        return <div className="loading">Loading</div>
    }
    return (
        <div className="container">
            <Toaster position="top-right" />
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
                                        className={`tile filled${segmentIsPlaying(i, j) ? ' playing' : ''}`}
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
            <div className="countdowns">
                <h3>Release Progress</h3>
                <span>{timeUntilRelease()}</span>
                <span>{timeUntilNextChunk()}</span>
            </div>
            {import.meta.env.DEV && (
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
