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
}

export type PartialMetadata = Omit<CompleteMetadata, 'tracks'> & {
    tracks: Track[]
}

export type GeneratedMetadata = Omit<
    CompleteMetadata,
    'releaseStart' | 'releaseEnd'
>
