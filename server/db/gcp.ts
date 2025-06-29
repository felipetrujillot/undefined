import { Storage } from '@google-cloud/storage'

/**
 * En esta ruta debes subir tu archivo json
 */
const gcpStorage = new Storage({
  projectId: 'utopian-hearth-464405-s1',
  keyFilename: 'server/db/utopian-hearth-464405-s1-31f6728794b5.json',
})

export const gcpBucket = gcpStorage.bucket('undefined-cdn')
