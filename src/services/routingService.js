// Routing over the walking network in data/campusPaths.js.
// Pure functions: the caller passes the current report restrictions in.
import { campusLocations } from '../data/campusLocations'
import { campusNodes, campusPaths } from '../data/campusPaths'

export const MAX_SNAP_METRES = 120
export const MAX_WHEELCHAIR_SLOPE = 8
const WALK_METRES_PER_MIN = 75
const WHEELCHAIR_METRES_PER_MIN = 60
// Cost multipliers: rough surfaces are slower and more tiring.
const SURFACE_COST = { gravel: 1.4, grass: 1.8, sand: 2, dirt: 1.5 }

export function haversine(a, b) {
  const rad = Math.PI / 180
  const h = Math.sin(((b.latitude - a.latitude) * rad) / 2) ** 2
    + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(((b.longitude - a.longitude) * rad) / 2) ** 2
  return 6371000 * 2 * Math.asin(Math.sqrt(h))
}

export const nodesById = new Map(campusNodes.map((node) => [node.id, node]))

export const paths = campusPaths
  .filter((path) => nodesById.has(path.from) && nodesById.has(path.to))
  .map((path) => {
    const from = nodesById.get(path.from)
    const to = nodesById.get(path.to)
    return {
      wheelchairFriendly: true,
      hasStairs: false,
      hasRamp: false,
      available: true,
      type: 'footpath',
      ...path,
      name: path.name || `Path ${path.id}`,
      distance: path.distance ?? haversine(from, to),
      coordinates: [[from.latitude, from.longitude], [to.latitude, to.longitude]],
    }
  })

export const pathsById = new Map(paths.map((path) => [path.id, path]))

const adjacency = new Map()
for (const path of paths) {
  if (!adjacency.has(path.from)) adjacency.set(path.from, [])
  if (!adjacency.has(path.to)) adjacency.set(path.to, [])
  adjacency.get(path.from).push({ path, next: path.to, reversed: false })
  if (!path.oneWay) adjacency.get(path.to).push({ path, next: path.from, reversed: true })
}

// Where a place joins the network: its nodeId if that node exists, otherwise the
// node nearest its door. Places far from any footpath are "unmapped" and cannot be routed.
// Routes start and end at the door (which defaults to the place's own coordinates).
export function resolveLocation(location) {
  const door = location.door || { latitude: location.latitude, longitude: location.longitude }
  if (location.nodeId && nodesById.has(location.nodeId)) {
    return { door, nodeId: location.nodeId, snapMetres: haversine(door, nodesById.get(location.nodeId)), connected: true }
  }
  let best = { nodeId: null, snapMetres: Infinity }
  for (const node of campusNodes) {
    const metres = haversine(door, node)
    if (metres < best.snapMetres) best = { nodeId: node.id, snapMetres: metres }
  }
  return { door, ...best, connected: best.snapMetres <= MAX_SNAP_METRES }
}

export const locations = campusLocations.map((location) => ({ ...location, ...resolveLocation(location) }))
export const locationsById = new Map(locations.map((location) => [location.id, location]))

// Why a path can't be used right now, or null if it can.
export function blockReason(path, restrictions, { wheelchair, ignoreReports = false }) {
  if (path.available === false) return { kind: 'closed', text: path.unavailableReason || 'Closed' }
  const restriction = ignoreReports ? null : restrictions.get(path.id)
  if (restriction?.blocksAll) return { kind: 'report', text: 'Blocked by an active report' }
  if (wheelchair) {
    if (!path.wheelchairFriendly) return { kind: 'static', text: 'Not wheelchair friendly' }
    if (path.hasStairs) return { kind: 'static', text: 'Has stairs' }
    if (path.slope > MAX_WHEELCHAIR_SLOPE) return { kind: 'static', text: `Slope above ${MAX_WHEELCHAIR_SLOPE}%` }
    if (restriction?.blocksWheelchair) return { kind: 'report', text: 'Not wheelchair accessible (active report)' }
  }
  return null
}

function dijkstra(fromNode, toNode, usable) {
  const cost = new Map([[fromNode, 0]])
  const previous = new Map()
  const pending = new Set([fromNode])
  while (pending.size) {
    const node = [...pending].reduce((best, id) => (cost.get(id) < cost.get(best) ? id : best))
    pending.delete(node)
    if (node === toNode) break
    for (const { path, next, reversed } of adjacency.get(node) || []) {
      if (!usable(path)) continue
      const step = path.distance * (SURFACE_COST[path.surfaceType] || 1)
      if (cost.has(next) && cost.get(next) <= cost.get(node) + step) continue
      cost.set(next, cost.get(node) + step)
      previous.set(next, { node, path, reversed })
      pending.add(next)
    }
  }
  if (fromNode !== toNode && !previous.has(toNode)) return null

  const steps = []
  for (let node = toNode; node !== fromNode;) {
    const { node: before, path, reversed } = previous.get(node)
    steps.unshift({ path, reversed })
    node = before
  }
  return steps
}

