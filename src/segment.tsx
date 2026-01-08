import { useCallback, useEffect, useState } from 'react'
import type { FunctionTypes } from './functionTypes'
import { usePrevious } from '@uidotdev/usehooks'
import clsx from 'clsx'
interface SegmentProps extends FunctionTypes {
    trackNum: number
    segmentNum: number
    imageUrl?: string
    audioUrl?: string
    height: number
    width: number
    audioUrlPlaying: string | null
}

export default function Segment({
    trackNum,
    segmentNum,
    imageUrl,
    audioUrl,
    height,
    width,
    scale,
    play,
    audioUrlPlaying,
}: SegmentProps) {
    const [isPlayingLocal, setIsPlayingLocal] = useState(false)
    const isPlaying =
        isPlayingLocal || (audioUrl && audioUrl === audioUrlPlaying)

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
        if (audioUrl) {
            setIsPlayingLocal(true)
            void play(audioUrl, () => {
                setIsPlayingLocal(false)
            })
        }
    }

    return imageUrl && audioUrl ? (
        <a href="#!" onClick={() => playAudio()}>
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
