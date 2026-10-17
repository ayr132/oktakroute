<script setup>
import { computed } from 'vue'
import { CheckCircle2, Flag, RotateCcw, X } from '@lucide/vue'
import { EFFECT_LABELS, REPORT_TYPES } from '../data/reportTypes'

const props = defineProps({
  path: { type: Object, required: true },
  reports: { type: Array, required: true },
  canManageReports: { type: Boolean, default: false },
})

defineEmits(['close', 'report', 'resolve'])

const effects = computed(() => props.reports.map((report) => REPORT_TYPES[report.type]?.effect))
const state = computed(() => {
  if (props.path.available === false || effects.value.includes('blocks-all')) return { text: 'Unavailable', tone: 'bad' }
  if (effects.value.includes('blocks-wheelchair')) return { text: 'Not step-free', tone: 'warn' }
  return { text: 'Clear', tone: 'good' }
})
</script>

<template>
  <section class="sheet" aria-label="Selected path">
    <div class="sheet-head">
      <div>
        <strong>{{ path.name }}</strong>
        <span class="state-pill" :class="`state-pill--${state.tone}`">{{ state.text }}</span>
      </div>
      <button type="button" class="icon-btn" aria-label="Close path details" @click="$emit('close')"><X :size="18" /></button>
    </div>

    <ul v-if="reports.length" class="mini-reports">
      <li v-for="report in reports" :key="report.id">
        <span aria-hidden="true">{{ REPORT_TYPES[report.type]?.icon }}</span>
        <span class="mini-text">
          <strong>{{ REPORT_TYPES[report.type]?.label }}</strong>
          <small>{{ EFFECT_LABELS[REPORT_TYPES[report.type]?.effect] }}<template v-if="report.description"> · {{ report.description }}</template></small>
        </span>
        <button v-if="canManageReports" type="button" class="btn-small" @click="$emit('resolve', report)"><RotateCcw :size="13" /> Resolved</button>
      </li>
    </ul>
    <p v-else class="sheet-note"><CheckCircle2 :size="15" /> No active reports on this path.</p>

    <button type="button" class="btn btn--dark btn--block" @click="$emit('report', path.id)"><Flag :size="16" /> Report an issue here</button>
  </section>
</template>
