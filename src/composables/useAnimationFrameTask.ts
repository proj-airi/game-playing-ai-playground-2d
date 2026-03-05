import { computed, ref } from 'vue'

export function useAnimationFrameTask(fn: () => Promise<void>) {
  const animationFrameId = ref<number | null>(null)
  let requestToStop = false

  function pause() {
    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value)
      animationFrameId.value = null
    }

    requestToStop = true
  }

  function resume() {
    requestToStop = false
    fn().then(() => {
      if (requestToStop) {
        return
      }

      animationFrameId.value = requestAnimationFrame(resume)
    }).catch((error) => {
      console.error(error)
    })
  }

  const isRunning = computed(() => animationFrameId.value !== null)

  return {
    pause,
    resume,
    isRunning,
  }
}
