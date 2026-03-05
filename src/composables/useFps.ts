import { ref } from 'vue'

export function useFps() {
  let frameCount = 0
  let lastTime = 0
  const fps = ref(0)

  function updateFps() {
    frameCount++
    const currentTime = performance.now()
    const elapsed = (currentTime - lastTime) * 0.001
    if (elapsed >= 1) {
      fps.value = Math.round(frameCount / elapsed)
      frameCount = 0
      lastTime = currentTime
    }
  }

  updateFps()

  return {
    fps,
    updateFps,
  }
}
