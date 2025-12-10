import { readFile } from 'node:fs/promises'
import { getDeployStore } from '@netlify/blobs'

export const onPostBuild = async () => {
    // Reading a file from disk at build time.
    const data = await readFile('build/metadata.json')
    const json = JSON.parse(data.toString())
    const deployID = process.env.DEPLOY_ID
    console.log(`Deploy ID: ${deployID}`)

    // XXX: this still doesn't work. Netlify blob storage has been a nightmare.
    // TODO: Try vercel instead.
    const uploads = getDeployStore({ name: 'main', deployID })
    await uploads.setJSON('metadata', json)
}
