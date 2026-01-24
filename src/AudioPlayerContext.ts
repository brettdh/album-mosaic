import { createContext } from 'react'

import AudioPlayer from './audioPlayer'
import type { NumberedCompleteSegment } from '../lib/data'
import type WaveformData from 'waveform-data'

export interface AudioPlayerContextObject {
    player: AudioPlayer
    audioUrlPlaying: string | null
    chunkQueue: NumberedCompleteSegment[]
    waveform: WaveformData | null
    elapsedTime: number
}

export default createContext<AudioPlayerContextObject>({
    player: new AudioPlayer(),
    audioUrlPlaying: null,
    chunkQueue: [],
    waveform: null,
    elapsedTime: 0,
})
