import { DateTime, Duration } from 'luxon'

export interface Segment {
    audioUrl?: string
    imageUrl?: string
    width: number

    // position in the track as seconds
    start: number
    end: number
}

export interface Track {
    segments: Segment[]
    height: number
    name?: string
}

export type CompleteSegment = Omit<Segment, 'audioUrl' | 'imageUrl'> & {
    audioUrl: string
    imageUrl: string
}

export type CompleteTrack = Omit<Track, 'segments'> & {
    segments: CompleteSegment[]
}

export interface Link {
    url: string

    // if present, don't show the link until after this date
    // if absent, use the release end date instead
    date?: string
}

export interface CompleteMetadata extends ManualMetadata {
    tracks: CompleteTrack[]

    // saved here to avoid calculating repeatedly
    segmentCount: number

    // image size in pixels
    totalWidth: number
    totalHeight: number
}

export type PartialMetadata = Omit<CompleteMetadata, 'tracks'> & {
    tracks: Track[]
}

export interface ManualMetadata {
    // release duration; determines the rate at which new segments are released
    releaseStart: string // ISO 8601
    releaseEnd: string // ISO 8601

    // links shown once release is complete
    links: Record<string, Link>
}

export type GeneratedMetadata = Omit<CompleteMetadata, keyof ManualMetadata>

export interface NumberedSegment extends Segment {
    trackName?: string
    trackNum: number
    segmentNum: number
}

export interface NumberedCompleteSegment extends CompleteSegment {
    trackName?: string
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
    const segments: NumberedSegment[] = mediaMetadata.tracks.flatMap(
        (track, trackNum) =>
            track.segments.map((segment, segmentNum) => ({
                ...segment,
                trackName: track.name,
                trackNum,
                segmentNum,
            })),
    )
    return segments.filter(isComplete)
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
