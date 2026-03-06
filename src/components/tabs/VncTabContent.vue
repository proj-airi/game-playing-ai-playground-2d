<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { Detection } from '~/types'
import NoVncClient from '@novnc/novnc/lib/rfb'
import { onUnmounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import PreviewBox from '~/components/PreviewBox.vue'
import { Button as TheButton } from '~/components/ui/button'
import { Input as TheInput } from '~/components/ui/input'
import { useAnimationFrameTask } from '~/composables/useAnimationFrameTask'
import { useFps } from '~/composables/useFps'

const props = defineProps<{
  modelSize: number
  selectedDetectionModel: string
  isActive: boolean
  detectImageData: (imageDataBuffer: ArrayBuffer, size: number) => Promise<{ detections: Detection[], _transfer: ArrayBuffer[] }>
  drawDetections: (ctx: CanvasRenderingContext2D, detections: Detection[]) => void
}>()

const vncAddress = defineModel<string>('vncAddress', {
  required: true,
})

const vncViewRef = ref<HTMLDivElement | null>(null)
const resultCanvasRef = ref<HTMLCanvasElement | null>(null)
const vncClient = ref<NoVncClient | null>(null)
const vncCanvas = ref<HTMLCanvasElement | null>(null)
const { fps, updateFps } = useFps()

const detectTask = useAnimationFrameTask(async () => {
  if (!vncClient.value || !vncCanvas.value) {
    return
  }

  if (!vncCanvas.value.width || !vncCanvas.value.height) {
    return
  }

  const sourceCtx = vncCanvas.value.getContext('2d', { willReadFrequently: true })
  if (!sourceCtx) {
    return
  }

  const resultCanvas = resultCanvasRef.value
  if (!resultCanvas) {
    console.error('Failed to get canvas element')
    return
  }

  const resultCtx = resultCanvas.getContext('2d')
  if (!resultCtx) {
    console.error('Failed to get canvas context')
    return
  }

  const imageData = sourceCtx.getImageData(0, 0, vncCanvas.value.width, vncCanvas.value.height)
  const { detections, _transfer } = await props.detectImageData(imageData.data.buffer, props.modelSize)

  resultCtx.clearRect(0, 0, props.modelSize, props.modelSize)
  resultCtx.putImageData(new ImageData(new Uint8ClampedArray(_transfer[0]), vncCanvas.value.width, vncCanvas.value.height), 0, 0)
  props.drawDetections(resultCtx, detections)

  updateFps()
  resultCtx.fillStyle = 'rgb(0, 255, 0)'
  resultCtx.font = '20px Arial'
  resultCtx.fillText(`FPS: ${fps.value}`, 0, 20)
})

function onVncViewRef(el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLDivElement) {
    vncViewRef.value = el
    return
  }

  vncViewRef.value = null
}

function onResultCanvasRef(el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLCanvasElement) {
    resultCanvasRef.value = el
    return
  }

  resultCanvasRef.value = null
}

function disconnectVnc() {
  detectTask.pause()
  vncClient.value?.disconnect()
  vncClient.value = null
  vncCanvas.value = null
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
  detectTask.resume()
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
    <TheButton variant="outline" @click="onConnectVnc">
      Connect
    </TheButton>
    <TheButton variant="outline" as="a" size="icon" px-2 href="https://github.com/proj-airi/game-playing-ai-playground-2d#run-game-client-in-docker" target="_blank">
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
    <PreviewBox
      w="60 md:90 lg:120"
      h="60 md:90 lg:120"
      :show-placeholder="!vncCanvas"
    >
      <div scale-75 origin-top-left>
        <canvas
          :ref="onResultCanvasRef" :width="modelSize"
          :height="modelSize" class="origin-top-left"
          scale="50 md:75 lg:100"
          transition-all duration-300
        />
      </div>
      <template #placeholder>
        Detection result
      </template>
    </PreviewBox>
  </div>
</template>
