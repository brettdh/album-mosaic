import { useState } from 'react'
import type { FunctionTypes } from './track'
import { usePrevious } from '@uidotdev/usehooks'
interface SegmentProps extends FunctionTypes {
    trackNum: number
    segmentNum: number
    imageUrl?: string
    audioUrl?: string
    height: number
    width: number
    isPlaying: boolean
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
                className={`tile filled${isPlaying ? ' playing' : ''}`}
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
