<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { useFileDialog } from '@vueuse/core'
import { ref } from 'vue'
import PreviewBox from '~/components/PreviewBox.vue'
import { Button as TheButton } from '~/components/ui/button'
import { Input as TheInput } from '~/components/ui/input'

const imageUrl = defineModel<string>('imageUrl', {
  required: true,
})

const props = defineProps<{
  loadingImageFromUrl: boolean
  modelSize: number
  hasImage: boolean
  selectedDetectionModel: string
  detectBlob: (blob: Blob, canvas: HTMLCanvasElement | null, modelUrl: string) => Promise<void>
  loadImageFromUrl: (url: string, canvas: HTMLCanvasElement | null, modelUrl: string) => Promise<void>
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const fileDialog = useFileDialog({
  accept: 'image/*',
  multiple: false,
})

fileDialog.onChange(async (files) => {
  if (!files) {
    return
  }

  const file = files.item(0)
  if (!file) {
    return
  }

  await props.detectBlob(file, canvasRef.value, props.selectedDetectionModel)
})

function onCanvasRef(el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLCanvasElement) {
    canvasRef.value = el
    return
  }

  canvasRef.value = null
}

async function onLoadImageFromUrl() {
  await props.loadImageFromUrl(imageUrl.value, canvasRef.value, props.selectedDetectionModel)
}
</script>

<template>
  <form flex gap-2 mb-2 @submit.prevent="onLoadImageFromUrl">
    <TheInput
      v-model="imageUrl"
      placeholder="https://huggingface.co/datasets/proj-airi/factorio-yolo-dataset-v0/resolve/main/examples/demo.jpg"
    />
    <TheButton type="submit" variant="outline" :disabled="loadingImageFromUrl">
      {{ loadingImageFromUrl ? 'Loading...' : 'Load URL' }}
    </TheButton>
  </form>
  <PreviewBox
    w="80 md:120 lg:160"
    h="80 md:120 lg:160"
    relative cursor-pointer
    :show-placeholder="!hasImage"
    @click="fileDialog.open()"
  >
    <canvas
      :ref="onCanvasRef" :width="modelSize"
      :height="modelSize" class="origin-top-left"
      scale="50 md:75 lg:100"
      transition-all duration-300
    />
    <template #placeholder>
      <div class="text-center">
        Click to select a image <br> (Square image required)
      </div>
    </template>
  </PreviewBox>
</template>
