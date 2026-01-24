import toast from 'react-hot-toast'
import WaveformData from 'waveform-data'
import { promisify } from 'es6-promisify'

import type { NumberedCompleteSegment } from '../lib/data'

type UrlChangeCallback = (url: string | null) => void
type QueueChangeCallback = (queue: NumberedCompleteSegment[]) => void
type WaveformChangeCallback = (waveform: WaveformData | null) => void
type ElapsedTimeChangeCallback = (currentTime: number) => void

const createWaveformFromAudio = promisify(WaveformData.createFromAudio)

export default class AudioPlayer {
    private audio: HTMLAudioElement
    private queue: NumberedCompleteSegment[]
    private onUrlChange: UrlChangeCallback
    private onQueueChange: QueueChangeCallback
    private onWaveformChange: WaveformChangeCallback
    private onElapsedTimeChange: ElapsedTimeChangeCallback

    constructor() {
        this.audio = new Audio()

        for (const event of ['ended']) {
            this.audio.addEventListener(event, () => {
                this.popQueue()
            })
        }

        this.queue = []
        this.onUrlChange = () => {}
        this.onQueueChange = () => {}
        this.onWaveformChange = () => {}
        this.onElapsedTimeChange = () => {}
    }

    watchUrl(callback: UrlChangeCallback) {
        this.onUrlChange = callback
    }

    watchQueue(callback: QueueChangeCallback) {
        this.onQueueChange = callback
    }

    watchWaveform(callback: WaveformChangeCallback) {
        this.onWaveformChange = callback
    }

    watchElapsedTime(callback: ElapsedTimeChangeCallback) {
        this.onElapsedTimeChange = callback
    }

    private popQueue() {
        if (this.queue.length > 0) {
            this.queue.shift()
            this.onQueueChange(this.queue)

            if (this.queue.length > 0) {
                void this.play(this.queue[0].audioUrl)
            } else {
                this.onUrlChange(null)
                this.onWaveformChange(null)
            }
        }
    }

    private updateElapsedTime() {
        this.onElapsedTimeChange(this.audio.currentTime)
        if (!this.audio.paused && !this.audio.ended) {
            requestAnimationFrame(() => this.updateElapsedTime())
        }
    }

    private async play(audioUrl: string) {
        try {
            this.audio.pause()

            this.audio.src = audioUrl
            this.onUrlChange(audioUrl)

            const context = new AudioContext()
            const data = await fetch(audioUrl)
            const buffer = await data.arrayBuffer()
            const waveform = await createWaveformFromAudio({
                audio_context: context,
                array_buffer: buffer,
            })
            this.onWaveformChange(waveform)

            await this.audio.play()

            requestAnimationFrame(() => this.updateElapsedTime())
        } catch (e) {
            console.error('Error playing audio:', e)
            toast.error('Error playing audio; please reload the page')
        }
    }

    enqueue(chunks: NumberedCompleteSegment[]) {
        if (this.queue.length > 0) {
            this.audio.pause()
        }
        this.queue = chunks
        this.onQueueChange(this.queue)

        void this.play(this.queue[0].audioUrl)
    }

    stop() {
        this.queue = []
        this.onQueueChange(this.queue)

        this.audio.pause()
        this.onUrlChange(null)

        this.onWaveformChange(null)
        this.onElapsedTimeChange(0)
    }
}
