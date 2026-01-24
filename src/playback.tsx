import type WaveformData from 'waveform-data'

import { AudioScrubber } from '@/components/ui/waveform'
import type { NumberedCompleteSegment } from 'lib/data'
import { Card } from './components/ui/card'

function displayTime(secondsDecimal: number): string {
    const seconds = Math.floor(secondsDecimal)
    const fields = [seconds]
    let minutes: number
    if (seconds >= 60) {
        minutes = Math.floor(seconds / 60)
        fields[0] = seconds % 60
    } else {
        minutes = 0
    }
    fields.unshift(minutes)
    return fields.map((n) => String(n).padStart(2, '0')).join(':')
}

interface PlaybackProps {
    waveform: WaveformData | null
    elapsedTime: number
    segment?: NumberedCompleteSegment
}
export const Playback = ({ waveform, elapsedTime, segment }: PlaybackProps) => {
    const channel = waveform?.channel(0)
    let data: number[] = [0]
    if (waveform && channel) {
        data = channel.max_array().map((x) => x / 128)
    }
    let trackDisplay = 'Nothing playing'
    let start = '--:--'
    let end = '--:--'
    if (segment) {
        const { trackNum, trackName } = segment
        trackDisplay = trackName
            ? `${trackNum + 1} - ${trackName}`
            : `Track ${trackNum}`
        start = displayTime(segment.start)
        end = displayTime(segment.end)
    }
    return (
        <Card className="flex flex-col p-2 gap-0">
            <div className="flex flex-row justify-between"></div>
            <span className="text-xs">{trackDisplay}</span>
            <AudioScrubber
                data={data}
                showHandle={false}
                showProgress={!!waveform}
                height={48}
                currentTime={elapsedTime}
                duration={waveform?.duration}
            />
            <div className="flex flex-row justify-between text-xs">
                <span>{start}</span>
                <span>{end}</span>
            </div>
        </Card>
    )
}
