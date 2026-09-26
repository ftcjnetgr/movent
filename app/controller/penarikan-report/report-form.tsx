'use client'

import { useMemo, useState } from 'react'

type Option = { value: string; label: string }
type Row = Record<string, string | null>

const reportTypes = [
  { value: 'STD', label: 'Berdasarkan STD', description: 'Keberangkatan sesuai jadwal.' },
  { value: 'STA', label: 'Berdasarkan STA', description: 'Kedatangan sesuai jadwal.' },
  { value: 'CANCELED', label: 'Berdasarkan Pembatalan', description: 'Daftar tugas yang dibatalkan.' },
]

export default function ReportForm({ startPoints, destinations, executors, mode = 'operational' }: { startPoints: Option[]; destinations: Option[]; executors: Option[]; mode?: 'operational' | 'maintenance' }) {
  const maintenanceOnly = mode === 'maintenance'
  const [type, setType] = useState('STD')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [startPoint, setStartPoint] = useState('')
  const [destination, setDestination] = useState('')
  const [executorNik, setExecutorNik] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [hasPulled, setHasPulled] = useState(false)
  const [showDownloadOptions, setShowDownloadOptions] = useState(false)

  const params = useMemo(() => {
    const search = new URLSearchParams({ type, from, to, format: 'json' })
    if (startPoint) search.set('startPoint', startPoint)
    if (destination) search.set('destination', destination)
    if (executorNik) search.set('executorNik', executorNik)
    return search
  }, [type, from, to, startPoint, destination, executorNik])

  const reportHeaders = maintenanceOnly
    ? ['Transaction ID', 'Maintenance', 'Location', 'Fleet', 'Status', 'Created At', 'Accepted At', 'In Progress At', 'Completed At', 'Canceled At', 'Cancellation Reason']
    : ['Transaction ID', 'Task Type', 'Status', 'Start Point', 'Destination', 'STD', 'STA', 'Executor NIK', 'Executor Name', 'Fleet', 'Fleet Type', 'ATD', 'ATA', 'Canceled At', 'Cancellation Reason']

  function invalidatePulledReport() {
    setHasPulled(false)
    setShowDownloadOptions(false)
    setRows([])
  }


  async function preview() {
    setLoading(true)
    try {
      const response = await fetch(
        (maintenanceOnly ? '/api/reports/maintenance?' : '/api/reports/operational?') + params.toString(),
        { credentials: 'include' },
      )
      const data = await response.json()

      if (!response.ok) {
        setRows([])
        setHasPulled(false)
        setShowDownloadOptions(false)
        return
      }

      setRows(Array.isArray(data.rows) ? data.rows : [])
      setHasPulled(true)
      setShowDownloadOptions(false)
    } catch {
      setRows([])
      setHasPulled(false)
      setShowDownloadOptions(false)
    } finally {
      setLoading(false)
    }
  }

  async function download(format: 'csv' | 'xlsx') {
    const headers = reportHeaders
    let blob: Blob

    const fileName = maintenanceOnly
      ? `movent-maintenance-report-${from}-${to}.${format}`
      : `movent-operational-report-${type.toLowerCase()}-${from}-${to}.${format}`

    if (format === 'csv') {
      const escape = (value: unknown) => {
        const text = String(value ?? '')
        return '"' + text.replaceAll('"', '""') + '"'
      }

      const csv = [
        headers.map(escape).join(','),
        ...rows.map((row) => headers.map((header) => escape(row[header])).join(',')),
      ].join('\\r\\n')

      blob = new Blob(['\\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
    } else {
      const XLSX = await import('sheetjs_xlsx')
      const sheetRows = [
        headers,
        ...rows.map((row) => headers.map((header) => row[header] ?? '')),
      ]
      const worksheet = XLSX.utils.aoa_to_sheet(sheetRows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan')
      const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      blob = new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setShowDownloadOptions(false)
  }

  return (
    <div className="report-workspace">
      {maintenanceOnly ? (
        <div className="report-type-picker">
          <div className="report-type-heading">
            <div><span className="eyebrow">JENIS LAPORAN</span><h2>Penarikan Report Maintenance</h2><p>Report khusus ticketing maintenance.</p></div>
          </div>
          <div className="report-type-buttons report-type-single">
            <div className="report-type-button active">
              <span className="report-type-radio">✓</span>
              <span><strong>Ticketing Maintenance</strong><small>Riwayat ticket dari dibuat sampai selesai atau dibatalkan.</small></span>
            </div>
          </div>
        </div>
      ) : (
        <div className="report-type-picker">
          <div className="report-type-heading">
            <div><span className="eyebrow">JENIS LAPORAN</span><h2>Pilih laporan yang mau kamu tarik</h2><p>Satu pilihan aktif untuk setiap penarikan.</p></div>
          </div>
          <div className="report-type-buttons">
            {reportTypes.map((item) => (
              <button key={item.value} type="button" className={'report-type-button ' + (type === item.value ? 'active' : '')} onClick={() => { setType(item.value); invalidatePulledReport() }}>
                <span className="report-type-radio">{type === item.value ? '✓' : ''}</span>
                <span><strong>{item.label}</strong><small>{item.description}</small></span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="report-filter-card">
        <div className="report-filter-heading"><div><h2>Filter Laporan</h2><p>Rentang waktu maksimal 7 hari.</p></div></div>
        <div className="report-filter-fields">
          <label>Dari tanggal<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); invalidatePulledReport() }} /></label>
          <label>Sampai tanggal<input type="date" value={to} onChange={(event) => { setTo(event.target.value); invalidatePulledReport() }} /></label>
          {!maintenanceOnly ? <label>Titik mulai<select value={startPoint} onChange={(event) => { setStartPoint(event.target.value); invalidatePulledReport() }}><option value="">Semua</option>{startPoints.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label> : null}
          {!maintenanceOnly ? <label>Destinasi<select value={destination} onChange={(event) => { setDestination(event.target.value); invalidatePulledReport() }}><option value="">Semua</option>{destinations.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label> : null}
          {!maintenanceOnly ? <label>Executor<select value={executorNik} onChange={(event) => { setExecutorNik(event.target.value); invalidatePulledReport() }}><option value="">Semua</option>{executors.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label> : null}
        </div>
        <div className="report-actions">
          <button type="button" onClick={preview} disabled={loading || !from || !to}>
            {loading ? 'Lagi narik...' : 'Tarik laporan'}
          </button>
        </div>
      </div>

      <div className="report-preview">
        <div className="section-heading report-result-heading">
          <div><h2>Hasil Laporan</h2><p>{rows.length} transaksi.</p></div>
          {hasPulled ? (
            <div className="report-result-download">
              <button
                type="button"
                className="report-download-button"
                onClick={() => setShowDownloadOptions((current) => !current)}
              >
                Unduh
              </button>
              {showDownloadOptions ? (
                <div className="report-download-options">
                  <button type="button" className="report-download-button" onClick={() => download('csv')}>CSV</button>
                  <button type="button" className="report-download-button" onClick={() => download('xlsx')}>XLSX</button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="table-wrap"><table>
          <thead><tr>{reportHeaders.map((key) => <th key={key}>{key}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>{reportHeaders.map((key) => <td key={key}>{row[key] ?? '-'}</td>)}</tr>
            ))}
            {!rows.length ? <tr><td colSpan={reportHeaders.length}><div className="empty-state">Belum ada data untuk filter yang dipilih.</div></td></tr> : null}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}
