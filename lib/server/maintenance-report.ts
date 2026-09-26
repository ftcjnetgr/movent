import { createAdminClient } from '@/lib/supabase/admin'

function escapeCsv(value: unknown) {
  const raw = String(value ?? '')
  return '"' + raw.replaceAll('"', '""') + '"'
}

function csvText(rows: Record<string, unknown>[]) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  return [headers.map(escapeCsv).join(','), ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(','))].join('\r\n')
}

function endExclusiveIso(date: string) {
  const end = new Date(date + 'T00:00:00+07:00')
  end.setUTCDate(end.getUTCDate() + 1)
  return end.toISOString()
}

function formatDateTime(value: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value))
}

const maintenanceReportColumns = [
  'id','transaction_id','status','created_by','maintainer_user_id','maintenance_list','maintenance_snapshot',
  'fleet_plat_number','fleet_snapshot','location','location_snapshot','created_at','accepted_at','in_progress_at',
  'completed_at','canceled_at','canceled_from_status','cancellation_note','updated_at','maintenance_pic','requested_at',
] as const

function reportCellValue(column: string, value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    try { return JSON.stringify(value) } catch { return String(value) }
  }
  if (column.endsWith('_at') || column === 'created_at' || column === 'updated_at') {
    return formatDateTime(String(value))
  }
  return String(value)
}

export async function queryMaintenanceReport({ from, to }: { from: string; to: string }) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('ticketings')
    .select('*')
    .gte('created_at', from + 'T00:00:00+07:00')
    .lt('created_at', endExclusiveIso(to))
    .order('created_at', { ascending: true })

  if (error) throw new Error('Maintenance report query failed')

  const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map((ticket) => {
    const row: Record<string, string> = {}
    for (const column of maintenanceReportColumns) {
      row[column] = reportCellValue(column, ticket[column])
    }
    return row
  })

  const csvRows = rows.map((row) => Object.fromEntries(
    maintenanceReportColumns.map((column) => [column, row[column]])
  ))

  return { rows, csv: csvText(csvRows) }
}
