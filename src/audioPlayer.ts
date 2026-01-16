import toast from 'react-hot-toast'
import type { CompleteSegment } from '../lib/data'

type UrlChangeCallback = (url: string | null) => void
type QueueChangeCallback = (queue: CompleteSegment[]) => void

export default class AudioPlayer {
    private audio: HTMLAudioElement
    private queue: CompleteSegment[]
    private onUrlChange: UrlChangeCallback
    private onQueueChange: QueueChangeCallback

    constructor() {
        this.audio = new Audio()
        for (const event of ['ended']) {
            this.audio.addEventListener(event, (e: Event) => {
                this.popQueue()
            })
        }

        this.queue = []
        this.onUrlChange = () => {}
        this.onQueueChange = () => {}
    }

    watchUrl(callback: UrlChangeCallback) {
        this.onUrlChange = callback
    }

    watchQueue(callback: QueueChangeCallback) {
        this.onQueueChange = callback
    }

    private popQueue() {
        if (this.queue.length > 0) {
            this.queue.shift()
            this.onQueueChange(this.queue)

            if (this.queue.length > 0) {
                void this.play(this.queue[0].audioUrl)
            } else {
                this.onUrlChange(null)
            }
        }
    }

    private async play(audioUrl: string) {
        try {
            this.audio.pause()

            this.audio.src = audioUrl
            this.onUrlChange(audioUrl)

            await this.audio.play()
        } catch (e) {
            console.error('Error playing audio:', e)
            toast.error('Error playing audio; please reload the page')
        }
    }

    enqueue(chunks: CompleteSegment[]) {
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
    }
}
