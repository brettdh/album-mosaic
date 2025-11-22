import { exec as execOrig } from 'child_process'
import util from 'util'

// run split first so tha this exists
import metadata from "../out/metadata.json" with { type: 'json' }

const exec = util.promisify(execOrig)

async function getDuration(audioFilename: string): Promise<string> {
    const { stdout } = await exec(`ffprobe ${audioFilename} 2>&1 | awk '/Duration:/ {print $2}'`)
    return stdout.trim()
}

console.log('Printing all last-two-chunks where the last is sub-second')
for (const track of metadata.tracks) {
    const durations = await Promise.all(track.audio.slice(-2).map(getDuration))
    if (durations[1].startsWith('00:00:00')) {
        console.log(durations.join(' '))
    }
}
