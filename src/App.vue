<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import ImageTabContent from '~/components/tabs/ImageTabContent.vue'
import VlmTabContent from '~/components/tabs/VlmTabContent.vue'
import VncTabContent from '~/components/tabs/VncTabContent.vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { isDark, toggleDark } from '~/composables/dark'
import { useObjectDetection } from '~/composables/useObjectDetection'

const {
  detectionModels,
  defaultImageUrl,
  modelSize,
  objectUrls,
  loadingImageFromUrl,
  drawDetections,
  detectImageData,
  detectBlob,
  loadImageFromUrl,
} = useObjectDetection()

const tab = useLocalStorage('game-playing-ai-playground-2d/current-tab', 'image')
const selectedDetectionModel = useLocalStorage('game-playing-ai-playground-2d/detection-model-url', detectionModels[0].url)
const imageUrl = useLocalStorage('game-playing-ai-playground-2d/image-url', defaultImageUrl)
const vncAddress = useLocalStorage('game-playing-ai-playground-2d/vnc-address', 'ws://localhost:5901/websockify')

// TODO: Move cross-tab detection dependencies to Pinia to avoid passing function props through App.vue.
</script>

<template>
  <div class="w-full h-full flex flex-col justify-center items-center">
    <div class="flex flex-col gap-2 mb-8">
      <div class="text-3xl font-bold text-center">
        Game Playing AI Playground 2D
      </div>
      <div class="text-gray-500 text-sm text-center">
        The playground for the game playing AI.
      </div>
      <div class="flex items-center justify-center gap-2 text-sm">
        <label for="detection-model" class="text-gray-500">Detection Model</label>
        <Select
          v-model="selectedDetectionModel"
          name="detection-model"
        >
          <SelectTrigger id="detection-model" class="w-72">
            <SelectValue placeholder="Select a detection model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="model in detectionModels"
              :key="model.url"
              :value="model.url"
            >
              {{ model.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <Tabs v-model="tab" default-value="image">
      <div w-full flex justify-center>
        <TabsList mx-auto>
          <TabsTrigger value="image">
            Image
          </TabsTrigger>
          <TabsTrigger value="video">
            Video
          </TabsTrigger>
          <TabsTrigger value="vnc">
            VNC
          </TabsTrigger>
          <TabsTrigger value="vlm">
            VLM
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="image">
        <ImageTabContent
          v-model:image-url="imageUrl"
          :loading-image-from-url="loadingImageFromUrl"
          :model-size="modelSize"
          :has-image="objectUrls.length > 0"
          :selected-detection-model="selectedDetectionModel"
          :detect-blob="detectBlob"
          :load-image-from-url="loadImageFromUrl"
        />
      </TabsContent>
      <TabsContent value="video">
        TODO
      </TabsContent>
      <TabsContent value="vnc">
        <VncTabContent
          v-model:vnc-address="vncAddress"
          :model-size="modelSize"
          :selected-detection-model="selectedDetectionModel"
          :is-active="tab === 'vnc'"
          :detect-image-data="detectImageData"
          :draw-detections="drawDetections"
        />
      </TabsContent>
      <TabsContent value="vlm">
        <VlmTabContent
          v-model:vnc-address="vncAddress"
          :is-active="tab === 'vlm'"
        />
      </TabsContent>
    </Tabs>

    <div class="flex gap-4 text-gray-500 text-lg">
      <div v-if="isDark" cursor-pointer i-solar-cloudy-moon-bold-duotone @click="toggleDark()" />
      <div v-else cursor-pointer i-solar-sun-2-bold @click="toggleDark()" />
      <a i-carbon-logo-github href="https://github.com/proj-airi/game-playing-ai-playground-2d" target="_blank" />
      <a i-simple-icons-huggingface href="https://huggingface.co/spaces/proj-airi/game-playing-ai-playground-2d" target="_blank" />
    </div>
  </div>
</template>
