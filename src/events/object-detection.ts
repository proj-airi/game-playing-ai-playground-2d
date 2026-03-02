import type { Detection } from '~/types'
import { defineInvokeEventa } from '@unbird/eventa'

export interface ObjectDetectionRequest {
  imageDataBuffer: ArrayBuffer
  modelUrl: string
}

export const objectDetectionInvoke = defineInvokeEventa<
  Promise<{ detections: Detection[], _transfer: ArrayBuffer[] }>,
  ObjectDetectionRequest
>('object-detection:eventa:invoke:detect')
