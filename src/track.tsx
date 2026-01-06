import type { Segment as SegmentType } from '../lib/data'
import Segment from './segment'

export interface FunctionTypes {
    scale: (value: number) => number
    play: (
        audioUrl: string,
        onPlaybackEnded: (this: HTMLAudioElement, ev: Event) => unknown,
    ) => Promise<void>
}

interface TrackProps extends FunctionTypes {
    trackNum: number
    segments: SegmentType[]
    height: number
    audioUrlPlaying: string | null
}

export default function Track({
    trackNum,
    segments,
    height,
    scale,
    play,
    audioUrlPlaying,
}: TrackProps) {
    return (
        <div className="track">
            {segments.map(({ imageUrl, audioUrl, width }, segmentNum) => (
                <Segment
                    key={`segment-${trackNum}-${segmentNum}`}
                    imageUrl={imageUrl}
                    audioUrl={audioUrl}
                    height={height}
                    width={width}
                    trackNum={trackNum}
                    segmentNum={segmentNum}
                    scale={scale}
                    play={play}
                    audioUrlPlaying={audioUrlPlaying}
                />
            ))}
        </div>
    )
}
