<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import { Info, LocateFixed, Minus, Plus } from '@lucide/vue'
import { CAMPUS_BOUNDS, CAMPUS_CENTER, DEFAULT_ZOOM, LOCATION_TYPES, MIN_ZOOM } from '../data/campusLocations'
import { blockReason } from '../services/routingService'

const props = defineProps({
  locations: { type: Array, required: true },
  paths: { type: Array, required: true },
  restrictions: { type: Object, required: true },
  plan: { type: Object, required: true },
  originId: { type: String, default: '' },
  destinationId: { type: String, default: '' },
  selectedPathId: { type: String, default: '' },
  // pick-a-road mode (report page): no place markers, tighter framing
  pickMode: { type: Boolean, default: false },
})

const emit = defineEmits(['select-path', 'set-origin', 'set-destination'])

const mapElement = ref(null)
const legendHover = ref(false)
const legendPinned = ref(false) // click/tap toggle for touch screens
const showLegend = computed(() => legendHover.value || legendPinned.value)
let map
let layers
let resizeObserver

const COLORS = { open: '#aeb3bf', closed: '#d65345', limited: '#e08a00', route: '#2d77c4', selected: '#123253' }

// red = nobody can use it, amber = blocked for wheelchairs only (routing is always step-free)
function pathState(path) {
  const reason = blockReason(path, props.restrictions, { wheelchair: true })
  if (!reason) return 'open'
  const restriction = props.restrictions.get(path.id)
  return path.available === false || restriction?.blocksAll ? 'closed' : 'limited'
}

function popupContent(location) {
  const type = LOCATION_TYPES[location.type]
  const root = document.createElement('div')
  root.className = 'loc-popup'
  const title = document.createElement('strong')
  title.textContent = location.name
  const sub = document.createElement('span')
  sub.textContent = type?.label || 'Place'
  root.append(title, sub)
  if (!location.connected) {
    const note = document.createElement('em')
    note.textContent = 'Not on the walking path yet'
    const whyLink = document.createElement('a')
    whyLink.className = 'why-link'
    whyLink.href = '#location-network-reason'
    whyLink.textContent = 'see why'
    whyLink.setAttribute('aria-expanded', 'false')
    const reason = document.createElement('span')
    reason.id = 'location-network-reason'
    reason.className = 'loc-popup-reason'
    reason.hidden = true
    reason.textContent = 'This location is not connected to a mapped walking path, so a step-free route cannot be planned to or from it yet.'
    whyLink.addEventListener('click', (event) => {
      event.preventDefault()
      reason.hidden = !reason.hidden
      whyLink.setAttribute('aria-expanded', String(!reason.hidden))
    })
    root.append(note, whyLink, reason)
    return root
  }
  const actions = document.createElement('div')
  for (const [label, event] of [['Start here', 'set-origin'], ['Go here', 'set-destination']]) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    button.addEventListener('click', () => {
      emit(event, location.id)
      map?.closePopup()
    })
    actions.append(button)
  }
  root.append(actions)
  return root
}

