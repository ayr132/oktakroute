<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ArrowUpDown, Accessibility, User } from '@lucide/vue'
import MapView from '../components/MapView.vue'
import PathSheet from '../components/PathSheet.vue'
import ProfilePopup from '../components/ProfilePopup.vue'
import PlaceField from '../components/PlaceField.vue'
import RouteSheet from '../components/RouteSheet.vue'
import { pathsById } from '../services/routingService'

const props = defineProps({
  plan: { type: Object, required: true },
  locations: { type: Array, required: true },
  paths: { type: Array, required: true },
  restrictions: { type: Object, required: true },
  reports: { type: Array, required: true },
  citizenEmail: { type: String, default: '' },
  profileMode: { type: String, default: 'oku' },
  councilAuthenticated: { type: Boolean, default: false },
  demoCouncilSession: { type: Boolean, default: false },
  activeCount: { type: Number, default: 0 },
  resolvedCount: { type: Number, default: 0 },
  canManageReports: { type: Boolean, default: false },
})

defineEmits(['report', 'resolve', 'login', 'citizen-sign-out', 'select-profile-mode', 'council-authenticated', 'council-sign-out'])
const originId = defineModel('originId', { type: String, required: true })
const destinationId = defineModel('destinationId', { type: String, required: true })
const selectedPathId = defineModel('selectedPathId', { type: String, default: '' })

// only places that sit on the walking network can be routed, so only those are offered in the lists
// the destination row shows once a start is chosen (or if a destination was swapped into place)
const showDestination = computed(() => Boolean(originId.value || destinationId.value))
const profileOpen = ref(false)
const searchablePlaces = computed(() => props.locations.filter((place) => place.connected))
const selectedPath = computed(() => pathsById.get(selectedPathId.value) || null)
const pathReports = computed(() => props.reports.filter((report) => report.pathId === selectedPathId.value && report.status === 'active'))

// The destination field slides in once a start is chosen. Overflow stays clipped
// while it animates, then opens up so the place list isn't cut off.
const destSettled = ref(false)
let swapping = false
watch(originId, async (id) => {
  destSettled.value = false
  if (!id) {
    // clearing the start starts over; swapping a lone destination into the start does not
    if (swapping) destSettled.value = Boolean(destinationId.value)
    else destinationId.value = ''
    return
  }
  await new Promise((resolve) => setTimeout(resolve, 320))
  if (originId.value !== id) return
  destSettled.value = true
})

async function swap() {
  swapping = true
  ;[originId.value, destinationId.value] = [destinationId.value, originId.value]
  await nextTick()
  swapping = false
}
</script>

<template>
  <div class="map-page">
    <MapView
      :locations="locations"
      :paths="paths"
      :restrictions="restrictions"
      :plan="plan"
      :origin-id="originId"
      :destination-id="destinationId"
      :selected-path-id="selectedPathId"
      @select-path="selectedPathId = $event"
      @set-origin="originId = $event"
      @set-destination="destinationId = $event"
    />

    <button v-if="!citizenEmail && !councilAuthenticated && !demoCouncilSession" type="button" class="profile-btn profile-btn--signin" @click="$emit('login')">Sign in</button>
    <button v-else type="button" class="profile-btn" aria-label="Open your profile" :aria-expanded="profileOpen" @click="profileOpen = !profileOpen">
      <User :size="20" /></button>

    <!-- teleported to <body> so the blurred backdrop also covers the navigation bar -->
    <Teleport to="body">
      <Transition name="pop" :duration="320">
        <ProfilePopup
          v-if="profileOpen"
          :citizen-email="citizenEmail"
          :mode="profileMode"
          :council-authenticated="councilAuthenticated"
          :demo-council-session="demoCouncilSession"
          @save="$emit('login', 'citizen-sign-out', $event)"
          @select-mode="$emit('select-profile-mode', $event)"
          @council-authenticated="$emit('council-authenticated', $event)"
          @sign-out="$emit('council-sign-out')"
          @close="profileOpen = false"
        />
      </Transition>
    </Teleport>

    <div class="search-card">
      <div class="search-brand">
        <span class="brand-mark"><Accessibility :size="18" stroke-width="2.4" /></span>
        <span class="brand-name">OKtak<span>Route</span></span>
      </div>
      <div class="search-rows">
        <div class="search-row">
          <span class="dot dot--origin" aria-hidden="true"></span>
          <PlaceField v-model="originId" :options="searchablePlaces" label="Where are you starting from?" input-id="origin" />
        </div>
        <div class="dest-collapse" :class="{ open: showDestination }" :inert="!showDestination || undefined">
          <div class="dest-inner" :class="{ settled: destSettled }">
            <div class="search-row">
              <span class="dot dot--destination" aria-hidden="true"></span>
              <PlaceField v-model="destinationId" :options="searchablePlaces" label="Where to?" input-id="destination" />
            </div>
          </div>
        </div>
      </div>
      <button type="button" class="icon-btn swap-btn" :class="{ shown: showDestination }" :inert="!showDestination || undefined" aria-label="Swap start and destination" @click="swap"><ArrowUpDown :size="18" /></button>
    </div>

    <PathSheet
      v-if="selectedPath"
      :path="selectedPath"
      :reports="pathReports"
      :can-manage-reports="canManageReports"
      @close="selectedPathId = ''"
      @report="$emit('report', $event)"
      @resolve="$emit('resolve', $event)"
    />
    <RouteSheet v-else-if="plan.status !== 'idle'" :plan="plan" />
  </div>
</template>
