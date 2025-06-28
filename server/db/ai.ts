import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai'
import type { Part } from '@google/genai'
import { gcpBucket } from './gcp'
import { newUuid } from '~/composables/helper'

// Initialize Vertex with your Cloud project and location
const startAi = (location: string) => {
  return new GoogleGenAI({
    vertexai: true,
    project: 'linebox-412716',
    location: location,
    googleAuthOptions: {
      keyFilename: 'server/db/linebox-412716-99194e13da0c.json',
    },
  })
}

/**
 *
 * @param param0
 * @returns
 */
export async function generateContent({
  system_prompt,
  llm_model,
  location,
  contents,
}: {
  system_prompt: string
  llm_model: string
  location: string
  contents: {
    role: string
    parts: Part[]
  }[]
}) {
  console.log({ llm_model, location, contents })
  const ai = startAi(location)

  const streamingResp = await ai.models.generateContentStream({
    model: llm_model,
    contents: contents,
    config: {
      httpOptions: {
        headers: {
          Connection: 'keep-alive',
          'content-type': 'multipart/form-data',
        },
      },
      maxOutputTokens: 8192,
      temperature: 1,
      topP: 0.95,
      seed: 0,
      responseModalities: ['TEXT'],

      systemInstruction: {
        role: 'system',
        parts: [
          {
            text: `
                ${system_prompt}`,
          },
        ],
      },

      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    },
  })

  return streamingResp
}

export async function generateVideos({
  system_prompt,
  prompt,
  location,
  llm_model,
  imagenUri,
}: {
  location: string
  prompt: string
  system_prompt: string
  llm_model: string
  imagenUri: string
  /*  contents: {
    role: string
    parts: Part[]
  }[] */
}) {
  const ai = startAi(location)

  if (llm_model !== 'veo-2.0-generate-001') throw new Error('No válido')

  async function imageUrlToBytes(url: string): Promise<Uint8Array> {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(
        `Failed to fetch image: ${response.status} ${response.statusText}`,
      )
    }

    const arrayBuffer = await response.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  }

  let operation = await ai.models.generateVideos({
    model: llm_model,
    prompt: prompt,
    image: {
      gcsUri:
        'gs://linebox-bucket/818546635018f03953ef-8288-4db6-a5d0-a36eab998a2b.jpeg',
      mimeType: 'image/jpeg',
    },
    config: {
      numberOfVideos: 1,
      aspectRatio: '9:16',
    },

    // contents: contents,
  })

  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10000))
    operation = await ai.operations.getVideosOperation({ operation: operation })
  }

  const bytesVideo = operation!.response!.generatedVideos![0]!.video!.videoBytes

  const bufferFile = Buffer.from(bytesVideo, 'base64')

  const id = newUuid()

  const filename = `${id}.mp4`

  await gcpBucket
    .file(filename)
    .save(bufferFile, {
      contentType: 'video/mp4',
    })
    .catch((err) => {
      throw new Error('Hubo un problema al intentar subir el documento')
    })

  const rr = `https://storage.googleapis.com/linebox-bucket/${filename}`

  return rr
}
/**
 *
 * @param param0
 * @returns
 */
export async function generateImage({
  system_prompt,
  llm_model,
  location,
  contents,
}: {
  system_prompt: string
  llm_model: string
  location: string
  contents: {
    role: string
    parts: Part[]
  }[]
}) {
  const ai = startAi(location)

  const streamingResp = await ai.models.generateContent({
    model: llm_model,
    contents: contents,
    config: {
      maxOutputTokens: 8192,
      temperature: 1,
      topP: 0.95,
      seed: 0,
      responseModalities: ['IMAGE', 'TEXT'],

      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    },
  })

  const image = streamingResp.candidates![0]!.content!.parts!.find(
    (p) => p.inlineData,
  )!.inlineData!.data!

  const bufferFile = Buffer.from(image, 'base64')

  const id = newUuid()

  const filename = `${id}.png`

  await gcpBucket
    .file(filename)
    .save(bufferFile, {
      contentType: 'image/png',
    })
    .catch((err) => {
      throw new Error('Hubo un problema al intentar subir el documento')
    })

  const rr = `https://storage.googleapis.com/linebox-bucket/${filename}`

  return rr
}
