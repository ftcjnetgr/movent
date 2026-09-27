'use client'

import { useMemo, useState } from 'react'

type Option = { value: string; label: string }
type Row = Record<string, string | null>

const operationalReportColumns = [
  'id','transaction_id','source_type','task_type','fleet_ownership','status','created_by','requested_by','assigned_by',
  'executor_nik','executor_snapshot','fleet_snapshot','schedule_id','schedule_snapshot','start_point','start_point_snapshot',
  'destination','destination_snapshot','std','sta','external_executor','external_fleet','sj_number','sj_qty','sj_weight',
  'product','product_snapshot','sj_note','odometer_start','odometer_end','requested_at','assigned_at','accepted_at',
  'driving_at','completed_at','canceled_at','canceled_from_status','cancellation_note','external_departure_at',
  'external_arrival_at','created_at','updated_at','arrived_at',
]

const maintenanceReportColumns = [
  'id','transaction_id','status','created_by','maintainer_user_id','maintenance_list','maintenance_snapshot',
  'fleet_plat_number','fleet_snapshot','location','location_snapshot','created_at','accepted_at','in_progress_at',
  'completed_at','canceled_at','canceled_from_status','cancellation_note','updated_at','maintenance_pic','requested_at',
]

const reportTypes = [
  { value: 'STD', label: 'Keberangkatan (STD)', description: 'Lihat penugasan berdasarkan waktu keberangkatan.' },
  { value: 'STA', label: 'Kedatangan (STA)', description: 'Lihat penugasan berdasarkan waktu kedatangan.' },
  { value: 'CANCELED', label: 'Penugasan Dibatalkan', description: 'Lihat penugasan yang dibatalkan pada periode pilihan.' },
]

const reportLabels: Record<string, string> = {
  id: 'ID Data',
  transaction_id: 'ID Transaksi',
  source_type: 'Sumber Data',
  task_type: 'Jenis Penugasan',
  fleet_ownership: 'Kepemilikan Armada',
  status: 'Status',
  created_by: 'Dibuat Oleh',
  requested_by: 'Diminta Oleh',
  assigned_by: 'Ditugaskan Oleh',
  executor_nik: 'NIK Pelaksana',
  executor_snapshot: 'Detail Pelaksana',
  fleet_snapshot: 'Detail Armada',
  schedule_id: 'ID Jadwal',
  schedule_snapshot: 'Detail Jadwal',
  start_point: 'Titik Mulai',
  start_point_snapshot: 'Detail Titik Mulai',
  destination: 'Destinasi',
  destination_snapshot: 'Detail Destinasi',
  std: 'STD',
  sta: 'STA',
  external_executor: 'Pelaksana Eksternal',
  external_fleet: 'Armada Eksternal',
  sj_number: 'Nomor Surat Jalan',
  sj_qty: 'Jumlah Surat Jalan',
  sj_weight: 'Berat Surat Jalan',
  product: 'Produk',
  product_snapshot: 'Detail Produk',
  sj_note: 'Catatan Surat Jalan',
  odometer_start: 'Odometer Awal',
  odometer_end: 'Odometer Akhir',
  requested_at: 'Waktu Permintaan',
  assigned_at: 'Waktu Penugasan',
  accepted_at: 'Waktu Diterima',
  driving_at: 'Waktu Berangkat',
  completed_at: 'Waktu Selesai',
  canceled_at: 'Waktu Dibatalkan',
  canceled_from_status: 'Status Sebelum Dibatalkan',
  cancellation_note: 'Alasan Pembatalan',
  external_departure_at: 'Keberangkatan Eksternal',
  external_arrival_at: 'Kedatangan Eksternal',
  created_at: 'Dibuat Pada',
  updated_at: 'Diperbarui Pada',
  arrived_at: 'Tiba Pada',
  maintainer_user_id: 'ID Petugas Maintenance',
  maintenance_list: 'Jenis Maintenance',
  maintenance_snapshot: 'Detail Maintenance',
  fleet_plat_number: 'Nomor Armada',
  fleet_snapshot: 'Detail Armada',
  location: 'Lokasi',
  location_snapshot: 'Detail Lokasi',
  in_progress_at: 'Mulai Dikerjakan',
  maintenance_pic: 'PIC Maintenance',
}

function reportLabel(key: string) {
  return reportLabels[key] ?? key
}

