<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, User, X } from '@lucide/vue'

const props = defineProps({
  name: { type: String, default: '' },
  activeCount: { type: Number, default: 0 },
  resolvedCount: { type: Number, default: 0 },
})

const emit = defineEmits(['save', 'close'])
const draft = ref(props.name)
const saved = ref(false)
const input = ref(null)
const initial = computed(() => draft.value.trim().charAt(0).toUpperCase())
let savedTimer

const onKeydown = (event) => { if (event.key === 'Escape') emit('close') }

function save() {
  emit('save', draft.value.trim())
  saved.value = true
  window.clearTimeout(savedTimer)
  savedTimer = window.setTimeout(() => { saved.value = false }, 2000)
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  input.value?.focus()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.clearTimeout(savedTimer)
})
</script>

<template>
  <div class="profile-layer">
    <div class="profile-backdrop" @click="emit('close')"></div>
    <section class="profile-popup" role="dialog" aria-label="Your profile">
      <button type="button" class="icon-btn profile-close" aria-label="Close profile" @click="emit('close')"><X :size="18" /></button>

      <div class="profile-head">
        <span class="profile-avatar" aria-hidden="true">
          <template v-if="initial">{{ initial }}</template>
          <User v-else :size="30" />
        </span>
        <strong>{{ name || 'Your profile' }}</strong>
        <span>Your details stay in this browser.</span>
      </div>

      <form class="profile-form" @submit.prevent="save">
        <label class="form-label" for="profile-name">Display name</label>
        <input id="profile-name" ref="input" v-model="draft" class="text-input" type="text" maxlength="40" autocomplete="name" placeholder="e.g. Alex" />
        <button type="submit" class="btn btn--brand btn--block"><Check v-if="saved" :size="16" />{{ saved ? 'Saved' : 'Save' }}</button>
      </form>

      <div class="profile-stats" aria-label="Community reports">
        <div><strong>{{ activeCount }}</strong><span>Active reports</span></div>
        <div><strong>{{ resolvedCount }}</strong><span>Resolved</span></div>
      </div>
    </section>
  </div>
</template>
