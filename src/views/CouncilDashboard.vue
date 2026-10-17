<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RotateCcw } from '@lucide/vue'
import LogoutConfirm from '../components/LogoutConfirm.vue'
import LanguageSwitcher from '../components/LanguageSwitcher.vue'
import MapView from '../components/MapView.vue'
import PathSheet from '../components/PathSheet.vue'
import { REPORT_STATUS, REPORT_TYPES } from '../data/reportTypes'
import { pathsById } from '../services/routingService'
import { formatDate } from '../utils/formatDate'

const props = defineProps({
  reports: { type: Array, required: true },
  syncState: { type: String, required: true },
  demoMode: { type: Boolean, default: false },
  locations: { type: Array, required: true },
  paths: { type: Array, required: true },
  restrictions: { type: Object, required: true },
  plan: { type: Object, required: true },
})

const emit = defineEmits(['resolve', 'report', 'sign-out'])
const { t } = useI18n()
const confirmingLogout = ref(false)
const statusFilter = ref('all')
const search = ref('')
const selectedPathId = ref('')
const selectedPath = computed(() => pathsById.get(selectedPathId.value) || null)
const selectedPathReports = computed(() => props.reports.filter((report) => report.pathId === selectedPathId.value && report.status === 'active'))

const visibleReports = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return props.reports.filter((report) => {
    const matchesStatus = statusFilter.value === 'all' || report.status === statusFilter.value
    if (!matchesStatus) return false
    if (!query) return true
    const pathName = pathsById.get(report.pathId)?.name || report.pathId
    const typeName = REPORT_TYPES[report.type] ? `${REPORT_TYPES[report.type].label} ${t(`types.${report.type}`)}` : report.type
    return `${pathName} ${typeName} ${report.description || ''}`.toLocaleLowerCase().includes(query)
  })
})

const activeCount = computed(() => props.reports.filter((report) => report.status === 'active').length)
const resolvedCount = computed(() => props.reports.filter((report) => report.status === 'resolved').length)

function reportPath(report) {
  return pathsById.get(report.pathId)?.name || report.pathId
}

function download(content, mimeType, extension) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `oktakroute-council-reports-${new Date().toISOString().slice(0, 10)}.${extension}`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function exportJson() {
  const data = visibleReports.value.map((report) => ({ ...report, pathName: reportPath(report) }))
  download(JSON.stringify(data, null, 2), 'application/json;charset=utf-8', 'json')
}

function exportCsv() {
  const columns = [
    ['report_id', (report) => report.id],
    ['path_id', (report) => report.pathId],
    ['path_name', reportPath],
    ['issue_type', (report) => REPORT_TYPES[report.type]?.label || report.type],
    ['description', (report) => report.description || ''],
    ['status', (report) => report.status],
    ['reported_at', (report) => report.reportedAt],
    ['expires_at', (report) => report.expiresAt || ''],
    ['resolved_at', (report) => report.resolvedAt || ''],
    ['verification', (report) => report.verification || ''],
    ['confirmations', (report) => report.confirmations ?? 0],
  ]
  const quote = (value) => {
    const text = String(value)
    const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text
    return `"${safeText.replaceAll('"', '""')}"`
  }
  const rows = [
    columns.map(([header]) => quote(header)).join(','),
    ...visibleReports.value.map((report) => columns.map(([, value]) => quote(value(report))).join(',')),
  ]
  download(`\uFEFF${rows.join('\r\n')}`, 'text/csv;charset=utf-8', 'csv')
}
</script>

