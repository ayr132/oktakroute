<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  Accessibility,
  ArrowDownRight,
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Compass,
  Heart,
  Map,
  MessageSquareText,
  Navigation,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
} from '@lucide/vue'
import DestinationInput from './components/DestinationInput.vue'
import MapView from './components/MapView.vue'
import MaintenanceStatus from './components/MaintenanceStatus.vue'
import ReportForm from './components/ReportForm.vue'
import RouteDecision from './components/RouteDecision.vue'
import { buildRoute, initialSegmentStatuses, locations } from './data/routes'
import {
  fetchReports,
  fetchStatuses,
  saveReport,
  saveStatus,
  subscribeToOkTakRoute,
  supabase,
  supabaseConfigError,
} from './data/supabase'

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch (error) {
    console.warn(`Could not load OkTakRoute ${key} from this browser.`, error)
    return fallback
  }
}

const savedStatuses = readStored('oktakroute-segment-statuses', {})
const segmentStatuses = ref({ ...initialSegmentStatuses, ...savedStatuses })
const statusReasons = ref(readStored('oktakroute-status-reasons', {}))
const storedReports = readStored('oktakroute-reports', [])
const reports = ref(Array.isArray(storedReports) ? storedReports : [])
const selectedOriginId = ref('gate')
const selectedDestinationId = ref('library')
const selectedSegmentId = ref(buildRoute('gate', 'library').segments[0].properties.id)
const isReportOpen = ref(false)
const selectedReport = ref(null)
const notice = ref('')
const activeNav = ref('Explore')
const currentYear = new Date().getFullYear()
let realtimeChannel

const originOptions = computed(() => locations.map((item) => ({ id: item.id, destination: item.name })))
const destinationOptions = computed(() => originOptions.value.filter((item) => item.id !== selectedOriginId.value))
const route = computed(() => buildRoute(selectedOriginId.value, selectedDestinationId.value, segmentStatuses.value))
const isBlocked = (item) => item.segments.some((segment) => ['maintenance', 'closed'].includes(segmentStatuses.value[segment.properties.id]))
const routeStatus = computed(() => {
  if (!route.value.accessible) return 'inaccessible'
  if (route.value.segments.some((segment) => ['maintenance', 'closed'].includes(segmentStatuses.value[segment.properties.id]))) return 'maintenance'
  return 'open'
})
const alternateRoute = computed(() => locations
  .filter((item) => item.id !== selectedOriginId.value && item.id !== selectedDestinationId.value)
  .map((item) => buildRoute(selectedOriginId.value, item.id, segmentStatuses.value))
  .find((item) => item && item.accessible && !isBlocked(item)) || null)
const statusReason = computed(() => {
  const problemSegment = route.value.segments.find((segment) => ['maintenance', 'closed'].includes(segmentStatuses.value[segment.properties.id]))
  return problemSegment
    ? statusReasons.value[problemSegment.properties.id] || problemSegment.properties.reason || 'This section is temporarily closed.'
    : route.value.reason
})
const recentReports = computed(() => reports.value.slice(0, 3))

watch(selectedOriginId, (id) => {
  if (id === selectedDestinationId.value) {
    selectedDestinationId.value = locations.find((item) => item.id !== id).id
  }
})

watch(() => route.value.segments.map((item) => item.properties.id).join(), () => {
  if (!route.value.segments.some((item) => item.properties.id === selectedSegmentId.value)) {
    selectedSegmentId.value = route.value.segments[0].properties.id
  }
})

watch(segmentStatuses, (value) => {
  try {
    localStorage.setItem('oktakroute-segment-statuses', JSON.stringify(value))
  } catch (error) {
    console.error('Could not save route statuses in this browser.', error)
    showNotice('Your update is active for this session but could not be saved.')
  }
}, { deep: true })

watch(statusReasons, (value) => {
  try {
    localStorage.setItem('oktakroute-status-reasons', JSON.stringify(value))
  } catch (error) {
    console.error('Could not save route notes in this browser.', error)
  }
}, { deep: true })

watch(reports, (value) => {
  try {
    localStorage.setItem('oktakroute-reports', JSON.stringify(value))
  } catch (error) {
    console.error('Could not save reports in this browser.', error)
    showNotice('Report submitted, but browser storage is full. Remove an older report to keep it between visits.')
  }
}, { deep: true })

