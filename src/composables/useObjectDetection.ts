import type { Detection } from '~/types'
import { defineInvoke } from '@unbird/eventa'
import { createContext } from '@unbird/eventa/adapters/webworkers'
import { onUnmounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { objectDetectionInvoke } from '~/events/object-detection'
import DetectWorker from '~/workers/detect-worker?worker'

export function useObjectDetection() {
  const detectionModels = [
    {
      label: 'Factorio YOLO v0',
      url: 'https://huggingface.co/proj-airi/factorio-yolo-v0/resolve/main/best.onnx',
    },
  ] as const

  const defaultImageUrl = 'https://huggingface.co/datasets/proj-airi/factorio-yolo-dataset-v0/resolve/main/examples/demo.jpg'
  const names = [
    'assembling-machine-1',
    'assembling-machine-2',
    'assembling-machine-3',
    'transport-belt',
    'fast-transport-belt',
    'express-transport-belt',
  ]

  const objectUrls = ref<string[]>([])
  const modelSize = ref(640)
  const loadingImageFromUrl = ref(false)

  const objectDetectionContext = createContext(new DetectWorker()).context
  const detectObject = defineInvoke(objectDetectionContext, objectDetectionInvoke)

  function cleanupObjectUrls() {
    objectUrls.value.forEach(url => URL.revokeObjectURL(url))
    objectUrls.value = []
  }

  onUnmounted(() => {
    cleanupObjectUrls()
  })

  function processSize(width: number, height: number, maxSize: number): [number, number] {
    if (width > height) {
      return [maxSize, Math.round(maxSize * height / width)]
    }
    return [Math.round(maxSize * width / height), maxSize]
  }

  async function waitForImageLoad(imageEl: HTMLImageElement): Promise<void> {
    return new Promise((resolve) => {
      imageEl.onload = () => resolve()
    })
  }

  function drawDetections(ctx: CanvasRenderingContext2D, detections: Detection[]) {
    if (!ctx) {
      return
    }

    ctx.strokeStyle = 'rgb(0, 255, 0)'
    ctx.fillStyle = 'rgb(0, 255, 0)'
    ctx.font = '20px Arial'
    ctx.lineWidth = 2

    for (const detection of detections) {
      const className = names[detection.classId] ?? `class-${detection.classId}`
      ctx.strokeRect(detection.topLeftX, detection.topLeftY, detection.bottomRightX - detection.topLeftX, detection.bottomRightY - detection.topLeftY)
      ctx.fillText(`${className}: ${detection.confidence.toFixed(2)}`, detection.topLeftX, detection.topLeftY)
    }
  }

  async function detectImageData(imageDataBuffer: ArrayBuffer, modelUrl: string) {
    return detectObject({
      imageDataBuffer,
      modelUrl,
    }, { transfer: [imageDataBuffer] })
  }

  async function detectBlob(blob: Blob, canvas: HTMLCanvasElement | null, modelUrl: string) {
    if (!canvas) {
      toast.error('Failed to get canvas element')
      return
    }

    const img = await createImageBitmap(blob)
    const imageEl = document.createElement('img')
    imageEl.src = URL.createObjectURL(blob)
    objectUrls.value.push(imageEl.src)
    await waitForImageLoad(imageEl)

    const [newWidth, newHeight] = processSize(img.width, img.height, modelSize.value)
    imageEl.width = newWidth
    imageEl.height = newHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      toast.error('Failed to get canvas context')
      return
    }

    ctx.clearRect(0, 0, modelSize.value, modelSize.value)
    ctx.fillStyle = 'rgb(114, 114, 114)'
    ctx.fillRect(0, 0, modelSize.value, modelSize.value)

    const dx = (modelSize.value - newWidth) / 2
    const dy = (modelSize.value - newHeight) / 2
    ctx.drawImage(imageEl, dx, dy, newWidth, newHeight)

    try {
      const imageData = ctx.getImageData(0, 0, modelSize.value, modelSize.value)
      const { detections, _transfer } = await detectImageData(imageData.data.buffer, modelUrl)
      ctx.putImageData(new ImageData(new Uint8ClampedArray(_transfer[0]), modelSize.value, modelSize.value), 0, 0)
      drawDetections(ctx, detections)
    }
    catch (error) {
      console.error(error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(`Failed to run detection: ${errorMessage}`)
    }
  }

  async function loadImageFromUrl(url: string, canvas: HTMLCanvasElement | null, modelUrl: string) {
    const targetUrl = url.trim()
    if (!targetUrl) {
      toast.error('Please input an image URL')
      return
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(targetUrl)
    }
    catch {
      toast.error('Invalid URL')
      return
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      toast.error('Only http(s) URLs are supported')
      return
    }

    loadingImageFromUrl.value = true

    try {
      const response = await fetch(parsedUrl.toString())
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (contentType && !contentType.startsWith('image/')) {
        throw new Error(`URL returned non-image content (${contentType})`)
      }

      const blob = await response.blob()
      if (!blob.type.startsWith('image/')) {
        throw new Error(`URL returned non-image blob (${blob.type || 'unknown type'})`)
      }

      await detectBlob(blob, canvas, modelUrl)
    }
    catch (error) {
      console.error(error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      const corsHint = errorMessage.includes('Failed to fetch')
        ? ' (the remote server may block CORS)'
        : ''
      toast.error(`Failed to load image URL: ${errorMessage}${corsHint}`)
    }
    finally {
      loadingImageFromUrl.value = false
    }
  }

  return {
    detectionModels,
    defaultImageUrl,
    modelSize,
    objectUrls,
    loadingImageFromUrl,
    drawDetections,
    detectImageData,
    detectBlob,
    loadImageFromUrl,
    cleanupObjectUrls,
  }
}
