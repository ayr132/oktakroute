<script setup>
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { CheckCircle2, Flag, RotateCcw, X } from '@lucide/vue'
import { REPORT_TYPES } from '../data/reportTypes'

const props = defineProps({
  path: { type: Object, required: true },
  reports: { type: Array, required: true },
  canManageReports: { type: Boolean, default: false },
})

defineEmits(['close', 'report', 'resolve'])
const { t } = useI18n()

const effects = computed(() => props.reports.map((report) => REPORT_TYPES[report.type]?.effect))
const state = computed(() => {
  if (props.path.available === false || effects.value.includes('blocks-all')) return { text: t('path.unavailable'), tone: 'bad' }
  if (effects.value.includes('blocks-wheelchair')) return { text: t('path.notStepFree'), tone: 'warn' }
  return { text: t('path.clear'), tone: 'good' }
})
</script>

<template>
  <section class="sheet" :aria-label="t('path.selected')">
    <div class="sheet-head">
      <div>
        <strong>{{ path.name }}</strong>
        <span class="state-pill" :class="`state-pill--${state.tone}`">{{ state.text }}</span>
      </div>
      <button type="button" class="icon-btn" :aria-label="t('path.closeDetails')" @click="$emit('close')"><X :size="18" /></button>
    </div>

    <ul v-if="reports.length" class="mini-reports">
      <li v-for="report in reports" :key="report.id">
        <span aria-hidden="true">{{ REPORT_TYPES[report.type]?.icon }}</span>
        <span class="mini-text">
          <strong>{{ t(`types.${report.type}`) }}</strong>
          <small>{{ t(`effects.${REPORT_TYPES[report.type]?.effect}`) }}<template v-if="report.description"> · {{ report.description }}</template></small>
        </span>
        <button v-if="canManageReports" type="button" class="btn-small" @click="$emit('resolve', report)"><RotateCcw :size="13" /> {{ t('path.resolved') }}</button>
      </li>
    </ul>
    <p v-else class="sheet-note"><CheckCircle2 :size="15" /> {{ t('path.noReports') }}</p>

    <button type="button" class="btn btn--dark btn--block" @click="$emit('report', path.id)"><Flag :size="16" /> {{ t('path.reportHere') }}</button>
  </section>
</template>
