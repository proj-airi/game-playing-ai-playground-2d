import { defineInvoke } from '@unbird/eventa'
import { createContext } from '@unbird/eventa/adapters/webworkers'
import { ref } from 'vue'
import { vlmGenerateInvoke, vlmLoadModelInvoke, vlmModelLoadingProgressEvent } from '~/events/vlm-play-worker'
import VlmPlayWorker from '~/workers/vlm-play-worker?worker'

export function useVlm() {
  const loadingVlmModel = ref(false)
  const vlmModelLoaded = ref(false)
  const vlmModelLoadingProgress = ref(0)
  const vlmOutput = ref('')

  const vlmPlayWorkerContext = createContext(new VlmPlayWorker()).context
  vlmPlayWorkerContext.on(vlmModelLoadingProgressEvent, (progress) => {
    vlmModelLoadingProgress.value = progress.body ?? 0
  })

  const vlmLoadModel = defineInvoke(vlmPlayWorkerContext, vlmLoadModelInvoke)
  const vlmGenerate = defineInvoke(vlmPlayWorkerContext, vlmGenerateInvoke)

  async function loadModel() {
    if (vlmModelLoaded.value) {
      return
    }

    loadingVlmModel.value = true
    vlmModelLoadingProgress.value = 0
    try {
      await vlmLoadModel(undefined)
      vlmModelLoaded.value = true
    }
    finally {
      loadingVlmModel.value = false
    }
  }

  async function generate(blob: Blob) {
    const result = await vlmGenerate(blob)
    vlmOutput.value = result
    return result
  }

  async function generateFromCanvas(canvas: HTMLCanvasElement | null) {
    if (!canvas) {
      throw new Error('Failed to get VNC canvas element')
    }

    const blob = await new Promise<Blob>((resolve) => {
      const waitForCanvasPrepared = () => {
        canvas.toBlob((value) => {
          if (!value) {
            requestAnimationFrame(waitForCanvasPrepared)
            return
          }

          resolve(value)
        })
      }

      waitForCanvasPrepared()
    })

    return generate(blob)
  }

  return {
    loadingVlmModel,
    vlmModelLoaded,
    vlmModelLoadingProgress,
    vlmOutput,
    loadModel,
    generate,
    generateFromCanvas,
  }
}
