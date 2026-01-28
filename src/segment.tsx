import { useCallback, useEffect, useState } from 'react'
import type { FunctionTypes } from './functionTypes'
import { usePrevious } from '@uidotdev/usehooks'
import clsx from 'clsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faPause } from '@fortawesome/free-solid-svg-icons'
import useAudioPlayer from './useAudioPlayer'

interface SegmentProps extends FunctionTypes {
    trackName?: string
    trackNum: number
    segmentNum: number
    imageUrl?: string
    audioUrl?: string
    height: number
    width: number
    start: number
    end: number
}

export default function Segment({
    trackName,
    trackNum,
    segmentNum,
    imageUrl,
    audioUrl,
    height,
    width,
    start,
    end,
    scale,
}: SegmentProps) {
    const { player, audioUrlPlaying } = useAudioPlayer()
    const isPlaying = audioUrl && audioUrl === audioUrlPlaying

    const prevAudioUrl = usePrevious(audioUrl)
    const isNew = useCallback(
        () => prevAudioUrl === undefined && audioUrl !== undefined,
        [prevAudioUrl, audioUrl],
    )
    const [showHighlight, setShowHighlight] = useState(false)
    const [showedHighlight, setShowedHighlight] = useState(false)

    useEffect(() => {
        if (!audioUrl) {
            setShowHighlight(false)
            setShowedHighlight(false)
        }

        if (isNew() && !showedHighlight) {
            setTimeout(() => setShowHighlight(true), 100)
            setTimeout(() => {
                setShowHighlight(false)
                setShowedHighlight(true)
            }, 1000)
        }
    }, [
        isNew,
        prevAudioUrl,
        audioUrl,
        trackNum,
        segmentNum,
        showedHighlight,
        setShowedHighlight,
    ])

    function playAudio() {
        if (audioUrl && imageUrl) {
            const chunk = {
                audioUrl,
                imageUrl,
                width,
                start,
                end,
                trackName,
                trackNum,
                segmentNum,
            }
            void player.enqueue([chunk])
        }
    }

    return imageUrl && audioUrl ? (
        <a
            href="#!"
            onClick={() => {
                if (isPlaying) {
                    player.stop()
                } else {
                    playAudio()
                }
            }}
        >
            <div
                className={clsx(
                    'group/tile relative p-0 m-0 transition-transform duration-300 ease-in-out',
                    'hover:transform hover:scale-125 hover:z-10',
                    'after:absolute after:z-5 after:top-0 after:left-0 after:w-full after:h-full after:opacity-0',
                    'after:shadow-segment after:transform after:scale-125 hover:after:opacity-100',
                    {
                        'transform scale-125 z-10 after:opacity-100': isPlaying,
                    },
                    {
                        'transform scale-150 z-10 after:opacity-100 transition-opacity duration-800 ease-in-out':
                            showHighlight,
                    },
                )}
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
                <FontAwesomeIcon
                    className={clsx(
                        'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/tile:opacity-100 transition-opacity duration-300 ease-in-out',
                        { 'opacity-100': isPlaying },
                    )}
                    icon={isPlaying ? faPause : faPlay}
                />
            </div>
        </a>
    ) : (
        <div
            className="p-0 m-0"
            style={{
                width: scale(width),
                height: scale(height),
            }}
        />
    )
}
