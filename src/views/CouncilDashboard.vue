<script setup>
import { computed, ref } from 'vue'
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

const emit = defineEmits(['resolve', 'report'])
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
    const typeName = REPORT_TYPES[report.type]?.label || report.type
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
    <header class="page-head">
      <p class="dashboard-eyebrow">Majlis Perbandaran Selayang</p>
      <h1>Council Dashboard</h1>
      <p>Live community reports to help prioritize path repairs.</p>
      <p v-if="demoMode" class="demo-auth-notice">Local demo session: report changes are saved only in this browser and are not authorized in Supabase.</p>
    </header>

    <section class="dashboard-summary" aria-label="Report summary">
      <article class="dashboard-stat">
        <span>Active reports</span>
        <strong>{{ activeCount }}</strong>
      </article>
      <article class="dashboard-stat">
        <span>Resolved reports</span>
        <strong>{{ resolvedCount }}</strong>
      </article>
      <article class="dashboard-stat">
        <span>Total reports</span>
        <strong>{{ reports.length }}</strong>
      </article>
    </section>

    <p class="dashboard-sync" :class="`dashboard-sync--${syncState}`" role="status">
      <span aria-hidden="true"></span>
      <template v-if="syncState === 'live'">Live updates connected</template>
      <template v-else-if="syncState === 'connecting'">Connecting to live updates…</template>
      <template v-else>Live sync unavailable; showing reports saved in this browser.</template>
    </p>

    <section class="council-map-section" aria-label="Campus paths and report actions">
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
      <p v-else class="council-map-hint">Select a path on the map to review active issues, mark reports resolved, or report a new issue.</p>
    </section>

    <section class="dashboard-panel">
      <div class="dashboard-toolbar">
        <label class="dashboard-search">
          <span class="sr-only">Search reports</span>
          <input v-model="search" type="search" placeholder="Search path, issue, or details" />
        </label>
        <label class="dashboard-filter">
          <span class="sr-only">Filter reports by status</span>
          <select v-model="statusFilter">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="expired">Expired</option>
          </select>
        </label>
        <div class="dashboard-export">
          <button type="button" class="btn btn--light" @click="exportCsv">Export CSV</button>
          <button type="button" class="btn btn--light" @click="exportJson">Export JSON</button>
        </div>
      </div>

      <p class="dashboard-result-count">{{ visibleReports.length }} report{{ visibleReports.length === 1 ? '' : 's' }}</p>
      <div v-if="visibleReports.length" class="dashboard-table-wrap">
        <table class="dashboard-table">
          <thead>
            <tr>
              <th scope="col">Issue</th>
              <th scope="col">Path</th>
              <th scope="col">Details</th>
              <th scope="col">Reported</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="report in visibleReports" :key="report.id">
              <td data-label="Issue">
                <span class="dashboard-issue">
                  <span aria-hidden="true">{{ REPORT_TYPES[report.type]?.icon || '⚠️' }}</span>
                  {{ REPORT_TYPES[report.type]?.label || report.type }}
                </span>
              </td>
              <td data-label="Path">{{ reportPath(report) }}</td>
              <td data-label="Details" class="dashboard-details">{{ report.description || 'No details provided' }}</td>
              <td data-label="Reported">{{ formatDate(report.reportedAt) }}</td>
              <td data-label="Status">
                <span class="status-badge" :class="REPORT_STATUS[report.status]?.classes">{{ REPORT_STATUS[report.status]?.label || report.status }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="dashboard-empty">No reports match these filters.</div>
    </section>

    <p class="dashboard-disclaimer">Exports contain the reports currently shown after filtering. Council actions require a signed-in account provisioned with the council role.</p>
  </main>
</template>
