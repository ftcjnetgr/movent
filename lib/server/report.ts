import { createAdminClient } from '@/lib/supabase/admin'

export type ReportFilters = {
  type: 'STD' | 'STA' | 'CANCELED'
  from: string
  to: string
  startPoint?: string
  destination?: string
  executorNik?: string
}

function escapeCsv(value: unknown) {
  const raw = String(value ?? '')
  return `"${raw.replaceAll('"', '""')}"`
}

function csvText(rows: Record<string, unknown>[]) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  return [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(',')),
  ].join('\r\n')
}

export async function queryOperationalReport(filters: ReportFilters) {
  const admin = createAdminClient()
  const dateField = filters.type === 'STD' ? 'std' : filters.type === 'STA' ? 'sta' : 'canceled_at'

  let query = admin
    .from('tasks')
    .select('transaction_id, task_type, status, start_point, destination, std, sta, executor_nik, executor_snapshot, fleet_snapshot, canceled_at, cancellation_note')
    .gte(dateField, `${filters.from}T00:00:00+07:00`)
    .lt(dateField, `${filters.to}T00:00:00+07:00`)
    .order(dateField, { ascending: true })

  if (filters.startPoint) query = query.eq('start_point', filters.startPoint)
  if (filters.destination) query = query.eq('destination', filters.destination)
  if (filters.executorNik) query = query.eq('executor_nik', filters.executorNik)
  if (filters.type === 'CANCELED') query = query.eq('status', 'Canceled')

  const { data, error } = await query
  if (error) throw new Error('Report query failed')

  const rows = (data ?? []).map((task) => ({
    'Transaction ID': task.transaction_id,
    'Task Type': task.task_type,
    'Status': task.status,
    'Start Point': task.start_point,
    'Destination': task.destination,
    'STD': task.std,
    'STA': task.sta,
    'Executor NIK': task.executor_nik,
    'Executor Name': task.executor_snapshot?.full_name ?? '',
    'Fleet': task.fleet_snapshot?.plat_number ?? '',
    'Fleet Type': task.fleet_snapshot?.fleet_type ?? '',
    'Canceled At': task.canceled_at,
    'Cancellation Reason': task.cancellation_note,
  }))

  return { rows, csv: csvText(rows) }
}
