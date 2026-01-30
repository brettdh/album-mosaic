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
import toast from 'react-hot-toast'
import random from 'random'
import Track from './track'
import useAudioPlayer from './useAudioPlayer'
import Links from './Links'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Playback } from './playback'
import { Badge } from './components/ui/badge'
import { Spinner } from './components/ui/spinner'

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

    const { player, chunkQueue, waveform, elapsedTime } = useAudioPlayer()

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
        return (
            <div className="absolute flex w-full h-full justify-center items-center">
                <Badge>
                    <Spinner data-icon="inline-start" />
                    Loading
                </Badge>
            </div>
        )
    }
    const isPreRelease =
        DateTime.fromISO(mediaMetadata.releaseStart) > DateTime.now()
    return (
        <div className="w-full h-full flex flex-col lg:flex-row lg:gap-x-12">
            <div
                className="flex flex-col relative"
                style={{ height: scale(mediaMetadata.totalHeight) }}
            >
                {mediaMetadata.tracks.map(
                    ({ segments, height, name }, trackNum) => (
                        <Track
                            key={`track-${trackNum}`}
                            trackName={name}
                            trackNum={trackNum}
                            segments={segments}
                            height={height}
                            scale={scale}
                        />
                    ),
                )}
                {isPreRelease ? (
                    <Card className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <CardHeader>
                            <CardTitle>{mediaMetadata.artist}</CardTitle>
                            <CardTitle>{mediaMetadata.album}</CardTitle>
                        </CardHeader>
                        <CardFooter>
                            {`Release begins ${DateTime.fromISO(mediaMetadata.releaseStart).toLocaleString(DateTime.DATETIME_FULL)}`}
                        </CardFooter>
                    </Card>
                ) : null}
            </div>
            <div className="flex flex-col gap-2.5 p-2.5 items-center lg:items-start">
                <div className="flex flex-row w-full justify-end">
                    <a
                        target="_blank"
                        href="https://github.com/brettdh/album-mosaic"
                    >
                        <img className="size-8" src="/github.png" />
                    </a>
                </div>
                <div className="flex flex-col items-center lg:items-start">
                    <h3>Release Progress</h3>
                    <span>{percentComplete(mediaMetadata)}</span>
                    <span>{timeUntilRelease(mediaMetadata, currentTime)}</span>
                    <span>
                        {timeUntilNextChunk(mediaMetadata, nextFetchTime)}
                    </span>
                </div>
                <div className="flex flex-col items-start">
                    {chunkQueue.length > 0 ? (
                        <Button
                            variant="outline"
                            value="stopRandom"
                            onClick={() => {
                                player.stop()
                            }}
                        >
                            Stop Playback
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            value="random"
                            onClick={() => playRandom(5)}
                            disabled={isPreRelease}
                        >
                            Play 5 random chunks
                        </Button>
                    )}
                </div>
                <Playback
                    waveform={waveform}
                    elapsedTime={elapsedTime}
                    segment={chunkQueue?.[0]}
                />
                <Links
                    links={mediaMetadata.links}
                    releaseEnd={mediaMetadata.releaseEnd}
                />
                {import.meta.env.DEV && (
                    <div className="flex flex-col mt-auto">
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
                        <Button
                            variant="outline"
                            value="Override"
                            onClick={() => {
                                const durationDays = 7
                                const releaseStart = DateTime.now()
                                    .minus({
                                        days: (durationDays * progress) / 100,
                                    })
                                    .toISO()
                                const releaseEnd = DateTime.now()
                                    .plus({
                                        days:
                                            durationDays * (1 - progress / 100),
                                    })
                                    .toISO()
                                fetchMetadata({
                                    progress,
                                    releaseStart,
                                    releaseEnd,
                                }).catch(handleFetchError)
                            }}
                        >
                            Override
                        </Button>
                        <Button
                            variant="outline"
                            value="Reset"
                            onClick={() => {
                                fetchMetadata().catch(handleFetchError)
                            }}
                        >
                            Reset
                        </Button>
                        <div className="flex flex-col">
                            <label htmlFor="release-duration">
                                Simulated release duration
                            </label>
                            <Input
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
                        <Button
                            variant="outline"
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
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default App
