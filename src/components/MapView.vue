<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import { LocateFixed, Minus, Plus } from '@lucide/vue'

const props = defineProps({
  route: { type: Object, required: true },
  statuses: { type: Object, required: true },
  status: { type: String, required: true },
})

const mapElement = ref(null)
let map
let routeLayer
let markersLayer

function drawRoute() {
  if (!map || !props.route) return

  routeLayer?.remove()
  markersLayer?.remove()
  routeLayer = L.layerGroup().addTo(map)
  markersLayer = L.layerGroup().addTo(map)

  props.route.segments.forEach((segment, index) => {
    const state = props.status === 'inaccessible'
      ? 'closed'
      : (props.statuses[segment.properties.id] || segment.properties.status)
    const points = segment.geometry.coordinates.map(([lng, lat]) => [lat, lng])
    L.polyline(points, {
      color: state === 'open' ? '#2d77c4' : '#d65345',
      weight: 7,
      opacity: state === 'open' ? 0.95 : 0.9,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: state === 'open' ? null : '9 10',
    }).addTo(routeLayer)

    if (index > 0) {
      L.circleMarker(points[0], {
        radius: 5,
        color: '#fff',
        weight: 3,
        fillColor: state === 'open' ? '#2d77c4' : '#d65345',
        fillOpacity: 1,
      }).addTo(markersLayer)
    }
  })

  const first = props.route.segments[0].geometry.coordinates[0]
  const lastSegment = props.route.segments[props.route.segments.length - 1]
  const last = lastSegment.geometry.coordinates[lastSegment.geometry.coordinates.length - 1]
  const start = [first[1], first[0]]
  const end = [last[1], last[0]]

  L.circleMarker(start, {
    radius: 8,
    color: '#fff',
    weight: 3,
    fillColor: '#2d77c4',
    fillOpacity: 1,
  }).bindTooltip(props.route.origin, { direction: 'top', offset: [0, -8] }).addTo(markersLayer)

  L.circleMarker(end, {
    radius: 8,
    color: '#fff',
    weight: 3,
    fillColor: props.status === 'open' ? '#38b6ff' : '#d65345',
    fillOpacity: 1,
  }).bindTooltip(props.route.destination, { direction: 'top', offset: [0, -8] }).addTo(markersLayer)

  map.fitBounds(L.latLngBounds([start, end]).pad(0.35), { animate: true, maxZoom: 17 })
}

function zoomIn() {
  map?.zoomIn()
}

function zoomOut() {
  map?.zoomOut()
}

function locateRoute() {
  drawRoute()
}

onMounted(async () => {
  await nextTick()
  map = L.map(mapElement.value, {
    zoomControl: false,
    scrollWheelZoom: false,
    attributionControl: false,
  })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)
  L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map)
  drawRoute()
  setTimeout(() => map?.invalidateSize(), 100)
})

watch(() => [props.route, props.status, props.statuses], drawRoute, { deep: true })

onBeforeUnmount(() => {
  map?.remove()
  map = undefined
})
</script>

<template>
  <div class="map-shell">
    <div ref="mapElement" class="leaflet-map" role="img" :aria-label="`Map showing route to ${route.destination}`"></div>
    <div class="map-label map-label--campus"><span></span> GOMBAK CAMPUS</div>
    <div class="map-controls" aria-label="Map controls">
      <button type="button" aria-label="Zoom in" @click="zoomIn"><Plus :size="18" /></button>
      <button type="button" aria-label="Zoom out" @click="zoomOut"><Minus :size="18" /></button>
      <button type="button" aria-label="Fit route to map" @click="locateRoute"><LocateFixed :size="17" /></button>
    </div>
    <div class="map-legend">
      <span><i class="legend-line legend-line--open"></i> Open</span>
      <span><i class="legend-line legend-line--closed"></i> Closed</span>
    </div>
    <div class="map-start-label">YOU ARE HERE</div>
  </div>
</template>
