<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, Globe } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { LANGUAGES, setLanguage } from '../i18n'

const { t, locale } = useI18n()
const open = ref(false)
const root = ref(null)

function pick(code) {
  setLanguage(code)
  open.value = false
}

const onPointerDown = (event) => { if (!root.value?.contains(event.target)) open.value = false }
const onKeydown = (event) => { if (event.key === 'Escape') open.value = false }

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="lang">
    <button type="button" class="lang-btn" :aria-label="t('language')" aria-haspopup="listbox" :aria-expanded="open" @click="open = !open">
      <Globe :size="20" />
    </button>
    <ul v-if="open" class="lang-menu" role="listbox" :aria-label="t('language')">
      <li v-for="language in LANGUAGES" :key="language.code" role="option" :aria-selected="language.code === locale">
        <button type="button" @click="pick(language.code)">
          <span>{{ language.label }}</span>
          <Check v-if="language.code === locale" :size="16" />
        </button>
      </li>
    </ul>
  </div>
</template>
