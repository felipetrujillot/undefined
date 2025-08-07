<script setup lang="ts">
import {
  Editor,
  EditorContent,
  useEditor,
  NodeViewWrapper,
} from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'

import { LucideImage } from 'lucide-vue-next'
import Typography from '@tiptap/extension-typography'
import { TabHandler } from './tab-extension'
import Link from '@tiptap/extension-link'
import Textarea from './ui/textarea/Textarea.vue'
import Dropzone from './Dropzone.vue'
const { $trpc } = useNuxtApp()
/**
 *
 */
const props = defineProps<{
  note_name: string
  note_text: string
  id_note: number
}>()

const emit = defineEmits(['saveNote'])
const titleRef = ref(props.note_name)

const editor = useEditor({
  content: props.note_text,
  extensions: [StarterKit, Link, Image, TabHandler],
  editorProps: {
    attributes: {
      class: `dark:prose-invert !max-w-none  prose prose-sm sm:prose lg:prose-md xl:prose-md focus:outline-none prose-p:leading-normal prose-p:m-0 prose-a:leading-normal prose-a:m-0 prose-h1:leading-normal prose-h1:m-0 prose-h2:leading-normal prose-h2:m-0 prose-h3-a:leading-normal prose-h3:m-0 prose-h4-a:leading-normal prose-h4:m-0 prose-h5-a:leading-normal prose-h5:m-0 prose-h6-a:leading-normal prose-h6:m-0 prose-li-a:leading-normal prose-li:m-0 prose-ul-a:leading-normal prose-ul:m-0 prose-table:border prose-th:border prose-td:border`,
    },
  },
  onUpdate: () => {
    if (!editor.value) return

    const note_text = editor.value.getHTML()

    emit('saveNote', {
      origin: 'command',
      id_note: props.id_note,
      note_text: note_text,
      note_name: titleRef.value,
    })

    // emit('saveNote', note_text)
  },
})

/**
 *
 */
const save = async () => {
  if (!editor.value) return

  const note_text = editor.value.getHTML()

  emit('saveNote', {
    origin: 'shortcut',
    id_note: props.id_note,
    note_text: note_text,
    note_name: titleRef.value,
  })
}
useMetaKey('s', () => {
  save()
})

onMounted(() => {
  editor.value!.commands.focus()
})
const fileInput = ref()

const openInput = () => {
  fileInput.value.click()
}

const changeFile = async (e: any) => {
  console.log(e)
  return
  const file = e.target.files[0]

  if (file) {
    const allowedTypes = ['image/png', 'image/jpeg']
    if (!allowedTypes.includes(file.type)) {
      return toast('warning', 'Sólo se permiten .jpg y .png')
    }

    const formData = new FormData()

    formData.append('document', file)

    const fileUrl = await $fetch<string>('/api/upload', {
      method: 'POST',
      body: formData,
    })

    editor.value?.commands.insertContent(`<img src="${fileUrl}" />`)
  }

  return
}

/**
 *
 */
const filesDropHeader = async (files: File[]) => {
  const file = files[0]

  const [_oldName, ...formatArray] = file!.name.split('.')

  const format = formatArray[formatArray.length - 1]

  if (format !== 'jpg' && format !== 'jpeg' && format !== 'png') {
    return toast('warning', 'El formato debe ser .jpg o .png')
  }
  if (!file) {
    return toast('warning', 'No se pudo subir el documento')
  }

  const fileUrl = await uploadFileGcp(file)
  editor.value?.commands.insertContent(`<img src="${fileUrl}" />`)
}
</script>

<template>
  <Dropzone @files-dropped="filesDropHeader">
    <div v-if="editor" class="space-y-4">
      <div class="flex flex-wrap justify-between gap-4 py-2 px-4 border-y">
        <div class="flex grow">
          <Input
            class="text-4xl font-bold m-0 p-0 min-h-1 h-12 resize border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            v-model="titleRef"
          ></Input>
        </div>

        <div class="flex flex-wrap flex-row-reverse gap-2">
          <!-- 
            
          <Button variant="outline" @click.prevent="openInput">
            <LucideImage :size="20" />
          </Button>
            -->
        </div>
      </div>

      <div class="p-0 min-h-72 px-4">
        <editor-content :editor="editor" />
      </div>
    </div>
  </Dropzone>
</template>
