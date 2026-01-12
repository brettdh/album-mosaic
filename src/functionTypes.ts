export type PlaybackEndedCallback = (
    this: HTMLAudioElement,
    ev: Event,
) => unknown

export interface FunctionTypes {
    scale: (value: number) => number
    play: (audioUrl: string) => Promise<void>
}
