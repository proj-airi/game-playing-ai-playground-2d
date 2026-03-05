<script setup lang="ts">
withDefaults(defineProps<{
  showPlaceholder?: boolean
}>(), {
  showPlaceholder: false,
})
</script>

<template>
  <div
    overflow-hidden
    rounded-lg
    relative
    border="1 gray-200 dark:gray-700"
    transition-all
    duration-300
    mb-4
  >
    <slot />
    <div
      v-if="showPlaceholder && $slots.placeholder"
      absolute top-0 left-0 w-full h-full flex
      justify-center items-center text-gray-500 text-sm
    >
      <slot name="placeholder" />
    </div>
  </div>
</template>
