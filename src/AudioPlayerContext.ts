import { createContext } from 'react'

import AudioPlayer from './audioPlayer'
import type { CompleteSegment } from '../lib/data'

export interface AudioPlayerContextObject {
    player: AudioPlayer
    audioUrlPlaying: string | null
    chunkQueue: CompleteSegment[]
}

export default createContext<AudioPlayerContextObject>({
    player: new AudioPlayer(),
    audioUrlPlaying: null,
    chunkQueue: [],
})
