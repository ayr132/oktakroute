<script setup>
import { Search } from '@lucide/vue'

defineProps({
  destinations: { type: Array, required: true },
  modelValue: { type: String, required: true },
  label: { type: String, default: 'Where would you like to go?' },
  inputId: { type: String, default: 'destination' },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="destination-input">
    <label class="field-label" :for="inputId">{{ label }}</label>
    <div class="select-wrap">
      <select
        :id="inputId"
        :value="modelValue"
        @change="emit('update:modelValue', $event.target.value)"
      >
        <option v-for="place in destinations" :key="place.id" :value="place.id">
          {{ place.destination }}
        </option>
      </select>
      <Search class="select-search" :size="17" aria-hidden="true" />
    </div>
  </div>
</template>