onMounted(async () => {
  window.addEventListener('keydown', handleGlobalKeydown)
  if (supabaseConfigError) {
    showNotice(supabaseConfigError)
    return
  }
  if (!supabase) return

  realtimeChannel = subscribeToOkTakRoute(
    (payload) => {
      if (payload.eventType === 'DELETE') {
        delete segmentStatuses.value[payload.old.segment_id]
        delete statusReasons.value[payload.old.segment_id]
        return
      }
      const row = payload.new
      segmentStatuses.value[row.segment_id] = row.status
      if (row.reason) statusReasons.value[row.segment_id] = row.reason
      else delete statusReasons.value[row.segment_id]
    },
    (report) => {
      if (!reports.value.some((item) => item.id === report.id)) {
        reports.value.unshift(report)
      }
    },
    (status, error) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('OkTakRoute realtime connection failed.', error)
        showNotice('Live sync is unavailable; updates are saved in this browser.')
      }
    },
  )

  try {
    const [remoteStatuses, remoteReports] = await Promise.all([fetchStatuses(), fetchReports()])
    const serverIds = new Set(remoteStatuses.map((item) => item.segment_id))
    remoteStatuses.forEach((item) => {
      segmentStatuses.value[item.segment_id] = item.status
      if (item.reason) statusReasons.value[item.segment_id] = item.reason
      else delete statusReasons.value[item.segment_id]
    })
    for (const [segmentId, status] of Object.entries(segmentStatuses.value)) {
      if (!serverIds.has(segmentId)) await saveStatus(segmentId, status, statusReasons.value[segmentId] || '')
    }
    const remoteIds = new Set(remoteReports.map((item) => item.id))
    for (const report of reports.value) {
      if (!remoteIds.has(report.id)) await saveReport(report)
    }
    reports.value = [...remoteReports, ...reports.value.filter((item) => !remoteIds.has(item.id))]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30)
  } catch (error) {
    console.error('Could not load OkTakRoute data from Supabase.', error)
    showNotice('Cloud sync could not load. Local browser data is still available.')
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  if (realtimeChannel && supabase) supabase.removeChannel(realtimeChannel)
})

function handleGlobalKeydown(event) {
  if (event.key === 'Escape' && selectedReport.value) selectedReport.value = null
}

function showNotice(message) {
  notice.value = message
  window.clearTimeout(showNotice.timeout)
  showNotice.timeout = window.setTimeout(() => { notice.value = '' }, 3600)
}

function setSegmentStatus(segmentId, status) {
  segmentStatuses.value[segmentId] = status
  if (status === 'maintenance') statusReasons.value[segmentId] = 'Section marked for maintenance by a campus user.'
  else delete statusReasons.value[segmentId]
  const label = status === 'maintenance' ? 'closed for maintenance' : 'reopened'
  showNotice(`Route section ${label}.`)
  if (supabase) {
    saveStatus(segmentId, status, statusReasons.value[segmentId] || '').catch((error) => {
      console.error('Could not sync this route status with Supabase.', error)
      showNotice('Status changed here, but cloud sync failed.')
    })
  }
}

function submitReport(report) {
  reports.value.unshift(report)
  isReportOpen.value = false
  showNotice('Thanks — your route report has been added.')
  if (supabase) {
    saveReport(report).catch((error) => {
      console.error('Could not sync this report with Supabase.', error)
      showNotice('Report saved here, but cloud sync failed.')
    })
  }
}

function formatDate(value) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

function getReportOrigin(report) {
  return locations.find((location) => report.routeId?.startsWith(`${location.id}-`))?.name || 'Unknown start location'
}

