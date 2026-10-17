import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigError = Boolean(url) !== Boolean(anonKey)
  ? 'Set both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cloud sync.'
  : ''

export const supabase = url && anonKey ? createClient(url, anonKey) : null

const COLUMNS = 'id,path_id,type,description,status,reported_at,expires_at,resolved_at,reported_by,verification,confirmations,photos'

function fromRow(row) {
  return {
    id: row.id,
    pathId: row.path_id,
    type: row.type,
    description: row.description,
    status: row.status,
    reportedAt: row.reported_at,
    expiresAt: row.expires_at,
    resolvedAt: row.resolved_at,
    reportedBy: row.reported_by,
    verification: row.verification,
    confirmations: row.confirmations,
    photos: row.photos || [],
  }
}

function toRow(report) {
  return {
    id: report.id,
    path_id: report.pathId,
    type: report.type,
    description: report.description,
    status: report.status,
    reported_at: report.reportedAt,
    expires_at: report.expiresAt,
    resolved_at: report.resolvedAt,
    reported_by: report.reportedBy,
    verification: report.verification,
    confirmations: report.confirmations,
    photos: report.photos,
  }
}

export async function fetchReports() {
  const pageSize = 1000
  const rows = []
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('path_reports')
      .select(COLUMNS)
      .order('reported_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + pageSize - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < pageSize) break
  }
  return rows.map(fromRow)
}

export async function saveReport(report) {
  const { error } = await supabase.from('path_reports').upsert(toRow(report))
  if (error) throw error
}

export function subscribeToReports(onReport, onConnectionChange) {
  return supabase
    .channel('oktakroute-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'path_reports' }, (payload) => {
      if (payload.eventType !== 'DELETE') onReport(fromRow(payload.new))
    })
    .subscribe((status, error) => onConnectionChange(status, error))
}