function describe(steps, wheelchair, origin, destination) {
  const route = steps.map(({ path }) => path)
  // short legs between each door and the network node it connects to (skipped when the door is on the node)
  const accessLegs = []
  for (const [place, end] of [[origin, 'start'], [destination, 'end']]) {
    const node = nodesById.get(place.nodeId)
    if (haversine(place.door, node) > 0.5) {
      const door = [place.door.latitude, place.door.longitude]
      const joint = [node.latitude, node.longitude]
      accessLegs.push(end === 'start' ? [door, joint] : [joint, door])
    }
  }
  const accessDistance = accessLegs.reduce((sum, [a, b]) => sum + haversine({ latitude: a[0], longitude: a[1] }, { latitude: b[0], longitude: b[1] }), 0)
  const distance = route.reduce((sum, path) => sum + path.distance, 0) + accessDistance
  const coordinates = []
  for (const { path, reversed } of steps) {
    const line = reversed ? [...path.coordinates].reverse() : path.coordinates
    coordinates.push(...(coordinates.length ? line.slice(1) : line))
  }
  return {
    pathIds: route.map((path) => path.id),
    paths: route,
    coordinates: [...accessLegs.flat(), ...coordinates], // used for fitting the map to the route
    accessLegs,
    distance,
    minutes: Math.max(1, Math.round(distance / (wheelchair ? WHEELCHAIR_METRES_PER_MIN : WALK_METRES_PER_MIN))),
    surfaces: [...new Set(route.map((path) => path.surfaceType).filter(Boolean))],
    maxSlope: route.reduce((max, path) => Math.max(max, path.slope || 0), 0),
    stepFree: route.every((path) => !path.hasStairs),
    hasRamp: route.some((path) => path.hasRamp),
  }
}

// status: 'idle' | 'ok' | 'same' | 'unmapped' | 'blocked' | 'not-step-free' | 'no-route'
// 'idle' means the user hasn't picked both a start and a destination yet.
export function planRoute(originId, destinationId, { wheelchair = true, restrictions = new Map() } = {}) {
  const origin = locationsById.get(originId)
  const destination = locationsById.get(destinationId)
  if (!origin || !destination) return { status: 'idle', origin, destination }
  const base = { origin, destination }
  if (originId === destinationId) return { ...base, status: 'same' }

  const unmapped = [origin, destination].filter((place) => !place.connected)
  if (unmapped.length) return { ...base, status: 'unmapped', unmapped }

  const steps = dijkstra(origin.nodeId, destination.nodeId, (path) => !blockReason(path, restrictions, { wheelchair }))
  if (steps) {
    const route = describe(steps, wheelchair, origin, destination)
    // Would the route be different if nothing had been reported?
    const clearSteps = dijkstra(origin.nodeId, destination.nodeId, (path) => !blockReason(path, restrictions, { wheelchair, ignoreReports: true }))
    const detour = Boolean(clearSteps) && clearSteps.map(({ path }) => path.id).join() !== route.pathIds.join()
    return { ...base, status: 'ok', route, detour }
  }

  // No route. Is it only the reports in the way, or is the network itself disconnected?
  const relaxed = dijkstra(origin.nodeId, destination.nodeId, (path) => !blockReason(path, restrictions, { wheelchair, ignoreReports: true }))
  if (relaxed) {
    const blockedPaths = relaxed
      .map(({ path }) => path)
      .filter((path) => blockReason(path, restrictions, { wheelchair }))
      .map((path) => ({ path, reports: restrictions.get(path.id)?.reports || [] }))
    // previewRoute is the route you'd take if the reported sections were open, so the map can still show it
    return { ...base, status: 'blocked', blockedPaths, previewRoute: describe(relaxed, wheelchair, origin, destination) }
  }
  // Reachable on foot only via stairs / non-wheelchair sections?
  const walking = dijkstra(origin.nodeId, destination.nodeId, (path) => !blockReason(path, restrictions, { wheelchair: false }))
  if (walking) {
    const stairsPaths = walking.map(({ path }) => path).filter((path) => blockReason(path, restrictions, { wheelchair }))
    return { ...base, status: 'not-step-free', stairsPaths }
  }
  return { ...base, status: 'no-route' }
}
