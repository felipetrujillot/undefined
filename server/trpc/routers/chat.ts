import { protectedProcedure } from '../trpc'
import { z } from 'zod'
import { db } from '~~/server/db/db'
import {
  chat,
  chat_sessions,
  InsertChat,
  models,
  system_prompts,
  usuarios,
} from '~~/server/db/db_schema'
import { and, desc, eq } from 'drizzle-orm'
import { systemPromptTxt } from '../../db/llm'
import { v4 as uuid } from 'uuid'
import { RouterOutput } from '.'
import { Part } from '@google/genai'
import { octetInputParser } from '@trpc/server/http'
import { generateContent, generateImage, generateVideos } from '~~/server/db/ai'

export const chatTrpc = {
  /**
   *
   */
  getChatSessions: protectedProcedure.query(async ({ ctx }) => {
    const { id_empresa, id_usuario } = ctx.user!

    return await db
      .select()
      .from(chat_sessions)
      .where(
        and(
          eq(chat_sessions.id_empresa, id_empresa),
          eq(chat_sessions.id_usuario, id_usuario),
          eq(chat_sessions.activo, 1),
        ),
      )
      .orderBy(desc(chat_sessions.id_chat_session))
  }),
  /**
   *
   */
  getChatId: protectedProcedure

    .input(
      z.object({
        requestId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { requestId } = input
      const { id_empresa, id_usuario } = ctx.user!

      const [findChatSession] = await db
        .select()
        .from(chat_sessions)
        .where(
          and(
            eq(chat_sessions.uuid, requestId),
            eq(chat_sessions.id_empresa, id_empresa),
            eq(chat_sessions.id_usuario, id_usuario),
          ),
        )

      /**
       *
       */
      const findChat = await db
        .select()
        .from(chat)
        .where(eq(chat.id_chat_session, findChatSession.id_chat_session))

      return {
        chat_session: findChatSession,
        chat: findChat,
      }
    }),
  /**
   *
   *
   */
  addChatSession: protectedProcedure.mutation(async ({ ctx }) => {
    const { id_empresa, id_usuario } = ctx.user!

    const newUuid = uuid()

    await db.insert(chat_sessions).values({
      uuid: newUuid,
      titulo: '',
      id_empresa,
      id_usuario,
    })

    return { uuid: newUuid }
  }),
  /**
   *
   *
   *
   */
  addPrompt: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        input_chat: z.array(
          z.object({
            chat: z.string(),
            tipo: z.string(),
          }),
        ),
      }),
    )
    .mutation(async function* ({ input, ctx }) {
      const { id: requestId, input_chat } = input
      const { id_empresa, id_usuario } = ctx.user!

      const [myModel] = await db
        .select({
          id_model: usuarios.id_model,
          id_system_prompt: usuarios.id_system_prompt,
          system_prompt: system_prompts.system_prompt,
          llm_model: models.llm_model,
          location: models.location,
        })
        .from(usuarios)
        .innerJoin(models, eq(models.id_model, usuarios.id_model))
        .innerJoin(
          system_prompts,
          eq(system_prompts.id_system_prompt, usuarios.id_system_prompt),
        )
        .where(eq(usuarios.id_usuario, id_usuario))

      const { system_prompt, llm_model, location } = myModel

      const contents: {
        role: string
        parts: Part[]
      }[] = []

      const findChatSession = await db
        .select()
        .from(chat_sessions)
        .where(
          and(
            eq(chat_sessions.uuid, requestId),
            eq(chat_sessions.id_empresa, id_empresa),
            eq(chat_sessions.id_usuario, id_usuario),
          ),
        )

      const findChat = await db
        .select()
        .from(chat)
        .where(eq(chat.id_chat_session, findChatSession[0].id_chat_session))

      const mapChat = findChat.map((c) => {
        return {
          role: c.origen === 'user' ? 'user' : 'assistant',
          parts: [{ text: c.chat }],
        }
      })

      if (mapChat.length > 0) {
        contents.push(...mapChat)
      }

      const chatParts: Part[] = []

      input_chat.forEach((c) => {
        if (c.tipo === 'texto') {
          chatParts.push({ text: c.chat })
        }

        if (c.tipo === 'imagen')
          chatParts.push({
            fileData: {
              fileUri: c.chat,
              mimeType: 'image/jpeg',
            },
          })

        if (c.tipo === 'pdf')
          chatParts.push({
            fileData: {
              fileUri: c.chat,
              mimeType: 'application/pdf',
            },
          })
      })

      contents.push({
        role: 'user',
        parts: chatParts,
      })

      /**
       *
       */
      const saveChat = async (responseLLM: string) => {
        const insertParamsUser: InsertChat[] = []

        input_chat.forEach((c) => {
          if (c.tipo === 'texto') {
            insertParamsUser.push({
              chat: c.chat,
              tipo: 'texto',
              origen: 'user',
              id_chat_session: findChatSession[0].id_chat_session,
            })
          }

          if (c.tipo === 'imagen')
            insertParamsUser.push({
              chat: c.chat,
              tipo: 'imagen',
              origen: 'user',
              id_chat_session: findChatSession[0].id_chat_session,
            })

          if (c.tipo === 'pdf')
            insertParamsUser.push({
              chat: c.chat,
              tipo: 'pdf',
              origen: 'user',
              id_chat_session: findChatSession[0].id_chat_session,
            })
        })

        const insertParams = [
          ...insertParamsUser,
          {
            origen: 'llm',
            chat: responseLLM,
            tipo: 'texto',
            id_chat_session: findChatSession[0].id_chat_session,
          },
        ]
        await db.insert(chat).values(insertParams)

        if (findChatSession[0].titulo.length === 0) {
          const onlyUserContents = contents.find((c) => {
            if (c.role === 'user') return c
          })

          const onlyTextParts = onlyUserContents?.parts.filter((p) => {
            if ('fileData' in p) return
            return p
          })

          const newContent: {
            role: string
            parts: Part[]
          }[] = [
            {
              role: 'user',
              parts: onlyTextParts!,
            },
          ]

          const streamingResult = await generateContent({
            system_prompt: `You are an expert on summarize the user input in maximun 4 words
        IMPORTANT: Give the answer in Spanish.
        IMPORTANT: Only use words and not special characters.
            `,
            llm_model: 'gemini-2.0-flash',
            location,
            contents: newContent,
          })

          let fullResponse = ''
          /* return streamingResult */
          for await (const item of streamingResult) {
            if (item.text) {
              const textChunk = item.text
              fullResponse += textChunk
            }
          }

          /**
           * Caso contrario inserto chat desde cero
           */
          await db
            .update(chat_sessions)
            .set({
              titulo: fullResponse,
            })
            .where(
              eq(
                chat_sessions.id_chat_session,
                findChatSession[0].id_chat_session,
              ),
            )
        }
      }

      /**
       *
       * @param onSuccess
       */
      async function* streamGenerateContent(onSuccess: Function) {
        let fullResponse = ''

        if (llm_model === 'veo-2.0-generate-001') {
          const findPrompt = input_chat.find((r) => {
            if (r.tipo === 'texto') return r
          })

          const findImagen = input_chat.find((r) => {
            if (r.tipo === 'imagen') return r
          })

          const videoRes = await generateVideos({
            location,
            system_prompt: '',
            llm_model: llm_model,
            prompt: findPrompt!.chat,
            imagenUri: findImagen!.chat,
          })

          console.log({ videoRes })

          const llmImageResponse = `
          
          <video controls width="500">
            <source src="${videoRes}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
          `
          //const llmImageResponse = `![Alt Text](${videoRes})`

          fullResponse += llmImageResponse
          yield llmImageResponse
        } else if (llm_model === 'gemini-2.0-flash-exp') {
          const imageRes = await generateImage({
            location,
            system_prompt:
              'You are an expert on generate images, use the provided context ONLY GENERATE IMAGES',
            llm_model: 'gemini-2.0-flash-exp',
            contents: contents,
          })

          const llmImageResponse = `![Alt Text](${imageRes})`

          fullResponse += llmImageResponse
          yield llmImageResponse
        } else {
          const streamingResult = await generateContent({
            location,
            system_prompt: system_prompt,
            llm_model,
            contents: contents,
          }).catch((err) => {
            console.log(err)
            console.log('ERROR ACÁ L 300')
            throw err
          })

          for await (const item of streamingResult) {
            /*   if (item.text) {
              console.log(typeof item.text)
              fullResponse += item.text
              yield item.text
            } */
            try {
              if (item.candidates) {
                const textChunk = item.candidates![0]!.content!.parts![0]!.text

                if (textChunk) {
                  fullResponse += textChunk
                  yield textChunk
                }
              }
            } catch (error) {
              console.error(error)
            }
          }
        }

        await onSuccess(fullResponse)
      }

      yield* streamGenerateContent(saveChat)
    }),

  /**
   *
   */
  deleteChat: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id } = input
      await db
        .update(chat_sessions)
        .set({
          activo: 0,
        })
        .where(eq(chat_sessions.uuid, id))

      return {
        status: 'ok' as const,
        data: 'Se borró el chat',
      }
    }),

  /**
   *
   */
  updateTitle: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        titulo: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, titulo } = input
      await db
        .update(chat_sessions)
        .set({
          titulo: titulo,
        })
        .where(eq(chat_sessions.uuid, id))

      return {
        status: 'ok' as const,
        data: 'Se actualizó el nombre',
      }
    }),
}

export type GetChatSessions = RouterOutput['chat']['getChatSessions']
