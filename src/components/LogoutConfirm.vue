<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['confirm', 'cancel'])
const { t } = useI18n()
const cancelButton = ref(null)

const onKeydown = (event) => {
  if (event.key !== 'Escape') return
  event.stopPropagation()
  emit('cancel')
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown, true)
  cancelButton.value?.focus()
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown, true))
</script>

<template>
  <Teleport to="body">
    <div class="confirm-layer">
      <div class="confirm-backdrop" @click="emit('cancel')"></div>
      <section class="confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-message">
        <h2 id="logout-title">{{ t('logout.title') }}</h2>
        <p id="logout-message">{{ t('logout.message') }}</p>
        <div class="confirm-actions">
          <button ref="cancelButton" type="button" class="btn btn--light" @click="emit('cancel')">{{ t('logout.cancel') }}</button>
          <button type="button" class="btn btn--danger" @click="emit('confirm')">{{ t('profile.logOut') }}</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
