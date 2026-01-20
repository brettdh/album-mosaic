import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'

import './index.css'
import App from './App.tsx'
import AudioPlayerContext from './AudioPlayerContext.ts'
import AudioPlayer from './audioPlayer'
import type { CompleteSegment } from '../lib/data.ts'
import { ThemeProvider } from '@/components/theme-provider'

const player = new AudioPlayer()

const Main = () => {
    const [audioUrlPlaying, setAudioUrlPlaying] = useState<string | null>(null)
    const [chunkQueue, setChunkQueue] = useState<CompleteSegment[]>([])

    useEffect(() => {
        player.watchUrl((audioUrl) => {
            setAudioUrlPlaying(audioUrl)
        })

        // clone the queue so that it's a new object and components re-render
        player.watchQueue((queue) => {
            setChunkQueue(queue.slice())
        })
    }, [])

    return (
        <StrictMode>
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                <AudioPlayerContext
                    value={{ player, audioUrlPlaying, chunkQueue }}
                >
                    <Toaster position="top-right" />
                    <App />
                </AudioPlayerContext>
            </ThemeProvider>
        </StrictMode>
    )
}

createRoot(document.getElementById('root')!).render(<Main />)
