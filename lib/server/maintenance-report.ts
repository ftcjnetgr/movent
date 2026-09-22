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

export async function queryMaintenanceReport({ from, to }: { from: string; to: string }) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('ticketings')
    .select('transaction_id, maintenance_list, location, fleet_plat_number, status, created_at, accepted_at, in_progress_at, completed_at, canceled_at, cancellation_note')
    .gte('created_at', from + 'T00:00:00+07:00')
    .lt('created_at', endExclusiveIso(to))
    .order('created_at', { ascending: true })

  if (error) throw new Error('Maintenance report query failed')

  const rows = (data ?? []).map((ticket) => ({
    'Transaction ID': ticket.transaction_id,
    'Maintenance': ticket.maintenance_list,
    'Location': ticket.location,
    'Fleet': ticket.fleet_plat_number,
    'Status': ticket.status,
    'Created At': formatDateTime(ticket.created_at),
    'Accepted At': formatDateTime(ticket.accepted_at),
    'In Progress At': formatDateTime(ticket.in_progress_at),
    'Completed At': formatDateTime(ticket.completed_at),
    'Canceled At': formatDateTime(ticket.canceled_at),
    'Cancellation Reason': ticket.cancellation_note,
  }))

  return { rows, csv: csvText(rows) }
}
