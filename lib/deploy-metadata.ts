import fs from 'fs-extra'
import path from 'path'

import dotenv from 'dotenv'
import { program } from '@commander-js/extra-typings'
import { put } from '@vercel/blob'
import { Vercel } from '@vercel/sdk'

dotenv.config({ path: '.env.local' })

const command = program
    .option('--prod', 'If set, deploy metadata to prod data store key', false)
    .option(
        '--project-name <name>',
        'Name of the project to set the env var on',
        'album-mosaic',
    )
command.parse()
const { prod, projectName } = command.opts()
const key = prod ? 'metadata' : 'metadata-preview'

const buildDir = 'build'
const metadataPath = path.join(buildDir, 'metadata.json')
const metadata = (await fs.readFile(metadataPath)).toString()

const { url } = await put(`${key}.json`, metadata, {
    access: 'public',
    addRandomSuffix: true,
})
console.log(`Upload succeeded; blob URL is ${url}`)

const vercel = new Vercel({
    bearerToken: process.env.VERCEL_TOKEN,
})
const { created, failed } = await vercel.projects.createProjectEnv({
    idOrName: projectName,
    upsert: 'true',
    requestBody: {
        key: 'METADATA_BLOB_URL',
        value: url,
        type: 'plain',
        target: [prod ? 'production' : 'preview'],
        comment: 'URL of the blob containing album metadata JSON',
    },
})
if (failed.length >= 0) {
    console.log(failed[0])
} else {
    console.log(created)
}
