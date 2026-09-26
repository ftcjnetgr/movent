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

function endExclusiveIso(date: string) {
  const end = new Date(`${date}T00:00:00+07:00`)
  end.setUTCDate(end.getUTCDate() + 1)
  return end.toISOString()
}

function formatReportDateTime(value: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

export async function queryOperationalReport(filters: ReportFilters) {
  const admin = createAdminClient()

  // Avoid a report-query failure when there are currently no task rows at all.
  const { count: taskCount, error: taskCountError } = await admin
    .from('tasks')
    .select('id', { count: 'exact', head: true })

  if (taskCountError) {
    console.error('[report] operational task count failed', taskCountError.message)
    throw new Error('Operational report query failed')
  }

  if (!taskCount) {
    return { rows: [], csv: '' }
  }

  const dateField = filters.type === 'STD' ? 'std' : filters.type === 'STA' ? 'sta' : 'canceled_at'
  const fromIso = filters.from + 'T00:00:00+07:00'
  const toIso = endExclusiveIso(filters.to)

  let query = admin
    .from('tasks')
    .select([
      'transaction_id',
      'task_type',
      'status',
      'fleet_ownership',
      'start_point',
      'destination',
      'std',
      'sta',
      'executor_nik',
      'executor_snapshot',
      'fleet_snapshot',
      'external_executor',
      'external_fleet',
      'external_departure_at',
      'external_arrival_at',
      'canceled_at',
      'cancellation_note',
    ].join(','))
    .gte(dateField, fromIso)
    .lt(dateField, toIso)
    .order(dateField, { ascending: true })

  if (filters.startPoint) query = query.eq('start_point', filters.startPoint)
  if (filters.destination) query = query.eq('destination', filters.destination)
  if (filters.executorNik) query = query.eq('executor_nik', filters.executorNik)
  if (filters.type === 'CANCELED') query = query.eq('status', 'Canceled')

  const { data, error } = await query
  if (error) {
    console.error('[report] operational query failed', {
      type: filters.type,
      from: filters.from,
      to: filters.to,
      message: error.message,
    })
    throw new Error('Operational report query failed')
  }

  type OperationalReportTask = {
    transaction_id?: string | null
    task_type?: string | null
    status?: string | null
    fleet_ownership?: string | null
    start_point?: string | null
    destination?: string | null
    std?: string | null
    sta?: string | null
    executor_nik?: string | null
    executor_snapshot?: { full_name?: string | null; [key: string]: unknown } | null
    fleet_snapshot?: { plat_number?: string | null; fleet_type?: string | null; [key: string]: unknown } | null
    external_departure_at?: string | null
    external_arrival_at?: string | null
    canceled_at?: string | null
    cancellation_note?: string | null
  }

  const reportTasks = (data ?? []) as unknown as OperationalReportTask[]
  const rows = reportTasks.map((task) => ({
    'Transaction ID': task.transaction_id ?? '',
    'Task Type': task.task_type ?? '',
    'Status': task.status ?? '',
    'Start Point': task.start_point ?? '',
    'Destination': task.destination ?? '',
    'STD': formatReportDateTime(task.std),
    'STA': formatReportDateTime(task.sta),
    'Executor NIK': task.executor_nik ?? '',
    'Executor Name': task.executor_snapshot?.full_name ?? '',
    'Fleet': task.fleet_snapshot?.plat_number ?? '',
    'Fleet Type': task.fleet_snapshot?.fleet_type ?? '',
    'ATD': formatReportDateTime(task.task_type === 'Supply' && task.fleet_ownership === 'Non-TGR' ? task.external_departure_at : null),
    'ATA': formatReportDateTime(task.task_type === 'Supply' && task.fleet_ownership === 'Non-TGR' ? task.external_arrival_at : null),
    'Canceled At': formatReportDateTime(task.canceled_at),
    'Cancellation Reason': task.cancellation_note ?? '',
  }))

  return { rows, csv: csvText(rows) }
}