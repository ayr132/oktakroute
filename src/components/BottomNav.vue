<script setup>
import { Bell, Flag, Map as MapIcon } from '@lucide/vue'

defineProps({
  view: { type: String, required: true },
  activeCount: { type: Number, default: 0 },
})

defineEmits(['go'])

const items = [
  { id: 'report', label: 'Report', icon: Flag },
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'updates', label: 'Updates', icon: Bell },
]
</script>

<template>
  <nav class="bottom-nav" aria-label="Main navigation">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      :class="{ active: view === item.id }"
      :aria-current="view === item.id ? 'page' : undefined"
      @click="$emit('go', item.id)"
    >
      <span class="nav-icon">
        <component :is="item.icon" :size="22" />
        <span v-if="item.id === 'updates' && activeCount" class="nav-badge">{{ activeCount }}</span>
      </span>
      <span class="nav-label">{{ item.label }}</span>
    </button>
  </nav>
</template>