function setNav(item) {
  activeNav.value = item
  if (item === 'Updates') document.getElementById('updates')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  else window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="app-frame">
    <header class="topbar">
      <a class="brand" href="#" aria-label="OkTakRoute home" @click.prevent="setNav('Explore')">
        <span class="brand-mark"><Accessibility :size="22" stroke-width="2.4" /></span>
        <span class="brand-name">oktak<span>route</span></span>
      </a>
      <nav class="top-navigation" aria-label="Main navigation">
        <button :class="{ active: activeNav === 'Explore' }" type="button" @click="setNav('Explore')"><Compass :size="17" /> Explore</button>
        <button :class="{ active: activeNav === 'Updates' }" type="button" @click="setNav('Updates')"><MessageSquareText :size="17" /> Community updates <span v-if="reports.length" class="nav-count">{{ reports.length }}</span></button>
      </nav>
      <div class="topbar-actions">
        <button class="help-button" type="button" @click="showNotice('Need help? Ask campus support at the accessibility desk.')"><CircleHelp :size="17" /><span>Help</span></button>
        <button class="avatar" type="button" aria-label="Your profile" @click="showNotice('Welcome to OkTakRoute, Alex.')">A</button>
      </div>
    </header>

    <main class="page-content">
      <section class="welcome-row">
        <div class="welcome-copy-group">
          <div class="welcome-kicker"><span class="live-indicator"></span> YOUR CAMPUS, MADE ACCESSIBLE</div>
          <h1>Every path should <span>lead somewhere.</span></h1>
          <p class="welcome-copy">Find a step-free route and get there with a little more confidence.</p>
        </div>
        <div class="campus-chip"><span class="campus-chip-icon"><Map :size="17" /></span><span><small>YOUR CAMPUS</small><strong>Gombak Campus</strong></span><ChevronRight :size="16" /></div>
      </section>

      <div class="workspace-grid">
        <aside class="planner-column">
          <section class="planner-card">
            <div class="planner-card-top">
              <div class="planner-title-icon"><Navigation :size="18" /></div>
              <div><p class="eyebrow">ROUTE PLANNER</p><h2>Where to next?</h2></div>
            </div>
            <div class="origin-destination">
              <div class="origin-row">
                <span class="location-marker location-marker--origin"><span></span></span>
                <DestinationInput :destinations="originOptions" v-model="selectedOriginId" label="Where are you starting from?" input-id="origin" />
              </div>
              <div class="route-connector"><span></span></div>
              <div class="destination-row">
                <span class="location-marker location-marker--destination"><span></span></span>
                <DestinationInput :destinations="destinationOptions" v-model="selectedDestinationId" />
              </div>
            </div>
            <RouteDecision
              :route="route"
              :status="routeStatus"
              :reason="statusReason"
              :alternate="alternateRoute"
              @select-alternate="selectedDestinationId = $event"
            />
            <div class="planner-trust"><ShieldCheck :size="15" /><span>Routes are checked by our campus community</span><Sparkles :size="14" /></div>
          </section>

          <MaintenanceStatus
            :route="route"
            :statuses="segmentStatuses"
            :selected-segment-id="selectedSegmentId"
            :route-status="routeStatus"
            @update:selected-segment-id="selectedSegmentId = $event"
            @set-status="setSegmentStatus"
          />

          <button class="report-cta" type="button" @click="isReportOpen = true">
            <span class="report-cta-icon"><Plus :size="19" /></span>
            <span><strong>See something we should know?</strong><small>Share a quick update with the community</small></span>
            <ArrowRight :size="18" />
          </button>
        </aside>

        <section class="map-column" aria-label="Selected route map">
          <div class="map-card">
            <div class="map-card-header">
              <div class="map-heading">
                <div class="map-heading-icon"><Map :size="18" /></div>
                <div><h2>Your route</h2><p>{{ route.origin }} <span>·</span> {{ route.destination }}</p></div>
              </div>
              <div class="live-pill"><span></span> LIVE STATUS</div>
            </div>
            <MapView :route="route" :statuses="segmentStatuses" :status="routeStatus" />
            <div class="map-card-footer">
              <div class="route-endpoints">
                <span class="endpoint-dot"></span><span>{{ route.origin }}</span>
                <ArrowRight class="endpoint-arrow" :size="14" />
                <span class="endpoint-dot endpoint-dot--end" :class="{ 'endpoint-dot--closed': routeStatus !== 'open' }"></span>
                <strong>{{ route.destination }}</strong>
              </div>
              <div class="verified-stamp"><ShieldCheck :size="15" /> Community verified</div>
            </div>
          </div>
          <div class="map-under-row">
            <div class="map-tip"><span><Heart :size="16" /></span><p><strong>Made for the way you move</strong><small>We prioritize step-free paths, gentle slopes &amp; smooth surfaces.</small></p></div>
            <button class="map-feedback" type="button" @click="isReportOpen = true">Improve this map <ArrowDownRight :size="14" /></button>
          </div>
        </section>
      </div>

      <section id="updates" class="updates-section">
        <div class="updates-heading">
          <div class="updates-title">
            <div class="updates-icon"><Bell :size="17" /></div>
            <div><p class="eyebrow">FROM YOUR CAMPUS</p><h2>Recent updates</h2></div>
          </div>
          <button class="updates-link" type="button" @click="showNotice(reports.length ? `${reports.length} community update${reports.length === 1 ? '' : 's'} on your campus.` : 'No community updates yet — be the first to share one.')">View all updates <ArrowRight :size="15" /></button>
        </div>

        <div v-if="recentReports.length" class="updates-list">
          <article
            v-for="report in recentReports"
            :key="report.id"
            class="update-item"
            role="button"
            tabindex="0"
            :aria-label="`View route update: ${report.reason}`"
            @click="selectedReport = report"
            @keydown.enter.prevent="selectedReport = report"
            @keydown.space.prevent="selectedReport = report"
          >
            <div class="update-rating" :class="`update-rating--${report.rating.toLowerCase()}`">{{ report.rating === 'Good' ? '😊' : report.rating === 'Bad' ? '😕' : '😐' }}</div>
            <div class="update-main">
              <div class="update-topline"><strong>{{ report.segmentName }}</strong><span class="update-route">{{ report.routeName }}</span></div>
              <p>{{ report.reason }}</p>
              <div class="update-meta"><Clock3 :size="13" /> {{ formatDate(report.createdAt) }} <span v-if="report.photoName" class="update-photo"><span>·</span> Photo attached</span></div>
            </div>
            <img v-if="report.photoData" class="update-thumbnail" :src="report.photoData" alt="Photo attached to this route report" />
            <span class="update-chevron"><ChevronRight :size="17" /></span>
          </article>
        </div>
        <div v-else class="updates-empty">
          <div class="empty-icon"><MessageSquareText :size="19" /></div>
          <div><strong>Your campus is looking good.</strong><p>There aren’t any route updates yet. Share what you notice to help someone on their way.</p></div>
          <button class="empty-action" type="button" @click="isReportOpen = true">Add an update <ArrowRight :size="15" /></button>
        </div>
      </section>

      <footer class="page-footer"><span>© {{ currentYear }} OkTakRoute</span><span>Built for a campus where everyone belongs <span class="footer-heart">♥</span></span><span><ShieldCheck :size="14" /> Accessibility first</span></footer>
    </main>

    <Transition name="preline-toast">
      <div v-if="notice" class="toast" role="status"><Check :size="16" />{{ notice }}<button type="button" aria-label="Dismiss notification" @click="notice = ''"><X :size="15" /></button></div>
    </Transition>
    <Transition name="preline-overlay">
      <ReportForm v-if="isReportOpen" :route="route" @close="isReportOpen = false" @submit="submitReport" />
    </Transition>
    <Transition name="preline-overlay">
      <div v-if="selectedReport" class="dialog-backdrop update-detail-backdrop" @click.self="selectedReport = null">
        <section class="report-dialog update-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="update-detail-title">
          <div class="dialog-heading update-detail-heading">
            <div class="dialog-icon"><MessageSquareText :size="19" /></div>
            <button class="icon-button" type="button" aria-label="Close route update details" @click="selectedReport = null"><X :size="19" /></button>
            <p class="eyebrow">CAMPUS COMMUNITY</p>
            <h2 id="update-detail-title">Route update</h2>
            <p class="dialog-subtitle">{{ selectedReport.segmentName }} · {{ selectedReport.rating }}</p>
          </div>
          <div class="update-detail-content">
            <div class="update-detail-photo">
              <img v-if="selectedReport.photoData" :src="selectedReport.photoData" :alt="selectedReport.photoName || 'Photo attached to this route update'" />
              <p v-else>No photo was attached to this update.</p>
            </div>
            <div class="update-detail-route">
              <div><span>START LOCATION</span><strong>{{ getReportOrigin(selectedReport) }}</strong></div>
              <ArrowRight class="update-detail-arrow" :size="18" />
              <div><span>DESTINATION</span><strong>{{ selectedReport.routeName }}</strong></div>
            </div>
            <div class="update-detail-field">
              <span>ISSUE</span>
              <p>{{ selectedReport.reason }}</p>
            </div>
            <div class="update-detail-field update-detail-time">
              <span>TIME REPORTED</span>
              <p><Clock3 :size="16" />{{ formatDate(selectedReport.createdAt) }}</p>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </div>
</template>
