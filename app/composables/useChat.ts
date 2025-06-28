export type ChatAI = {
  origen: 'llm' | 'user'
  tipo: 'imagen' | 'texto' | 'pdf'
  chat: string
}

export type TypeStatus = 'idle' | 'pending' | 'success' | 'error'
export const useChat = () => useState<ChatAI[]>('useChat', () => [])
export const useIdChat = () => useState<string>('useIdChat', () => '')

const ac = new AbortController()

/**
 *
 * @returns
 */
export const useGeneratingChat = () => {
  const { $trpc_stream } = useNuxtApp()
  const useChatId = useIdChat()

  const chatLLM = ref('')
  const status = ref<TypeStatus>('idle')

  /**
   *
   * @param inputChat
   */
  const addPrompt = async (inputChat: ChatAI[], onSuccess: Function) => {
    status.value = 'pending'
    const mapInput = inputChat.map((c) => {
      return {
        chat: c.chat,
        tipo: c.tipo,
      }
    })

    let countError = 0
    status.value = 'pending'

    const abortSignal = () => {}
    try {
      const res = await $trpc_stream.chat.addPrompt.mutate(
        {
          id: useChatId.value,
          input_chat: mapInput,
        },
        { signal: ac.signal },
      )

      const randomDelay = () =>
        new Promise((resolve) => setTimeout(resolve, Math.random() * 30 + 10))

      for await (const item of res) {
        chatLLM.value += item

        await randomDelay()
      }

      status.value = 'success'
      onSuccess(chatLLM.value)
      countError++
      chatLLM.value = ''
    } catch (error) {
      console.error(error)
      console.log({ countError })
      //status.value = 'error'
      if (countError === 0) {
        console.log('here')
        onSuccess(chatLLM.value)
      }
      chatLLM.value = ''
      status.value = 'success'

      throw new Error('ERROR: Generando la respuesta')
    }
  }

  return { chatLLM, addPrompt, status }
}

/**
 * Genera la nueva sesión de un chat
 * Lo guarda en el storage
 */
export const newChatSession = async () => {
  const useChatId = useIdChat()

  const { $trpc } = useNuxtApp()
  const { uuid } = await $trpc.chat.addChatSession.mutate()

  useChatId.value = uuid
}
/**
 *
 * @param id
 * @returns
 */
export const selectChatById = async (id: string) => {
  const chatAI = useChat()
  const useChatId = useIdChat()
  useChatId.value = id

  const { $trpc } = useNuxtApp()

  const res = await $trpc.chat.getChatId.query({
    requestId: id,
  })

  if (res.chat_session) {
    documentTitle(res.chat_session.titulo)
  }

  const mapRes = res.chat.map((r) => {
    return {
      origen: r.origen as 'user' | 'llm',
      chat: r.chat,
      tipo: r.tipo as 'texto' | 'imagen' | 'pdf',
    }
  })

  chatAI.value = mapRes

  return true
}

export const DEFAULT_CHAT: ChatAI[] = [
  {
    origen: 'user' as const,
    chat: 'hi',
    tipo: 'texto' as const,
  },
  {
    origen: 'llm' as const,
    chat: `
## undefined


- Para generar imágenes debes cambiar a un modelo que soporte imágenes presionando el botón ... en la parte de abajo
- System prompt sirve para usar agentes específicos.
- Puedes adjuntar .pdfs o imágenes para usar en el contexto presionando el ícono de abajo.
`,
    tipo: 'texto' as const,
  },
]
/**
 *
 */
export const clearChat = () => {
  const chat = useChat()
  chat.value = []
}

/**
 *
 */
export const addItemsChat = (newChat: ChatAI[]) => {
  const chat = useChat()

  chat.value.push(...newChat)
}
