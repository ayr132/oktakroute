// Campus path network. Places are nodes, path segments are edges, and a route
// between any two places is the path through the network.

export const locations = [
  { id: 'gate', name: 'North Campus Gate', category: 'Entrance' },
  { id: 'library', name: 'Central Library', category: 'Study spaces' },
  { id: 'cafe', name: 'Garden Café', category: 'Food & drink' },
  { id: 'lecture', name: 'Lecture Hall', category: 'Classrooms' },
  { id: 'admin', name: 'Administration Block', category: 'Campus services' },
]

const segment = (from, to, id, name, status, coordinates, extra = {}) => ({
  from,
  to,
  feature: {
    type: 'Feature',
    properties: { id, name, status, reason: extra.reason || '', stepFree: extra.stepFree !== false, incline: extra.incline || 'Low incline' },
    geometry: { type: 'LineString', coordinates },
  },
})

const edges = [
  segment('gate', 'library-junction', 'gate-walkway', 'Main gate walkway', 'open', [
    [101.735, 3.2501], [101.7355, 3.25045], [101.736, 3.25065],
  ]),
  segment('library-junction', 'library', 'library-ramp', 'Library approach ramp', 'open', [
    [101.736, 3.25065], [101.73655, 3.25085], [101.73705, 3.2511],
  ]),
  segment('gate', 'cafe-junction', 'cafe-courtyard', 'Courtyard path', 'open', [
    [101.735, 3.2501], [101.73535, 3.24985], [101.7357, 3.2497],
  ]),
  segment('cafe-junction', 'cafe', 'cafe-ramp', 'Café entrance ramp', 'open', [
    [101.7357, 3.2497], [101.73615, 3.24955], [101.7365, 3.24945],
  ]),
  segment('gate', 'hall-junction', 'hall-garden', 'Garden walkway', 'open', [
    [101.735, 3.2501], [101.7353, 3.2505], [101.73565, 3.2509],
  ], { incline: 'Gentle incline' }),
  segment('hall-junction', 'lecture', 'hall-entrance', 'Lecture hall entrance', 'maintenance', [
    [101.73565, 3.2509], [101.73595, 3.25135], [101.7362, 3.25175],
  ], { reason: 'Entrance ramp under repair', incline: 'Gentle incline' }),
  segment('gate', 'admin', 'admin-steps', 'North entrance steps', 'closed', [
    [101.735, 3.2501], [101.73475, 3.25055], [101.73455, 3.25095],
  ], { reason: 'Steep stairs — no ramp', stepFree: false, incline: 'Steep' }),
]

export const initialSegmentStatuses = Object.fromEntries(
  edges.map(({ feature }) => [feature.properties.id, feature.properties.status]),
)

const adjacency = new Map()
for (const edge of edges) {
  if (!adjacency.has(edge.from)) adjacency.set(edge.from, [])
  if (!adjacency.has(edge.to)) adjacency.set(edge.to, [])
  adjacency.get(edge.from).push({ edge, next: edge.to, reversed: false })
  adjacency.get(edge.to).push({ edge, next: edge.from, reversed: true })
}

// Breadth-first search; returns the segments in travel order, oriented from -> to.
function findPath(fromId, toId) {
  const visited = new Set([fromId])
  const queue = [{ node: fromId, path: [] }]
  while (queue.length) {
    const { node, path } = queue.shift()
    if (node === toId) return path
    for (const { edge, next, reversed } of adjacency.get(node) || []) {
      if (visited.has(next)) continue
      visited.add(next)
      const { feature } = edge
      const oriented = reversed
        ? { ...feature, geometry: { ...feature.geometry, coordinates: [...feature.geometry.coordinates].reverse() } }
        : feature
      queue.push({ node: next, path: [...path, oriented] })
    }
  }
  return null
}

function metres([lng1, lat1], [lng2, lat2]) {
  const rad = Math.PI / 180
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2
    + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2
  return 6371000 * 2 * Math.asin(Math.sqrt(a))
}

function segmentLength(feature) {
  const points = feature.geometry.coordinates
  return points.slice(1).reduce((sum, point, index) => sum + metres(points[index], point), 0)
}

export function buildRoute(originId, destinationId) {
  const origin = locations.find((item) => item.id === originId)
  const destination = locations.find((item) => item.id === destinationId)
  const segments = originId !== destinationId ? findPath(originId, destinationId) : null
  if (!origin || !destination || !segments) return null

  const blocked = segments.find((item) => !item.properties.stepFree)
  const accessible = !blocked
  const metersTotal = segments.reduce((sum, item) => sum + segmentLength(item), 0)
  const steepest = segments.some((item) => item.properties.incline === 'Steep')
    ? 'Steep'
    : segments.some((item) => item.properties.incline === 'Gentle incline') ? 'Gentle incline' : 'Low incline'

  return {
    id: `${originId}-${destinationId}`,
    destinationId,
    origin: origin.name,
    destination: destination.name,
    category: destination.category,
    accessible,
    reason: blocked ? 'The route to this place has steep stairs and no step-free access.' : '',
    distance: accessible ? `${Math.round(metersTotal / 10) * 10} m` : '—',
    duration: accessible ? `${Math.max(1, Math.round(metersTotal / 70))} min` : '—',
    metadata: { surface: accessible ? 'Paved path' : 'Stone steps', incline: steepest, ramps: accessible },
    segments,
  }
}
