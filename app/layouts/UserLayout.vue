<script setup lang="ts">
import { LucideSquarePen } from 'lucide-vue-next'
import { useMagicKeys } from '@vueuse/core'

const { $trpc } = useNuxtApp()

const route = useRoute()
const notas = useNotes()
const chats = useChatSessions()
const proyectosTareas = useProyectosTareas()

onMounted(async () => {
  setChatSessions()
  setNotes()
  setProyectosTareas()
})

const { Meta_B, Ctrl_B } = useMagicKeys({
  passive: false,
  onEventFired(e) {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) e.preventDefault()
  },
})

const handleSidebar = () => {
  sidebar.value = !sidebar.value
}

watch([Meta_B, Ctrl_B], (v) => {
  if (v[0] || v[1]) handleSidebar()
})

const sidebar = ref(true)
</script>

<template>
  <div class="min-h-screen overflow-hidden">
    <div
      class="grid w-full grid-cols-1 min-h-screen"
      :class="sidebar ? 'lg:grid-cols-[250px_1fr]' : ''"
    >
      <div class="hidden lg:block dark:bg-transparent bg-secondary">
        <div class="flex flex-col gap-2" style="width: 250px">
          <div
            class="fixed flex flex-col justify-between border-r pb-4 h-full"
            style="width: 250px"
            v-show="sidebar"
          >
            <nav class="grid items-start text-sm font-medium">
              <div class="border-b border-t h-14 px-4">
                <div class="flex justify-between items-center h-full">
                  <CommandModal />
                  <LucideSquarePen
                    :size="16"
                    v-if="route.path === '/chat'"
                    @click.prevent="$router.push('/chat')"
                    class="hover:text-primary cursor-pointer"
                  />

                  <LucideSquarePen
                    :size="16"
                    v-if="route.name === 'notas-id_note'"
                    @click.prevent="$router.push('/notas')"
                    class="hover:text-primary cursor-pointer"
                  />
                </div>
              </div>

              <div
                class="py-4 overflow-y-auto max-h-screen"
                v-if="route.name === 'notas' || route.name === 'notas-id_note'"
              >
                <div class="flex flex-col">
                  <template v-for="(item, k) in notas" :key="k">
                    <h1
                      class="duration-200 px-4 mb-2 flex shrink-0 items-center rounded-md text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0"
                    >
                      {{ item.group_name }}
                    </h1>

                    <template v-for="n in item.notes">
                      <ItemNavigation
                        :id_note="n.id_note"
                        :to="`/notas/${n.id_note}`"
                        :active="route.params.id_note === n.id_note.toString()"
                        :text="n.note_name"
                      />
                    </template>
                  </template>
                </div>
              </div>

              <div
                class="overflow-y-auto max-h-screen"
                v-if="route.path === '/chat'"
              >
                <div class="flex flex-col">
                  <template v-for="(item, k) in chats" :key="k">
                    <ItemsChats
                      :uuid="item.uuid"
                      :to="`/chat?id=${item.uuid}`"
                      :active="route.query.id === item.uuid.toString()"
                      :text="item.titulo"
                    />
                  </template>
                </div>
              </div>

              <div
                class="pb-4 overflow-y-auto max-h-screen"
                v-if="
                  route.name === 'tareas' || route.name === 'tareas-id_proyecto'
                "
              >
                <div class="flex flex-col">
                  <template v-for="(t, k) in proyectosTareas" :key="k">
                    <ItemTareas
                      :id_proyecto="t.id_proyecto"
                      :to="`/tareas/${t.id_proyecto}`"
                      :active="
                        route.params.id_proyecto === t.id_proyecto.toString()
                      "
                      :text="t.nombre_proyecto"
                    />
                  </template>
                </div>
              </div>
            </nav>
          </div>
        </div>
      </div>

      <div class="flex flex-col flex-1">
        <main class="flex flex-1 flex-col">
          <div class="flex-1">
            <slot />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
