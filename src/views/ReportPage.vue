<script setup>
import { computed, ref } from 'vue'
import { Check, ImagePlus, LoaderCircle } from '@lucide/vue'
import { EFFECT_LABELS, REPORT_TYPES } from '../data/reportTypes'
import MapView from '../components/MapView.vue'
import { createReport, DURATION_OPTIONS } from '../services/reportService'

const props = defineProps({
  paths: { type: Array, required: true },
  locations: { type: Array, required: true },
  plan: { type: Object, required: true },
  restrictions: { type: Object, required: true },
  initialPathId: { type: String, default: '' },
})

const emit = defineEmits(['submit', 'cancel'])
const pathId = ref(props.initialPathId)
const chosenPath = computed(() => props.paths.find((path) => path.id === pathId.value))
const type = ref('')
const description = ref('')
const durationHours = ref(24)
const photo = ref(null)
const fileInput = ref(null)
const error = ref('')
const isPreparing = ref(false)

const needsDescription = computed(() => type.value === 'other')
const canSubmit = computed(() => Boolean(pathId.value && type.value) && (!needsDescription.value || description.value.trim().length > 0))

function choosePhoto(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) {
    error.value = 'Choose an image under 8 MB.'
    event.target.value = ''
    return
  }
  error.value = ''
  photo.value = file
}

async function submit() {
  if (isPreparing.value) return
  if (!canSubmit.value) {
    error.value = !pathId.value
      ? 'Tap the road with the problem on the map.'
      : !type.value ? 'Pick what kind of problem it is.' : 'Add a short note describing the problem.'
    return
  }
  isPreparing.value = true
  error.value = ''
  try {
    const photos = []
    if (photo.value) {
      const bitmap = await createImageBitmap(photo.value)
      const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(bitmap.width * scale)
      canvas.height = Math.round(bitmap.height * scale)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Could not prepare the selected photo.')
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()
      photos.push(canvas.toDataURL('image/jpeg', 0.7))
    }
    emit('submit', createReport({ pathId: pathId.value, type: type.value, description: description.value, durationHours: durationHours.value, photos }))
  } catch (failure) {
    console.error('Could not prepare the selected report photo.', failure)
    error.value = 'This image could not be prepared. Try another photo.'
  } finally {
    isPreparing.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <h1>Report an issue</h1>
      <p>Active reports reroute everyone until the issue is resolved.</p>
    </header>

    <form class="form" @submit.prevent="submit">
      <section class="form-step">
        <span class="form-label">Which road has the problem?</span>
        <div class="report-picker">
          <MapView
            pick-mode
            :locations="locations"
            :paths="paths"
            :restrictions="restrictions"
            :plan="plan"
            :selected-path-id="pathId"
            @select-path="pathId = $event"
          />
        </div>
        <div class="report-context-row">
          <p class="picked-chip" :class="{ 'picked-chip--empty': !chosenPath }">
            {{ chosenPath ? `${chosenPath.name} (${chosenPath.id})` : 'Tap a road on the map to select it' }}
          </p>
          <aside class="authority-card" aria-label="Local authority for this area">
            <div class="authority-copy">
              <span>Local authority</span>
              <a href="https://jkt.kpkt.gov.my/en/list-of-local-authorities/" target="_blank" rel="noopener noreferrer">
                Majlis Perbandaran Selayang
              </a>
              <a href="tel:+60361265800">Office: +603-6126 5800</a>
              <a href="https://www.google.com/maps/search/?api=1&query=Majlis+Perbandaran+Selayang%2C+Gombak%2C+Selangor" target="_blank" rel="noopener noreferrer">
                Gombak, Selangor
              </a>
            </div>
            <a class="authority-logo" href="https://www.mps.gov.my/" target="_blank" rel="noopener noreferrer" aria-label="Visit the official Majlis Perbandaran Selayang website">
              <img src="https://www.mps.gov.my/sites/default/files/mps-logo.png" alt="Majlis Perbandaran Selayang logo" loading="lazy" />
            </a>
          </aside>
        </div>
      </section>

      <fieldset class="form-step">
        <legend class="form-label">What's the problem?</legend>
        <div class="type-grid">
          <button v-for="(info, key) in REPORT_TYPES" :key="key" type="button" :class="{ selected: type === key }" :aria-pressed="type === key" @click="type = key">
            <span class="type-icon" aria-hidden="true">{{ info.icon }}</span>
            <strong>{{ info.label }}</strong>
            <small>{{ EFFECT_LABELS[info.effect] }}</small>
          </button>
        </div>
      </fieldset>

      <section class="form-step">
        <label class="form-label" for="report-description">Details <span v-if="!needsDescription">(optional)</span></label>
        <textarea id="report-description" v-model="description" rows="3" maxlength="280" placeholder="e.g. Ramp rail is loose near the entrance." :required="needsDescription"></textarea>
      </section>

      <section class="form-step form-split">
        <div>
          <label class="form-label" for="report-duration">How long will it last?</label>
          <select id="report-duration" v-model="durationHours">
            <option v-for="option in DURATION_OPTIONS" :key="option.label" :value="option.hours">{{ option.label }}</option>
          </select>
        </div>
        <div>
          <span class="form-label">Photo (optional)</span>
          <input ref="fileInput" class="sr-only" type="file" accept="image/*" @change="choosePhoto" />
          <button type="button" class="btn btn--light btn--block" @click="fileInput?.click()">
            <Check v-if="photo" :size="16" /><ImagePlus v-else :size="16" />
            <span class="truncate">{{ photo ? photo.name : 'Add a photo' }}</span>
          </button>
        </div>
      </section>

      <p v-if="error" class="form-error" role="alert">{{ error }}</p>

      <section v-if="type === 'vehicle'" class="form-step vehicle-report-section" aria-labelledby="vehicle-report-title">
        <h2 id="vehicle-report-title" class="form-label">Report to an authority</h2>
        <p>Choose an official complaint portal. Your OKtakRoute report is not sent to either agency automatically.</p>
        <div class="agency-options">
          <a href="https://jpj.spab.gov.my/eApps/sdmscasepool/SdmsCasePool/add.do" target="_blank" rel="noopener noreferrer">Report to JPJ</a>
          <a href="https://rmp.spab.gov.my/eApps/sdmscasepool/SdmsCasePool/add.do" target="_blank" rel="noopener noreferrer">Report to PDRM</a>
        </div>
      </section>

      <div class="form-actions">
        <button type="button" class="btn btn--light" @click="emit('cancel')">Cancel</button>
        <button type="submit" class="btn btn--brand" :disabled="isPreparing">
          <LoaderCircle v-if="isPreparing" class="spinning" :size="16" />
          <template v-else>Submit report</template>
        </button>
      </div>
    </form>

  </div>
</template>
