<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Check, X } from '@lucide/vue'
import BottomNav from './components/BottomNav.vue'
import MapPage from './views/MapPage.vue'
import ReportPage from './views/ReportPage.vue'
import UpdatesPage from './views/UpdatesPage.vue'
import { fetchReports, saveReport, subscribeToReports, supabase, supabaseConfigError } from './data/supabase'
import { effectiveStatus, loadReports, pathRestrictions, resolveReport, saveReports } from './services/reportService'
import { locations, paths, planRoute } from './services/routingService'

const VIEWS = ['map', 'report', 'updates']
const readHash = () => {
  const view = window.location.hash.replace(/^#\/?/, '')
  return VIEWS.includes(view) ? view : 'map'
}

const view = ref(readHash())
const reports = ref(loadReports())
const now = ref(Date.now())
const originId = ref('')
const destinationId = ref('')
const selectedPathId = ref('')
const reportPathId = ref('')
const notice = ref('')
const PROFILE_KEY = 'oktakroute-profile-name'
const profileName = ref(readProfileName())
let realtimeChannel
let clock

const restrictions = computed(() => pathRestrictions(reports.value, now.value))
const plan = computed(() => planRoute(originId.value, destinationId.value, { restrictions: restrictions.value }))
const reportRows = computed(() => reports.value
  .map((report) => ({ ...report, status: effectiveStatus(report, now.value) }))
  .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()))
const resolvedCount = computed(() => reportRows.value.filter((report) => report.status === 'resolved').length)
const activeCount = computed(() => reportRows.value.filter((report) => report.status === 'active').length)

watch(reports, (value) => {
  if (!saveReports(value)) showNotice('Your report is active for this session but could not be saved in this browser.')
}, { deep: true })

function readProfileName() {
  try {
    return localStorage.getItem(PROFILE_KEY) || ''
  } catch {
    return ''
  }
}

function saveProfile(name) {
  profileName.value = name
  try {
    localStorage.setItem(PROFILE_KEY, name)
  } catch (error) {
    console.error('Could not save the profile in this browser.', error)
    showNotice('Profile updated for this session but could not be saved.')
  }
}

function go(next, pathId = '') {
  if (next === 'report') reportPathId.value = pathId || selectedPathId.value
  view.value = next
  if (window.location.hash !== `#/${next}`) window.location.hash = `/${next}`
  window.scrollTo({ top: 0 })
}

const onHashChange = () => { view.value = readHash() }

onMounted(async () => {
  window.addEventListener('hashchange', onHashChange)
  clock = window.setInterval(() => { now.value = Date.now() }, 30000)
  if (supabaseConfigError) {
    showNotice(supabaseConfigError)
    return
  }
  if (!supabase) return

  realtimeChannel = subscribeToReports(mergeReport, (status, error) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.error('OKtakRoute realtime connection failed.', error)
      showNotice('Live sync is unavailable; reports are saved in this browser.')
    }
  })

  try {
    const remote = await fetchReports()
    const remoteById = new Map(remote.map((report) => [report.id, report]))
    for (const report of reports.value) {
      if (report.id.startsWith('report-seed-')) continue
      const counterpart = remoteById.get(report.id)
      // push reports the server has never seen, and local resolutions it doesn't know about yet
      if (!counterpart || (report.status === 'resolved' && counterpart.status === 'active')) await saveReport(report)
      else mergeReport(counterpart)
    }
    remote.filter((report) => !reports.value.some((item) => item.id === report.id)).forEach(mergeReport)
  } catch (error) {
    console.error('Could not load OKtakRoute data from Supabase.', error)
    showNotice('Cloud sync could not load. Local browser data is still available.')
  }
})

onUnmounted(() => {
  window.removeEventListener('hashchange', onHashChange)
  window.clearInterval(clock)
  if (realtimeChannel && supabase) supabase.removeChannel(realtimeChannel)
})

function showNotice(message) {
  notice.value = message
  window.clearTimeout(showNotice.timeout)
  showNotice.timeout = window.setTimeout(() => { notice.value = '' }, 3600)
}

function mergeReport(report) {
  const index = reports.value.findIndex((item) => item.id === report.id)
  if (index === -1) reports.value.unshift(report)
  else reports.value[index] = report
}

function submitReport(report) {
  reports.value.unshift(report)
  selectedPathId.value = report.pathId
  showNotice('Thanks — your report is live and routes have been updated.')
  go('updates')
  if (supabase) {
    saveReport(report).catch((error) => {
      console.error('Could not sync this report with Supabase.', error)
      showNotice('Report saved here, but cloud sync failed.')
    })
  }
}

function resolve(report) {
  const resolved = resolveReport(reports.value.find((item) => item.id === report.id) || report)
  mergeReport(resolved)
  showNotice('Marked as resolved. Routes can use this path again.')
  if (supabase && !resolved.id.startsWith('report-seed-')) {
    saveReport(resolved).catch((error) => {
      console.error('Could not sync this resolution with Supabase.', error)
      showNotice('Resolved here, but cloud sync failed.')
    })
  }
}

function viewOnMap(pathId) {
  selectedPathId.value = pathId
  go('map')
}
</script>

<template>
  <div class="app">
    <MapPage
      v-show="view === 'map'"
      v-model:origin-id="originId"
      v-model:destination-id="destinationId"
      v-model:selected-path-id="selectedPathId"
      :plan="plan"
      :locations="locations"
      :paths="paths"
      :restrictions="restrictions"
      :reports="reportRows"
      :profile-name="profileName"
      :active-count="activeCount"
      :resolved-count="resolvedCount"
      @report="go('report', $event)"
      @resolve="resolve"
      @save-profile="saveProfile"
    />
    <ReportPage
      v-if="view === 'report'"
      :paths="paths"
      :locations="locations"
      :plan="plan"
      :restrictions="restrictions"
      :initial-path-id="reportPathId"
      @submit="submitReport"
      @cancel="go('map')"
    />
    <UpdatesPage
      v-else-if="view === 'updates'"
      :reports="reportRows"
      @resolve="resolve"
      @view-on-map="viewOnMap"
      @report="go('report')"
    />

    <BottomNav :view="view" :active-count="activeCount" @go="go" />

    <Transition name="toast">
      <div v-if="notice" class="toast" role="status"><Check :size="16" />{{ notice }}<button type="button" aria-label="Dismiss notification" @click="notice = ''"><X :size="15" /></button></div>
    </Transition>
  </div>
</template>
