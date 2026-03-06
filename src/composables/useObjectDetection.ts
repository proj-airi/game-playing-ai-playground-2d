import type { Detection } from '~/types'
import { defineInvoke } from '@unbird/eventa'
import { createContext } from '@unbird/eventa/adapters/webworkers'
import { computedAsync, useLocalStorage } from '@vueuse/core'
import { computed, onUnmounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { parse as parseYaml } from 'yaml'
import { objectDetectionInvoke } from '~/events/object-detection'
import DetectWorker from '~/workers/detect-worker?worker'

interface DetectionModel {
  label: string
  modelName: string
  version: string
  revision: string
}

interface DetectionConfig {
  names: string[]
}

interface PlaygroundConfig {
  dataset_revision: string
  input_size?: number
}

function buildModelRepoId(modelName: string, version: string) {
  return `proj-airi/${modelName}-${version}`
}

function buildDatasetRepoId(modelName: string, version: string) {
  return `proj-airi/${modelName}-dataset-${version}`
}

function buildModelUrl(repoId: string, revision: string) {
  return `https://huggingface.co/${repoId}/resolve/${revision}/best.onnx`
}

function buildModelCardUrl(repoId: string, revision: string) {
  return `https://huggingface.co/${repoId}/resolve/${revision}/README.md`
}

function buildDatasetDetectUrl(datasetRepo: string, datasetRevision: string) {
  return `https://huggingface.co/datasets/${datasetRepo}/resolve/${datasetRevision}/detect.yaml`
}

function buildDefaultImageUrl(datasetRepo: string, datasetRevision: string) {
  return `https://huggingface.co/datasets/${datasetRepo}/resolve/${datasetRevision}/examples/demo.jpg`
}

function extractFrontmatter(content: string) {
  const lines = content.split(/\r?\n/)
  if (lines[0]?.trim() !== '---') {
    throw new Error('Model card frontmatter is missing')
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
  if (closingIndex === -1) {
    throw new Error('Model card frontmatter closing marker is missing')
  }

  return lines.slice(1, closingIndex).join('\n')
}

function toPositiveInteger(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value)
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return undefined
}

function parsePlaygroundConfig(frontmatter: string): PlaygroundConfig {
  const parsed = parseYaml(frontmatter) as Record<string, unknown> | null
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Model card frontmatter is invalid YAML')
  }

  const playground = parsed.playground
  if (!playground || typeof playground !== 'object') {
    throw new Error('playground section is missing in model card frontmatter')
  }

  const config = playground as Record<string, unknown>
  const datasetRevision = typeof config.dataset_revision === 'string' ? config.dataset_revision : ''

  if (!datasetRevision) {
    throw new Error('playground.dataset_revision is missing')
  }

  return {
    dataset_revision: datasetRevision,
    input_size: toPositiveInteger(config.input_size ?? config.image_size),
  }
}

function parseNamesFromDetectYml(content: string) {
  const parsed = parseYaml(content) as Record<string, unknown> | null
  const namesValue = parsed?.names as { [i: number]: string }
  if (!namesValue) {
    throw new Error('names section is missing in detect.yml')
  }

  return Object.values(namesValue)
}

export const detectionModels: DetectionModel[] = [
  { label: 'Factorio YOLO v0', modelName: 'factorio-yolo', version: 'v0', revision: 'main' },
]

