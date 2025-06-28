import { generateVideos } from '../db/ai'

export default defineEventHandler(async (event) => {
  const res = await generateVideos({
    imagenUri:
      'https://storage.googleapis.com/linebox-bucket/818546635018f03953ef-8288-4db6-a5d0-a36eab998a2b.jpeg',
    prompt: 'hazlo sonreír',
    location: 'us-central1',
    llm_model: 'veo-2.0-generate-001',
    system_prompt: '',
  })

  return res
})
