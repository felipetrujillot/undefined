<script setup lang="ts">
import {
  LucideArrowUp,
  LucideChevronDown,
  LucideEllipsis,
  LucideFileText,
  LucidePaperclip,
  LucideX,
} from 'lucide-vue-next'
import { FocusScope } from 'reka-ui'
import ModalConfigs from './ModalConfigs.vue'

const url_imagen = ref('')
const url_pdf = ref('')
const inputChat = defineModel<string>()
const showPopover = ref(false)
const showModalConfig = ref(false)

defineProps<{
  isAtBottom: boolean
}>()
const emit = defineEmits<{
  (e: 'nuevoMensaje', payload: ChatAI[]): void
  (e: 'scrollToBottom'): void
}>()

const isMobile = () => {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
    navigator.userAgent,
  )
}

/**
 *
 * @param event
 */
const handleEnter = (event: KeyboardEvent) => {
  if (isMobile()) {
    // Let the default behavior happen (e.g., insert a line break)
    return
  }
  if (
    event.key === 'Enter' &&
    !event.shiftKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey
  ) {
    nuevoMensaje()
    inputChat.value = ''
  }
}
/**
 *
 */
const nuevoMensaje = () => {
  if (!inputChat.value) return
  if (inputChat.value?.length === 0) return

  const chatPersistent = inputChat.value //.replace(/\n/g, '<br>')

  const chatArray: ChatAI[] = [
    {
      chat: chatPersistent,
      origen: 'user',
      tipo: 'texto',
    },
  ]

  if (url_imagen.value.length > 0) {
    chatArray.push({
      chat: url_imagen.value,
      origen: 'user',
      tipo: 'imagen',
    })
  }

  if (url_pdf.value.length > 0) {
    chatArray.push({
      chat: url_pdf.value,
      origen: 'user',
      tipo: 'pdf',
    })
  }

  emit('nuevoMensaje', chatArray)

  nextTick().then(() => {
    inputChat.value = ''
    url_imagen.value = ''
    url_pdf.value = ''
  })
}

/**
 *
 */
const uploadFile = async (files: File[]) => {
  const file = files[0]
  /**
   *
   */

  const [_oldName, ...formatArray] = file!.name.split('.')

  const format = formatArray[formatArray.length - 1]

  if (
    format !== 'jpg' &&
    format !== 'jpeg' &&
    format !== 'png' &&
    format !== 'pdf'
  ) {
    return toast('warning', 'El formato debe ser .jpg, .png o .pdf')
  }
  if (!file) {
    return toast('warning', 'No se pudo subir el documento')
  }

  const fileUrl = await uploadFileGcp(file)

  if (format === 'pdf') {
    url_pdf.value = fileUrl
  } else {
    url_imagen.value = fileUrl
  }
}
</script>

<template>
  <ModalConfigs v-if="showModalConfig" @closeModal="showModalConfig = false" />

  <div class="max-w-3xl mx-auto min-h-full flex-1 relative">
    <div class="absolute right-0 text-center" v-if="!isAtBottom">
      <Button @click="$emit('scrollToBottom')" variant="outline">
        <LucideChevronDown />
      </Button>
    </div>
    <div class="flex flex-row border">
      <div class="basis-1/5" v-if="url_imagen.length > 0">
        <img
          style="object-fit: contain"
          :src="url_imagen"
          class="w-full min-h-24 max-h-28"
        />
      </div>

      <div class="basis-1/5" v-if="url_pdf.length > 0">
        <div class="w-full flex min-h-24 justify-center items-center">
          <LucideFileText class="h-10 w-10" />
        </div>
      </div>

      <div :class="url_imagen.length === 0 ? 'w-full' : 'basis-4/5'">
        <FocusScope>
          <textarea
            @keydown.enter="handleEnter"
            class="flex min-h-24 max-h-48 w-full rounded-md bg-background px-4 py-4 text-md ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            style="field-sizing: content"
            placeholder="Escribe un mensaje..."
            v-model="inputChat"
          />
        </FocusScope>
      </div>
    </div>

    <div class="flex justify-between border-x h-12">
      <div>
        <Popover v-model:open="showPopover">
          <PopoverTrigger as-child>
            <div class="border-x p-4 cursor-pointer">
              <LucideEllipsis
                class="dark:text-primary-foreground h-4 w-4 min-h-4 min-w-4 max-h-4 max-w-4"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent class="w-[180px] p-0">
            <Command>
              <CommandGroup>
                <CommandItem
                  value="Configuraciones"
                  @click.prevent="showModalConfig = true"
                >
                  Configuraciones
                </CommandItem>
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div class="flex">
        <DropzoneClick
          @files-dropped="uploadFile"
          v-if="url_imagen.length === 0 && url_pdf.length === 0"
        >
          <div class="border-x cursor-pointer p-4">
            <LucidePaperclip
              class="dark:text-primary-foreground h-4 w-4 min-h-4 min-w-4 max-h-4 max-w-4"
            />
          </div>
        </DropzoneClick>

        <div
          class="border-x cursor-pointer p-4"
          v-if="url_imagen.length > 0 || url_pdf.length > 0"
          @click.prevent="
            () => {
              url_imagen = ''
              url_pdf = ''
            }
          "
        >
          <LucideX
            class="dark:text-primary-foreground h-4 w-4 min-h-4 min-w-4 max-h-4 max-w-4"
          />
        </div>

        <div
          class="bg-secondary border-x p-4 cursor-pointer"
          @click.prevent="nuevoMensaje"
        >
          <LucideArrowUp
            class="dark:text-primary-foreground h-4 w-4 min-h-4 min-w-4 max-h-4 max-w-4"
          />
        </div>
      </div>
    </div>
  </div>
</template>