export function useObjectDetection() {
  const currentModel = useLocalStorage('game-playing-ai-playground-2d/detection-model', detectionModels[0])
  const currentPlaygroundConfig = computedAsync(async () => {
    const modelCard = await fetchText(buildModelCardUrl(buildModelRepoId(currentModel.value.modelName, currentModel.value.version), currentModel.value.revision))
    const frontmatter = extractFrontmatter(modelCard)
    return parsePlaygroundConfig(frontmatter)
  })
  const currentDetectionConfig = computedAsync<DetectionConfig>(async () => {
    if (!currentPlaygroundConfig.value) {
      return { names: [] }
    }
    const detectYml = await fetchText(buildDatasetDetectUrl(buildDatasetRepoId(currentModel.value.modelName, currentModel.value.version), currentPlaygroundConfig.value.dataset_revision))
    return { names: parseNamesFromDetectYml(detectYml) }
  })
  const currentInputSize = computed(() => currentPlaygroundConfig.value?.input_size ?? 640)
  const currentModelUrl = computed(() => buildModelUrl(buildModelRepoId(currentModel.value.modelName, currentModel.value.version), currentModel.value.revision))
  const currentDefaultImageUrl = computed(() => buildDefaultImageUrl(buildDatasetRepoId(currentModel.value.modelName, currentModel.value.version), currentPlaygroundConfig.value?.dataset_revision ?? 'main'))

  const objectUrls = ref<string[]>([])
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

  async function fetchText(url: string) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status} (${url})`)
    }
    return response.text()
  }

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
      const className = currentDetectionConfig.value!.names[detection.classId]
      ctx.strokeRect(detection.topLeftX, detection.topLeftY, detection.bottomRightX - detection.topLeftX, detection.bottomRightY - detection.topLeftY)
      ctx.fillText(`${className}: ${detection.confidence.toFixed(2)}`, detection.topLeftX, detection.topLeftY)
    }
  }

  async function detectImageData(imageDataBuffer: ArrayBuffer, size: number) {
    if (!currentDetectionConfig.value) {
      throw new Error('Detection config is not loaded')
    }

    return detectObject({
      imageDataBuffer,
      modelUrl: currentModelUrl.value,
      modelSize: size,
      outputNumClasses: currentDetectionConfig.value!.names.length,
    }, { transfer: [imageDataBuffer] })
  }

  async function detectBlob(blob: Blob, canvas: HTMLCanvasElement | null) {
    if (!canvas || !currentDetectionConfig.value) {
      throw new Error('Failed to get canvas element or detection config')
    }

    const img = await createImageBitmap(blob)
    const imageEl = document.createElement('img')
    imageEl.src = URL.createObjectURL(blob)
    objectUrls.value.push(imageEl.src)
    await waitForImageLoad(imageEl)

    const [newWidth, newHeight] = processSize(img.width, img.height, currentInputSize.value)
    imageEl.width = newWidth
    imageEl.height = newHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      toast.error('Failed to get canvas context')
      return
    }

    ctx.clearRect(0, 0, currentInputSize.value, currentInputSize.value)
    ctx.fillStyle = 'rgb(114, 114, 114)'
    ctx.fillRect(0, 0, currentInputSize.value, currentInputSize.value)

    const dx = (currentInputSize.value - newWidth) / 2
    const dy = (currentInputSize.value - newHeight) / 2
    ctx.drawImage(imageEl, dx, dy, newWidth, newHeight)

    try {
      const imageData = ctx.getImageData(0, 0, currentInputSize.value, currentInputSize.value)
      const { detections, _transfer } = await detectImageData(imageData.data.buffer, currentInputSize.value)
      ctx.putImageData(new ImageData(new Uint8ClampedArray(_transfer[0]), currentInputSize.value, currentInputSize.value), 0, 0)
      drawDetections(ctx, detections)
    }
    catch (error) {
      console.error(error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(`Failed to run detection: ${errorMessage}`)
    }
  }

  async function loadImageFromUrl(url: string, canvas: HTMLCanvasElement | null) {
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

      await detectBlob(blob, canvas)
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
    currentModel,
    currentDetectionConfig,
    currentDefaultImageUrl,
    currentPlaygroundConfig,
    currentInputSize,
    objectUrls,
    loadingImageFromUrl,
    drawDetections,
    detectImageData,
    detectBlob,
    loadImageFromUrl,
    cleanupObjectUrls,
  }
}
