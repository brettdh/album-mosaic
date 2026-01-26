import type { Segment as SegmentType } from '../lib/data'
import type { FunctionTypes } from './functionTypes'
import Segment from './segment'

interface TrackProps extends FunctionTypes {
    trackNum: number
    trackName?: string
    segments: SegmentType[]
    height: number
}

export default function Track({
    trackNum,
    trackName,
    segments,
    height,
    scale,
}: TrackProps) {
    return (
        <div className="flex">
            {segments.map(
                ({ imageUrl, audioUrl, width, start, end }, segmentNum) => (
                    <Segment
                        key={`segment-${trackNum}-${segmentNum}`}
                        imageUrl={imageUrl}
                        audioUrl={audioUrl}
                        height={height}
                        width={width}
                        start={start}
                        end={end}
                        trackName={trackName}
                        trackNum={trackNum}
                        segmentNum={segmentNum}
                        scale={scale}
                    />
                ),
            )}
        </div>
    )
}