<template>
  <main class="page council-dashboard">
    <div class="council-lang"><LanguageSwitcher /></div>
    <header class="page-head">
      <p class="dashboard-eyebrow">Majlis Perbandaran Selayang</p>
      <h1>{{ t('council.title') }}</h1>
      <p>{{ t('council.subtitle') }}</p>
      <p v-if="demoMode" class="demo-auth-notice">{{ t('council.demoNotice') }}</p>
    </header>

    <section class="dashboard-summary" :aria-label="t('council.summary')">
      <article class="dashboard-stat">
        <span>{{ t('council.activeReports') }}</span>
        <strong>{{ activeCount }}</strong>
      </article>
      <article class="dashboard-stat">
        <span>{{ t('council.resolvedReports') }}</span>
        <strong>{{ resolvedCount }}</strong>
      </article>
      <article class="dashboard-stat">
        <span>{{ t('council.totalReports') }}</span>
        <strong>{{ reports.length }}</strong>
      </article>
    </section>

    <p class="dashboard-sync" :class="`dashboard-sync--${syncState}`" role="status">
      <span aria-hidden="true"></span>
      <template v-if="syncState === 'live'">{{ t('council.syncLive') }}</template>
      <template v-else-if="syncState === 'connecting'">{{ t('council.syncConnecting') }}</template>
      <template v-else>{{ t('council.syncLocal') }}</template>
    </p>

    <section class="council-map-section" :aria-label="t('council.mapSection')">
      <div class="council-map">
        <MapView
          pick-mode
          :locations="locations"
          :paths="paths"
          :restrictions="restrictions"
          :plan="plan"
          :selected-path-id="selectedPathId"
          @select-path="selectedPathId = $event"
        />
      </div>
      <PathSheet
        v-if="selectedPath"
        :path="selectedPath"
        :reports="selectedPathReports"
        can-manage-reports
        @close="selectedPathId = ''"
        @report="emit('report', $event)"
        @resolve="emit('resolve', $event)"
      />
      <p v-else class="council-map-hint">{{ t('council.mapHint') }}</p>
    </section>

    <section class="dashboard-panel">
      <div class="dashboard-toolbar">
        <label class="dashboard-search">
          <span class="sr-only">{{ t('council.searchLabel') }}</span>
          <input v-model="search" type="search" :placeholder="t('council.searchPlaceholder')" />
        </label>
        <label class="dashboard-filter">
          <span class="sr-only">{{ t('council.filterLabel') }}</span>
          <select v-model="statusFilter">
            <option value="all">{{ t('council.allStatuses') }}</option>
            <option value="active">{{ t('status.active') }}</option>
            <option value="resolved">{{ t('status.resolved') }}</option>
            <option value="expired">{{ t('status.expired') }}</option>
          </select>
        </label>
        <div class="dashboard-export">
          <button type="button" class="btn btn--light" @click="exportCsv">{{ t('council.exportCsv') }}</button>
          <button type="button" class="btn btn--light" @click="exportJson">{{ t('council.exportJson') }}</button>
        </div>
      </div>

      <p class="dashboard-result-count">{{ t(visibleReports.length === 1 ? 'council.reportOne' : 'council.reportMany', { n: visibleReports.length }) }}</p>
      <div v-if="visibleReports.length" class="dashboard-table-wrap">
        <table class="dashboard-table">
          <thead>
            <tr>
              <th scope="col">{{ t('council.colIssue') }}</th>
              <th scope="col">{{ t('council.colPath') }}</th>
              <th scope="col">{{ t('council.colDetails') }}</th>
              <th scope="col">{{ t('council.colReported') }}</th>
              <th scope="col">{{ t('council.colStatus') }}</th>
              <th scope="col">{{ t('council.colAction') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="report in visibleReports" :key="report.id">
              <td :data-label="t('council.colIssue')">
                <span class="dashboard-issue">
                  <span aria-hidden="true">{{ REPORT_TYPES[report.type]?.icon || '⚠️' }}</span>
                  {{ REPORT_TYPES[report.type] ? t(`types.${report.type}`) : report.type }}
                </span>
              </td>
              <td :data-label="t('council.colPath')">{{ reportPath(report) }}</td>
              <td :data-label="t('council.colDetails')" class="dashboard-details">{{ report.description || t('council.noDetails') }}</td>
              <td :data-label="t('council.colReported')">{{ formatDate(report.reportedAt) }}</td>
              <td :data-label="t('council.colStatus')">
                <span class="status-badge" :class="REPORT_STATUS[report.status]?.classes">{{ REPORT_STATUS[report.status] ? t(`status.${report.status}`) : report.status }}</span>
              </td>
              <td :data-label="t('council.colAction')">
                <button v-if="report.status === 'active'" type="button" class="btn-small" @click="emit('resolve', report)"><RotateCcw :size="13" /> {{ t('updates.markResolved') }}</button>
                <span v-else class="muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="dashboard-empty">{{ t('council.noMatch') }}</div>
    </section>

    <p class="dashboard-disclaimer">{{ t('council.disclaimer') }}</p>
    <button type="button" class="btn btn--danger btn--block council-logout" @click="confirmingLogout = true">{{ t('profile.logOut') }}</button>
    <LogoutConfirm v-if="confirmingLogout" @confirm="emit('sign-out')" @cancel="confirmingLogout = false" />
  </main>
</template>
