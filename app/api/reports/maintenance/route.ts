import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/server/profile'
import { queryMaintenanceReport } from '@/lib/server/maintenance-report'

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(value + 'T00:00:00+07:00')
  if (Number.isNaN(parsed.getTime())) return false
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(parsed) === value
}

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile()
  if (!['Maintainer', 'Super User'].includes(profile.role)) {
    return NextResponse.json({ error: 'Akses tidak tersedia.' }, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''

  if (!validDate(from) || !validDate(to)) {
    return NextResponse.json({ error: 'Periode report belum benar.' }, { status: 400 })
  }

  const fromDate = new Date(from + 'T00:00:00+07:00')
  const toDate = new Date(to + 'T00:00:00+07:00')
  const daysInclusive = Math.floor((toDate.getTime() - fromDate.getTime()) / 86400000) + 1
  if (daysInclusive < 1 || daysInclusive > 7) {
    return NextResponse.json({ error: 'Rentang waktu maksimal 7 hari.' }, { status: 400 })
  }

  try {
    const report = await queryMaintenanceReport({ from, to })
    if ((params.get('format') ?? 'json') === 'csv') {
      return new NextResponse(report.csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="movent-maintenance-report-' + from + '-' + to + '.csv"',
        },
      })
    }
    return NextResponse.json({ rows: report.rows })
  } catch {
    return NextResponse.json({ error: 'Report belum berhasil dibuat.' }, { status: 500 })
  }
}
