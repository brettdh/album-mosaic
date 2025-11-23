import { exec as execOrig } from "child_process"
import util from "util"

const exec = util.promisify(execOrig)

export async function getDuration(audioFilename: string): Promise<string> {
    const { stdout } = await exec(
        `ffprobe "${audioFilename}" 2>&1 | awk '/Duration:/ {print $2}' | tr -d ,`
    )
    return stdout.trim()
}

export function durationToSeconds(duration: string): number {
    const [hoursStr, minutesStr, secondsStr] = duration.split(":")
    const seconds =
        parseInt(hoursStr, 10) * 3600 + parseInt(minutesStr, 10) * 60 + parseFloat(secondsStr)
    return seconds
}
