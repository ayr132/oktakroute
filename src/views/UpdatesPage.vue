<script setup>
import { computed, ref } from 'vue'
import { ChevronDown, Clock3, MapPin, RotateCcw } from '@lucide/vue'
import { EFFECT_LABELS, REPORT_STATUS, REPORT_TYPES } from '../data/reportTypes'
import { pathsById } from '../services/routingService'
import { formatDate } from '../utils/formatDate'

const props = defineProps({
  reports: { type: Array, required: true },
})

defineEmits(['resolve', 'view-on-map', 'report'])

const tab = ref('active')
const openId = ref('')
const activeCount = computed(() => props.reports.filter((report) => report.status === 'active').length)
const visible = computed(() => (tab.value === 'active' ? props.reports.filter((report) => report.status === 'active') : props.reports))
const pathName = (report) => pathsById.get(report.pathId)?.name || report.pathId
</script>

<template>
  <div class="page">
    <header class="page-head">
      <h1>Updates</h1>
      <p>What the community is reporting on campus paths.</p>
    </header>

    <div class="tabs" role="tablist">
      <button type="button" role="tab" :aria-selected="tab === 'active'" :class="{ active: tab === 'active' }" @click="tab = 'active'">Active <span>{{ activeCount }}</span></button>
      <button type="button" role="tab" :aria-selected="tab === 'all'" :class="{ active: tab === 'all' }" @click="tab = 'all'">All <span>{{ reports.length }}</span></button>
    </div>

    <ul v-if="visible.length" class="update-list">
      <li v-for="report in visible" :key="report.id" class="update-card">
        <button type="button" class="update-row" :aria-expanded="openId === report.id" @click="openId = openId === report.id ? '' : report.id">
          <span class="update-icon" aria-hidden="true">{{ REPORT_TYPES[report.type]?.icon || '⚠️' }}</span>
          <span class="update-body">
            <strong>{{ REPORT_TYPES[report.type]?.label || report.type }}</strong>
            <small>{{ pathName(report) }} · {{ formatDate(report.reportedAt) }}</small>
          </span>
          <span class="status-badge" :class="REPORT_STATUS[report.status]?.classes">{{ REPORT_STATUS[report.status]?.label }}</span>
          <ChevronDown class="chevron" :class="{ open: openId === report.id }" :size="18" />
        </button>

        <div v-if="openId === report.id" class="update-detail">
          <p v-if="report.description">{{ report.description }}</p>
          <p v-else class="muted">No extra details were added.</p>
          <img v-if="report.photos?.[0]" :src="report.photos[0]" alt="Photo attached to this report" />
          <dl>
            <div><dt>Effect on routes</dt><dd>{{ EFFECT_LABELS[REPORT_TYPES[report.type]?.effect] }}</dd></div>
            <div>
              <dt>{{ report.status === 'resolved' ? 'Resolved' : 'Expires' }}</dt>
              <dd><Clock3 :size="13" /> {{ report.status === 'resolved' ? formatDate(report.resolvedAt) : report.expiresAt ? formatDate(report.expiresAt) : 'When resolved' }}</dd>
            </div>
          </dl>
          <div class="update-actions">
            <button type="button" class="btn btn--light" @click="$emit('view-on-map', report.pathId)"><MapPin :size="15" /> View on map</button>
            <button v-if="report.status === 'active'" type="button" class="btn btn--dark" @click="$emit('resolve', report)"><RotateCcw :size="15" /> Mark resolved</button>
          </div>
        </div>
      </li>
    </ul>

    <div v-else class="empty">
      <span aria-hidden="true">✅</span>
      <strong>{{ tab === 'active' ? 'All paths are clear' : 'No reports yet' }}</strong>
      <p>Spotted a problem? Let others know so they can avoid it.</p>
      <button type="button" class="btn btn--brand" @click="$emit('report')">Report an issue</button>
    </div>
  </div>
</template>
