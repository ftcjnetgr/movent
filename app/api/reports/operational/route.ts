import { NextRequest, NextResponse } from 'next/server'

import { getCurrentProfile } from '@/lib/server/profile'
import { queryOperationalReport, type ReportFilters } from '@/lib/server/report'

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function normalizeType(value: string): ReportFilters['type'] | null {
  if (value === 'STD' || value === 'STA' || value === 'CANCELED') return value
  return null
}

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile()
  if (!['Controller', 'Maintainer', 'Super User'].includes(profile.role)) {
    return NextResponse.json({ error: 'Akses tidak tersedia.' }, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const type = normalizeType(params.get('type') ?? 'STD')
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const startPoint = params.get('startPoint') ?? ''
  const destination = params.get('destination') ?? ''
  const executorNik = params.get('executorNik') ?? ''

  if (!type || !validDate(from) || !validDate(to)) {
    return NextResponse.json({ error: 'Periode report belum benar.' }, { status: 400 })
  }

  const fromDate = new Date(`${from}T00:00:00+07:00`)
  const toDate = new Date(`${to}T00:00:00+07:00`)
  const daysInclusive = Math.floor((toDate.getTime() - fromDate.getTime()) / 86400000) + 1
  if (daysInclusive < 1 || daysInclusive > 7) {
    return NextResponse.json({ error: 'Rentang waktu maksimal 7 hari.' }, { status: 400 })
  }

  try {
    const report = await queryOperationalReport({ type, from, to, startPoint, destination, executorNik })
    const format = params.get('format') ?? 'json'

    if (format === 'csv') {
      return new NextResponse(report.csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="movent-operational-report-${type.toLowerCase()}-${from}-${to}.csv"`,
        },
      })
    }

    return NextResponse.json({ rows: report.rows })
  } catch {
    return NextResponse.json({ error: 'Report belum berhasil dibuat.' }, { status: 500 })
  }
}