function pinIcon(location) {
  const type = LOCATION_TYPES[location.type] || { icon: '📍', color: '#475569' }
  const classes = ['loc-pin']
  if (!location.connected) classes.push('loc-pin--unmapped')
  if (location.id === props.originId) classes.push('loc-pin--origin')
  if (location.id === props.destinationId) classes.push('loc-pin--destination')
  return L.divIcon({
    className: 'loc-icon',
    html: `<div class="${classes.join(' ')}" style="--pin:${type.color}"><span>${type.icon}</span></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -18],
  })
}

function draw() {
  if (!map) return
  layers?.remove()
  layers = L.layerGroup().addTo(map)
  // a blocked route is still shown (blue), with the reported sections drawn in red
  const shownRoute = props.plan.route || props.plan.previewRoute
  const routeIds = new Set(shownRoute?.pathIds || [])

  for (const path of props.paths) {
    const state = pathState(path)
    const onRoute = routeIds.has(path.id)
    if (path.id === props.selectedPathId) {
      L.polyline(path.coordinates, { color: COLORS.selected, weight: 14, opacity: 0.28, interactive: false, lineCap: 'round' }).addTo(layers)
    }
    L.polyline(path.coordinates, { color: '#fff', weight: onRoute ? 11 : 9, opacity: 1, interactive: false, lineCap: 'round' }).addTo(layers)
    L.polyline(path.coordinates, {
      color: onRoute && state === 'open' ? COLORS.route : COLORS[state],
      weight: onRoute ? 7 : 5,
      opacity: 0.96,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: state === 'open' ? null : '8 9',
      bubblingMouseEvents: false,
    })
      .bindTooltip(`${path.name}${state === 'open' ? '' : state === 'closed' ? ' · unavailable' : ' · not step-free'}`, { sticky: true })
      .on('click', () => emit('select-path', path.id))
      .addTo(layers)
  }

  // short dashed leg between a place's door and the nearest path node
  for (const leg of shownRoute?.accessLegs || []) {
    L.polyline(leg, { color: COLORS.route, weight: 4, opacity: 0.9, dashArray: '2 7', lineCap: 'round', interactive: false }).addTo(layers)
  }

  for (const location of props.pickMode ? [] : props.locations) {
    L.marker([location.latitude, location.longitude], { icon: pinIcon(location), keyboard: true, title: location.name, zIndexOffset: location.connected ? 500 : 0 })
      .bindPopup(() => popupContent(location), { closeButton: false, offset: [0, 4] })
      .addTo(layers)
  }
}

// animate=true glides to the new view (slow, smooth fly); false jumps straight there (first load)
function fitToSelection(animate = true) {
  if (!map) return
  const route = props.plan.route || props.plan.previewRoute
  let points = route?.coordinates?.length
    ? route.coordinates
    : [props.plan.origin, props.plan.destination].filter(Boolean).map((place) => [place.latitude, place.longitude])
  // nothing chosen yet: frame the whole walking network
  if (!points.length) points = props.paths.flatMap((path) => path.coordinates)
  if (!points.length) return
  const bounds = L.latLngBounds(points)
  if (props.pickMode) {
    map.fitBounds(bounds, { animate: false, maxZoom: 19, padding: [24, 24] })
    return
  }
  // on the main map, leave room for the floating search card (top) and the sheet + nav bar (bottom)
  const view = { maxZoom: 19, paddingTopLeft: [40, 240], paddingBottomRight: [40, 230] }
  if (animate) map.flyToBounds(bounds, { ...view, duration: 1.1, easeLinearity: 0.25 })
  else map.fitBounds(bounds, { ...view, animate: false })
}

const zoomIn = () => map?.zoomIn()
const zoomOut = () => map?.zoomOut()

onMounted(async () => {
  await nextTick()
  map = L.map(mapElement.value, {
    zoomControl: false,
    scrollWheelZoom: !props.pickMode, // the small picker on the Report page lets the page scroll instead
    wheelPxPerZoomLevel: 120, // gentler than the default (60), about one zoom level per two wheel notches
    attributionControl: false,
    minZoom: MIN_ZOOM,
    maxBounds: CAMPUS_BOUNDS,
    maxBoundsViscosity: 1, // hard stop at the edge instead of a rubber band
  })
    .setView([CAMPUS_CENTER.latitude, CAMPUS_CENTER.longitude], DEFAULT_ZOOM)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)
  L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map)
  draw()
  fitToSelection(false)
  setTimeout(() => {
    map?.invalidateSize()
    fitToSelection(false)
  }, 100)
  resizeObserver = new ResizeObserver(() => map?.invalidateSize())
  resizeObserver.observe(mapElement.value)
})

watch(() => [props.plan, props.restrictions, props.selectedPathId, props.originId, props.destinationId], draw)
watch(() => [props.originId, props.destinationId], () => fitToSelection(true), { flush: 'post' })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  map?.remove()
  map = undefined
})
</script>

<template>
  <div class="map-shell">
    <div ref="mapElement" class="leaflet-map" role="application" aria-label="Campus map with walking paths and places"></div>
    <div class="map-tools">
    <div class="map-controls" aria-label="Map controls">
      <button type="button" aria-label="Zoom in" @click="zoomIn"><Plus :size="18" /></button>
      <button type="button" aria-label="Zoom out" @click="zoomOut"><Minus :size="18" /></button>
      <button type="button" aria-label="Fit route to map" @click="fitToSelection(true)"><LocateFixed :size="17" /></button>
      <div class="legend-wrap" @mouseenter="legendHover = true" @mouseleave="legendHover = false">
        <button type="button" aria-label="Map legend" :aria-expanded="showLegend" @click="legendPinned = !legendPinned" @focus="legendHover = true" @blur="legendHover = false"><Info :size="17" /></button>
        <div v-if="showLegend" class="map-legend">
        <span><i class="legend-line legend-line--route"></i> Your route</span>
        <span><i class="legend-line legend-line--open"></i> Path</span>
        <span><i class="legend-line legend-line--closed"></i> Unavailable</span>
        <span><i class="legend-line legend-line--limited"></i> Not step-free</span>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>
