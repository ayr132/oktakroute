<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Check, X } from '@lucide/vue'
import BottomNav from './components/BottomNav.vue'
import MapPage from './views/MapPage.vue'
import ReportPage from './views/ReportPage.vue'
import UpdatesPage from './views/UpdatesPage.vue'
import LoginPage from './views/LoginPage.vue'
import CouncilDashboard from './views/CouncilDashboard.vue'
import { fetchReports, saveReport, subscribeToReports, supabase, supabaseConfigError } from './data/supabase'
import { effectiveStatus, loadReports, pathRestrictions, resolveReport, saveReports } from './services/reportService'
import { locations, paths, planRoute } from './services/routingService'

const VIEWS = ['map', 'report', 'updates', 'council', 'login']
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
const syncState = ref('local')
const PROFILE_MODE_KEY = 'oktakroute-profile-mode'
const citizenEmail = ref('')
const profileMode = ref(readProfileMode())
const councilAuthenticated = ref(false)
const demoCouncilSession = ref(false)
const authReady = ref(!supabase)
let realtimeChannel
let authSubscription
let clock

const restrictions = computed(() => pathRestrictions(reports.value, now.value))
const plan = computed(() => planRoute(originId.value, destinationId.value, { restrictions: restrictions.value }))
const isCouncilMode = computed(() => (councilAuthenticated.value || demoCouncilSession.value) && profileMode.value === 'council')
const reportRows = computed(() => reports.value
  .map((report) => ({ ...report, status: effectiveStatus(report, now.value) }))
  .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()))
const resolvedCount = computed(() => reportRows.value.filter((report) => report.status === 'resolved').length)
const activeCount = computed(() => reportRows.value.filter((report) => report.status === 'active').length)

watch(reports, (value) => {
  if (!saveReports(value)) showNotice('Your report is active for this session but could not be saved in this browser.')
}, { deep: true })

function readProfileMode() {
  try {
    return localStorage.getItem(PROFILE_MODE_KEY) === 'council' ? 'council' : 'oku'
  } catch {
    return 'oku'
  }
}

function saveProfileMode(mode) {
  profileMode.value = mode
  try {
    localStorage.setItem(PROFILE_MODE_KEY, mode)
  } catch (error) {
    console.error('Could not save the profile role in this browser.', error)
    showNotice('Profile role changed for this session but could not be saved.')
  }
}

function onCouncilAuthenticated(authType = 'supabase') {
  demoCouncilSession.value = authType === 'demo'
  councilAuthenticated.value = authType !== 'demo'
  saveProfileMode('council')
  go('council')
}

function onCouncilSignOut() {
  councilAuthenticated.value = false
  demoCouncilSession.value = false
  saveProfileMode('oku')
  go('map')
}

async function citizenSignOut() {
  citizenEmail.value = ''
  if (supabase) await supabase.auth.signOut()
}

function go(next, pathId = '') {
  if (next === 'council' && !isCouncilMode.value) {
    showNotice('Choose Council staff and sign in from your profile to continue.')
    return
  }
  if (next === 'report') reportPathId.value = pathId || selectedPathId.value
  view.value = next
  if (window.location.hash !== `#/${next}`) window.location.hash = `/${next}`
  window.scrollTo({ top: 0 })
}

const onHashChange = () => {
  const next = readHash()
  if (next === 'council' && authReady.value && !isCouncilMode.value) {
    go('map')
    showNotice('Council dashboard access requires a verified council account.')
    return
  }
  view.value = next
}

onMounted(async () => {
  window.addEventListener('hashchange', onHashChange)
  clock = window.setInterval(() => { now.value = Date.now() }, 30000)
  if (supabaseConfigError) {
    showNotice(supabaseConfigError)
    if (view.value === 'council') {
      view.value = 'map'
      window.location.hash = '/map'
    }
    return
  }
  if (!supabase) {
    authReady.value = true
    if (view.value === 'council') {
      view.value = 'map'
      window.location.hash = '/map'
    }
    return
  }

  const auth = supabase.auth.onAuthStateChange((_event, session) => {
    citizenEmail.value = session?.user?.app_metadata?.role === 'council' ? '' : session?.user?.email || ''
    councilAuthenticated.value = session?.user?.app_metadata?.role === 'council'
    if (authReady.value && !isCouncilMode.value && view.value === 'council') go('map')
  })
  authSubscription = auth.data.subscription
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    councilAuthenticated.value = data.session?.user?.app_metadata?.role === 'council'
    citizenEmail.value = councilAuthenticated.value ? '' : data.session?.user?.email || ''
  } catch (error) {
    console.error('Could not restore the council authentication session.', error)
    showNotice('Council sign-in could not be verified. Please sign in again.')
  } finally {
    authReady.value = true
  }
  if (view.value === 'council' && !isCouncilMode.value) {
    view.value = 'map'
    window.location.hash = '/map'
    showNotice('Council dashboard access requires a verified council account.')
  }

  syncState.value = 'connecting'
  realtimeChannel = subscribeToReports(mergeReport, (status, error) => {
    if (status === 'SUBSCRIBED') syncState.value = 'live'
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      syncState.value = 'local'
      console.error('OKtakRoute realtime connection failed.', error)
      showNotice('Live sync is unavailable; reports are saved in this browser.')
    }
    if (status === 'CLOSED') syncState.value = 'local'
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
  authSubscription?.unsubscribe()
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
  if (!isCouncilMode.value) {
    showNotice('Only signed-in council staff can mark reports resolved.')
    return
  }
  const resolved = resolveReport(reports.value.find((item) => item.id === report.id) || report)
  mergeReport(resolved)
  showNotice('Marked as resolved. Routes can use this path again.')
  if (supabase && !demoCouncilSession.value && !resolved.id.startsWith('report-seed-')) {
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
      :citizen-email="citizenEmail"
      :profile-mode="profileMode"
      :council-authenticated="councilAuthenticated"
      :demo-council-session="demoCouncilSession"
      :can-manage-reports="isCouncilMode"
      :active-count="activeCount"
      :resolved-count="resolvedCount"
      @report="go('report', $event)"
      @resolve="resolve"
      @login="go('login')"
      @citizen-sign-out="citizenSignOut"
      @select-profile-mode="saveProfileMode"
      @council-authenticated="onCouncilAuthenticated"
      @council-sign-out="onCouncilSignOut"
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
    <LoginPage v-else-if="view === 'login'" @done="go('map')" @cancel="go('map')" />
    <UpdatesPage
      v-else-if="view === 'updates'"
      :reports="reportRows"
      :can-manage-reports="isCouncilMode"
      @resolve="resolve"
      @view-on-map="viewOnMap"
      @report="go('report')"
    />
    <CouncilDashboard
      v-else-if="view === 'council' && isCouncilMode"
      :reports="reportRows"
      :sync-state="syncState"
      :demo-mode="demoCouncilSession"
      :locations="locations"
      :paths="paths"
      :restrictions="restrictions"
      :plan="plan"
      @resolve="resolve"
      @report="go('report', $event)"
    />

    <BottomNav v-if="view !== 'login'" :view="view" :active-count="activeCount" @go="go" />

    <Transition name="toast">
      <div v-if="notice" class="toast" role="status"><Check :size="16" />{{ notice }}<button type="button" aria-label="Dismiss notification" @click="notice = ''"><X :size="15" /></button></div>
    </Transition>
  </div>
</template>
