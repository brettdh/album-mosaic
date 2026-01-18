import { DateTime, Duration } from 'luxon'

export interface Segment {
    audioUrl?: string
    imageUrl?: string
    width: number
}

export interface Track {
    segments: Segment[]
    height: number
}

export interface CompleteSegment {
    audioUrl: string
    imageUrl: string
    width: number
}

export interface CompleteTrack {
    segments: CompleteSegment[]
    height: number
}

export interface Link {
    url: string

    // if present, don't show the link until after this date
    // if absent, use the release end date instead
    date?: string
}

export interface CompleteMetadata {
    tracks: CompleteTrack[]

    // saved here to avoid calculating repeatedly
    segmentCount: number

    // image size in pixels
    totalWidth: number
    totalHeight: number

    // release duration; determines the rate at which new segments are released
    releaseStart: string // ISO 8601
    releaseEnd: string // ISO 8601

    // links shown once release is complete
    links: Record<string, Link>
}

export type PartialMetadata = Omit<CompleteMetadata, 'tracks'> & {
    tracks: Track[]
}

export type GeneratedMetadata = Omit<
    CompleteMetadata,
    'releaseStart' | 'releaseEnd'
>

export interface NumberedSegment extends Segment {
    trackNum: number
    segmentNum: number
}

export interface NumberedCompleteSegment extends CompleteSegment {
    trackNum: number
    segmentNum: number
}

export function isComplete(
    segment: NumberedSegment,
): segment is NumberedCompleteSegment {
    return !!segment.audioUrl && !!segment.imageUrl
}

export function getAvailableSegments(
    mediaMetadata: PartialMetadata | null,
): NumberedCompleteSegment[] {
    if (!mediaMetadata) {
        return []
    }
    return mediaMetadata.tracks.flatMap((track, trackNum) =>
        track.segments
            .map((segment, segmentNum) => ({
                ...segment,
                trackNum,
                segmentNum,
            }))
            .filter(isComplete),
    )
}

export function percentComplete(mediaMetadata: PartialMetadata | null): string {
    if (!mediaMetadata) {
        return ''
    }
    const totalChunks = mediaMetadata.segmentCount
    const availableChunks = getAvailableSegments(mediaMetadata).length
    const perc = (availableChunks / totalChunks) * 100
    return `${perc.toFixed(2)}% complete`
}

export function timeUntilRelease(
    mediaMetadata: PartialMetadata | null,
    currentTime: DateTime,
): string {
    if (!mediaMetadata) {
        return ''
    }
    const end = DateTime.fromISO(mediaMetadata.releaseEnd)
    if (currentTime >= end) {
        return `Completed ${end.toRelative()}`
    }
    return `Complete ${end.toRelative({ rounding: 'ceil' })}`
}

export function timeUntilNextChunk(
    mediaMetadata: PartialMetadata | null,
    nextFetchTime: DateTime | null,
): string {
    if (!mediaMetadata || !nextFetchTime) {
        return ''
    }
    const end = DateTime.fromISO(mediaMetadata.releaseEnd)
    if (nextFetchTime >= end) {
        return ''
    }
    const duration = nextFetchTime.diffNow()
    if (duration < Duration.fromMillis(0)) {
        return ''
    }

    let countdown: string
    if (duration > Duration.fromObject({ hours: 1 })) {
        countdown = duration.toFormat('hh:mm:ss')
    } else {
        countdown = duration.toFormat('mm:ss')
    }
    return `Next chunk in ${countdown}`
}
