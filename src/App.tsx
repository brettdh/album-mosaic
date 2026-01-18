import './App.css'
import {
    getAvailableSegments,
    percentComplete,
    timeUntilNextChunk,
    timeUntilRelease,
    type PartialMetadata,
} from '../lib/data'
import { useMount } from '../lib/hooks'
import { useCallback, useRef, useState } from 'react'
import { useWindowSize } from '@uidotdev/usehooks'
import { parse } from 'cache-parser'
import { DateTime } from 'luxon'
import toast, { Toaster } from 'react-hot-toast'
import random from 'random'
import Track from './track'
import useAudioPlayer from './useAudioPlayer'
import Links from './Links'

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

    const { player, chunkQueue } = useAudioPlayer()

    function playRandom(numChunks: number) {
        const availableSegments = getAvailableSegments(mediaMetadata)

        const chunks = random.sample(availableSegments, numChunks)
        player.enqueue(chunks)
    }

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
                    const dateHeader = response.headers.get('date')
                    const responseDate = dateHeader
                        ? DateTime.fromHTTP(dateHeader)
                        : null

                    const age = responseDate
                        ? -responseDate.diffNow().toMillis()
                        : null

                    const { maxAge } = parse(ccHeader)
                    if (age && maxAge) {
                        const milliseconds = Math.max(0, maxAge * 1000 - age)
                        setNextFetchTime(DateTime.now().plus({ milliseconds }))
                        nextFetchTimeout.current = setTimeout(() => {
                            fetchMetadata(params).catch(handleFetchError)
                        }, milliseconds)
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
        // XXX: due to strict mode rendering this twice, the cleanup
        // doesn't clear the timeout because it hasn't been set yet
        // when the cleanup runs. There's probably a better way to do this,
        // but for now let's just be aware that it can happen in dev,
        // leading to weird effects when using the simulation tools.
        fetchMetadata().catch(handleFetchError)
        const interval = setInterval(() => setCurrentTime(DateTime.now()), 1000)
        return () => {
            clearTimeout(nextFetchTimeout.current)
            clearInterval(interval)
        }
    })

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
                {mediaMetadata.tracks.map(({ segments, height }, trackNum) => (
                    <Track
                        key={`track-${trackNum}`}
                        trackNum={trackNum}
                        segments={segments}
                        height={height}
                        scale={scale}
                    />
                ))}
            </div>
            <div className="inner-container">
                <div className="countdowns">
                    <h3>Release Progress</h3>
                    <span>{percentComplete(mediaMetadata)}</span>
                    <span>{timeUntilRelease(mediaMetadata, currentTime)}</span>
                    <span>
                        {timeUntilNextChunk(mediaMetadata, nextFetchTime)}
                    </span>
                </div>
                <div className="actions">
                    {chunkQueue.length > 0 ? (
                        <button
                            value="stopRandom"
                            onClick={() => {
                                player.stop()
                            }}
                        >
                            Stop Playback
                        </button>
                    ) : (
                        <button value="random" onClick={() => playRandom(5)}>
                            Play 5 random chunks
                        </button>
                    )}
                </div>
                <Links
                    links={mediaMetadata.links}
                    releaseEnd={mediaMetadata.releaseEnd}
                />
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
                            value="Override"
                            onClick={() => {
                                fetchMetadata({ progress }).catch(
                                    handleFetchError,
                                )
                            }}
                        >
                            Override
                        </button>
                        <button
                            value="Reset"
                            onClick={() => {
                                fetchMetadata().catch(handleFetchError)
                            }}
                        >
                            Reset
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
                        {/* TODO: Add some customization here; e.g. start date, end date */}
                        <button
                            value="Simulate"
                            onClick={() => {
                                const releaseStart = DateTime.now().toISO()
                                const releaseEnd = DateTime.now()
                                    .plus({
                                        seconds: releaseDurationSeconds,
                                    })
                                    .toISO()
                                fetchMetadata({
                                    releaseStart,
                                    releaseEnd,
                                }).catch(handleFetchError)
                            }}
                        >
                            Simulate
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default App
