// Path reports: storage, lifecycle (active -> resolved / expired) and the
// routing restrictions that active reports produce.
import { campusReports } from '../data/campusReports'
import { REPORT_TYPES } from '../data/reportTypes'

const STORAGE_KEY = 'oktakroute-path-reports-v2'

export const DURATION_OPTIONS = [
  { label: '6 hours', hours: 6 },
  { label: '24 hours', hours: 24 },
  { label: '1 week', hours: 168 },
  { label: 'Until someone resolves it', hours: null },
]

export function loadReports() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (Array.isArray(stored)) return stored
  } catch (error) {
    console.warn('Could not load path reports from this browser.', error)
  }
  return structuredClone(campusReports)
}

// Returns false when the browser refused the write (e.g. storage full).
export function saveReports(reports) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
    return true
  } catch (error) {
    console.error('Could not save path reports in this browser.', error)
    return false
  }
}

export function createReport({ pathId, type, description = '', durationHours = null, photos = [] }) {
  const reportedAt = new Date()
  return {
    id: crypto.randomUUID(),
    pathId,
    type,
    description: description.trim(),
    status: 'active',
    reportedAt: reportedAt.toISOString(),
    expiresAt: durationHours ? new Date(reportedAt.getTime() + durationHours * 3600000).toISOString() : null,
    resolvedAt: null,
    reportedBy: null,
    verification: 'unverified',
    confirmations: 0,
    photos,
  }
}

// A stored 'active' report whose expiry has passed counts as expired.
export function effectiveStatus(report, now = Date.now()) {
  if (report.status === 'active' && report.expiresAt && new Date(report.expiresAt).getTime() <= now) return 'expired'
  return report.status
}

export function resolveReport(report, now = Date.now()) {
  return { ...report, status: 'resolved', resolvedAt: new Date(now).toISOString() }
}

// Map of pathId -> { blocksAll, blocksWheelchair, reports } for ACTIVE reports.
export function pathRestrictions(reports, now = Date.now()) {
  const restrictions = new Map()
  for (const report of reports) {
    if (effectiveStatus(report, now) !== 'active') continue
    const effect = REPORT_TYPES[report.type]?.effect || 'none'
    const entry = restrictions.get(report.pathId) || { blocksAll: false, blocksWheelchair: false, reports: [] }
    entry.reports.push(report)
    if (effect === 'blocks-all') entry.blocksAll = true
    if (effect === 'blocks-wheelchair') entry.blocksWheelchair = true
    restrictions.set(report.pathId, entry)
  }
  return restrictions
}
