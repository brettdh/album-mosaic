export interface Segment {
    audioUrl?: string
    imageUrl?: string
    width: number
}

export interface Track {
    segments: Segment[]
    height: number
}

export interface PartialMetadata {
    tracks: Track[]
    totalWidth: number
    totalHeight: number
}
