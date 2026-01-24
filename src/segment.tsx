import './segment.css'

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
                    'tile filled',
                    { playing: isPlaying },
                    { new: showHighlight },
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
                    className={clsx('playback-icon', { playing: isPlaying })}
                    icon={isPlaying ? faPause : faPlay}
                />
            </div>
        </a>
    ) : (
        <div
            className="tile empty"
            style={{
                width: scale(width),
                height: scale(height),
            }}
        />
    )
}
