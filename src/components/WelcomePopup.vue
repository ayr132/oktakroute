<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Accessibility } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['close'])
const { t } = useI18n()
const startButton = ref(null)

const onKeydown = (event) => { if (event.key === 'Escape') emit('close') }

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  startButton.value?.focus()
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div class="confirm-layer">
      <div class="confirm-backdrop" @click="emit('close')"></div>
      <section class="confirm-card welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcome-title" aria-describedby="welcome-message">
        <span class="brand-mark welcome-mark"><Accessibility :size="26" stroke-width="2.4" /></span>
        <h2 id="welcome-title">{{ t('welcome.title') }}</h2>
        <p id="welcome-message">{{ t('welcome.message') }}</p>
        <button ref="startButton" type="button" class="btn btn--brand btn--block" @click="emit('close')">{{ t('welcome.start') }}</button>
      </section>
    </div>
  </Teleport>
</template>
