// run split first so tha this exists
import metadata from "../out/metadata.json" with { type: 'json' }
import { getDuration } from './audio.ts'


console.log('Printing all last-two-chunks where the last is sub-second')
for (const track of metadata.tracks) {
    const durations = await Promise.all(track.audio.slice(-2).map(getDuration))
    if (durations[1].startsWith('00:00:00')) {
        console.log(durations.join(' '))
    }
}
