<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import NoVncClient from '@novnc/novnc/lib/rfb'
import { computed, onUnmounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import PreviewBox from '~/components/PreviewBox.vue'
import { Button as TheButton } from '~/components/ui/button'
import { Input as TheInput } from '~/components/ui/input'
import { useAnimationFrameTask } from '~/composables/useAnimationFrameTask'
import { useVlm } from '~/composables/useVlm'

const vncAddress = defineModel<string>('vncAddress', {
  required: true,
})

const props = defineProps<{
  isActive: boolean
}>()

const vncViewRef = ref<HTMLDivElement | null>(null)
const vncClient = ref<NoVncClient | null>(null)
const vncCanvas = ref<HTMLCanvasElement | null>(null)
const { loadingVlmModel, vlmModelLoaded, vlmModelLoadingProgress, vlmOutput, loadModel, generateFromCanvas } = useVlm()

function onVncViewRef(el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLDivElement) {
    vncViewRef.value = el
    return
  }

  vncViewRef.value = null
}

const generateTask = useAnimationFrameTask(async () => {
  if (!vncClient.value || !vncCanvas.value) {
    return
  }

  await generateFromCanvas(vncCanvas.value)
})
const isGenerating = computed(() => generateTask.isRunning.value)

function disconnectVnc() {
  generateTask.pause()
  vncClient.value?.disconnect()
  vncClient.value = null
  vncCanvas.value = null
}

async function onLoadVlmModelBtnClick() {
  await loadModel()
}

function onConnectVnc() {
  if (!vncViewRef.value) {
    toast.error('Failed to get VNC view element')
    return
  }

  disconnectVnc()
  vncClient.value = new NoVncClient(vncViewRef.value, vncAddress.value)
  vncClient.value.scaleViewport = true
  vncCanvas.value = vncViewRef.value.querySelector('canvas')
  generateTask.resume()
}

function onStopGenerate() {
  generateTask.pause()
}

watch(() => props.isActive, (active) => {
  if (!active) {
    disconnectVnc()
  }
})

onUnmounted(() => {
  disconnectVnc()
})
</script>

<template>
  <div class="lg:hidden mb-2 text-sm text-gray-500 text-center">
    Please use larger screen to get better experience.
  </div>
  <div flex gap-2 mb-2>
    <TheInput v-model="vncAddress" />
    <TheButton v-if="!vlmModelLoaded" :disabled="loadingVlmModel" variant="outline" @click="onLoadVlmModelBtnClick">
      {{ vlmModelLoadingProgress !== 0 ? `Loading... ${vlmModelLoadingProgress}%` : 'Load Model' }}
    </TheButton>
    <TheButton v-else-if="isGenerating" variant="outline" @click="onStopGenerate">
      Stop
    </TheButton>
    <TheButton v-else variant="outline" @click="onConnectVnc">
      Connect
    </TheButton>
    <TheButton variant="outline" as="a" size="icon" px-2 href="https://github.com/proj-airi/game-playing-ai-playground-2d#2d-game-playing-ai-playgroundwip" target="_blank">
      <span i-solar-question-circle-bold text-xl />
    </TheButton>
  </div>
  <div class="flex gap-2">
    <PreviewBox
      w="60 md:90 lg:120"
      h="60 md:90 lg:120"
      :show-placeholder="!vncClient"
    >
      <div :ref="onVncViewRef" w-full h-full class="vnc-container" />
      <template #placeholder>
        VNC view
      </template>
    </PreviewBox>
    <div w="60 md:90 lg:120" h="60 md:90 lg:120" rounded-lg border="1 gray-200 dark:gray-700" overflow-y-scroll>
      <div
        v-if="!vlmOutput" w-full h-full flex
        justify-center items-center text-gray-500 text-sm
      >
        Waiting for output...
      </div>
      <div v-else w="full h-full" p="4" text="sm">
        {{ vlmOutput }}
      </div>
    </div>
  </div>
</template>