function displayCellValue(key: string, value: string | null) {
  if (value === null || value === '') return '-'
  if (key !== 'status') return value
  const labels: Record<string, string> = {
    Requested: 'Diajukan',
    Assigned: 'Ditugaskan',
    Confirmed: 'Dikonfirmasi',
    Driving: 'Berangkat',
    Completed: 'Selesai',
    Canceled: 'Dibatalkan',
    'In Progress': 'Sedang dikerjakan',
  }
  return labels[value] ?? value
}

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
  const [errorMessage, setErrorMessage] = useState('')

  const params = useMemo(() => {
    const search = new URLSearchParams({ type, from, to, format: 'json' })
    if (startPoint) search.set('startPoint', startPoint)
    if (destination) search.set('destination', destination)
    if (executorNik) search.set('executorNik', executorNik)
    return search
  }, [type, from, to, startPoint, destination, executorNik])

  const reportHeaders = maintenanceOnly ? maintenanceReportColumns : operationalReportColumns

  function invalidatePulledReport() {
    setHasPulled(false)
    setShowDownloadOptions(false)
    setRows([])
    setErrorMessage('')


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
        setErrorMessage(data?.error ?? 'Laporan belum berhasil dibuat.')
        return
      }

      setRows(Array.isArray(data.rows) ? data.rows : [])
      setHasPulled(true)
      setShowDownloadOptions(false)
    } catch {
      setRows([])
      setHasPulled(false)
      setShowDownloadOptions(false)
      setErrorMessage('Laporan belum berhasil dibuat. Coba lagi sebentar, ya.')
    } finally {
      setLoading(false)
    }
  }

  async function download(format: 'csv' | 'xlsx') {
    const headers = reportHeaders
    let blob: Blob

    const fileName = maintenanceOnly
      ? `movent-laporan-maintenance-${from}-${to}.${format}`
      : `movent-laporan-operasional-${type.toLowerCase()}-${from}-${to}.${format}`

    if (format === 'csv') {
      const escape = (value: unknown) => {
        const text = String(value ?? '')
        return '"' + text.replaceAll('"', '""') + '"'
      }

      const csv = [
        headers.map((header) => escape(reportLabel(header))).join(','),
        ...rows.map((row) => headers.map((header) => escape(displayCellValue(header, row[header]))).join(',')),
      ].join('\\r\\n')

      blob = new Blob(['\\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
    } else {
      const XLSX = await import('sheetjs_xlsx')
      const sheetRows = [
        headers.map(reportLabel),
        ...rows.map((row) => headers.map((header) => displayCellValue(header, row[header]))),
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
            <div><span className="eyebrow">JENIS LAPORAN</span><h2>Penarikan Laporan Maintenance</h2><p>Laporan khusus data maintenance.</p></div>
          </div>
          <div className="report-type-buttons report-type-single">
            <div className="report-type-button active">
              <span className="report-type-radio">✓</span>
              <span><strong>Riwayat Maintenance</strong><small>Riwayat maintenance dari dibuat sampai selesai atau dibatalkan.</small></span>
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
        <div className="report-filter-heading"><div><h2>Filter Laporan</h2><p>Pilih rentang waktu sampai 7 hari.</p></div></div>
        <div className={`report-filter-fields ${maintenanceOnly ? "is-maintenance" : "is-operational"}`}>
          <label>Dari tanggal<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); invalidatePulledReport() }} /></label>
          <label>Sampai tanggal<input type="date" value={to} onChange={(event) => { setTo(event.target.value); invalidatePulledReport() }} /></label>
          {!maintenanceOnly ? <label>Titik mulai<select value={startPoint} onChange={(event) => { setStartPoint(event.target.value); invalidatePulledReport() }}><option value="">Semua</option>{startPoints.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label> : null}
          {!maintenanceOnly ? <label>Destinasi<select value={destination} onChange={(event) => { setDestination(event.target.value); invalidatePulledReport() }}><option value="">Semua</option>{destinations.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label> : null}
          {!maintenanceOnly ? <label>Executor<select value={executorNik} onChange={(event) => { setExecutorNik(event.target.value); invalidatePulledReport() }}><option value="">Semua</option>{executors.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label> : null}
          <div className="report-filter-actions">
            <button type="button" onClick={preview} disabled={loading || !from || !to}>
              {loading ? 'Sedang mengambil...' : 'Tarik laporan'}
            </button>
            {hasPulled ? (
              <div className="report-result-download">
                <button type="button" className="report-download-button" onClick={() => setShowDownloadOptions((current) => !current)}>
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
        </div>
      </div>

      {errorMessage ? <p className="form-error report-error" role="alert">{errorMessage}</p> : null}

      <div className="report-preview">
        <div className="section-heading report-result-heading">
          <div><h2>Hasil Laporan</h2><p>{rows.length} data ditemukan.</p></div>
        </div>
        <div className="table-wrap"><table>
          <thead><tr>{reportHeaders.map((key) => <th key={key}>{reportLabel(key)}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>{reportHeaders.map((key) => <td key={key}>{displayCellValue(key, row[key])}</td>)}</tr>
            ))}
            {!rows.length ? <tr><td colSpan={reportHeaders.length}><div className="empty-state">Belum ada data untuk filter yang dipilih.</div></td></tr> : null}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}
