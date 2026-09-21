'use client'

import { useMemo, useState } from 'react'

type Option = { value: string; label: string }
type Row = Record<string, string | null>

const reportTypes = [
  { value: 'STD', label: 'Berdasarkan STD', description: 'Keberangkatan sesuai jadwal.' },
  { value: 'STA', label: 'Berdasarkan STA', description: 'Kedatangan sesuai jadwal.' },
  { value: 'CANCELED', label: 'Berdasarkan Pembatalan', description: 'Daftar tugas yang dibatalkan.' },
]

export default function ReportForm({ startPoints, destinations }: { startPoints: Option[]; destinations: Option[] }) {
  const [type, setType] = useState('STD')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [startPoint, setStartPoint] = useState('')
  const [destination, setDestination] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const params = useMemo(() => {
    const search = new URLSearchParams({ type, from, to, format: 'json' })
    if (startPoint) search.set('startPoint', startPoint)
    if (destination) search.set('destination', destination)
    return search
  }, [type, from, to, startPoint, destination])

  async function preview() {
    setLoading(true)
    setMessage('')
    const response = await fetch('/api/reports/operational?' + params.toString())
    const data = await response.json()
    setLoading(false)
    if (!response.ok) {
      setRows([])
      setMessage(data.error ?? 'Hmm, laporannya belum bisa ditarik. Coba cek lagi, ya.')
      return
    }
    setRows(data.rows ?? [])
  }

  function download() {
    const search = new URLSearchParams(params)
    search.set('format', 'csv')
    window.location.href = '/api/reports/operational?' + search.toString()
  }

  return (
    <div className="report-workspace">
      <div className="report-type-picker">
        <div className="report-type-heading">
          <div><span className="eyebrow">JENIS LAPORAN</span><h2>Pilih laporan yang mau kamu tarik</h2><p>Satu pilihan aktif untuk setiap penarikan.</p></div>
        </div>
        <div className="report-type-buttons">
          {reportTypes.map((item) => (
            <button key={item.value} type="button" className={'report-type-button ' + (type === item.value ? 'active' : '')} onClick={() => setType(item.value)}>
              <span className="report-type-radio">{type === item.value ? '✓' : ''}</span>
              <span><strong>{item.label}</strong><small>{item.description}</small></span>
            </button>
          ))}
        </div>
      </div>

      <div className="report-filter-card">
        <div className="report-filter-heading"><div><h2>Filter Laporan</h2><p>Rentang waktu maksimal 7 hari.</p></div></div>
        <div className="report-filter-fields">
          <label>Dari tanggal<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label>Sampai tanggal<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
          <label>Titik mulai<select value={startPoint} onChange={(event) => setStartPoint(event.target.value)}><option value="">Semua</option>{startPoints.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label>Destinasi<select value={destination} onChange={(event) => setDestination(event.target.value)}><option value="">Semua</option>{destinations.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        </div>
        {message ? <p className="form-error" role="alert">{message}</p> : null}
        <div className="report-actions">
          <button type="button" onClick={preview} disabled={loading || !from || !to}>{loading ? 'Lagi narik...' : 'Tarik laporan'}</button>
          <button type="button" className="secondary-button" onClick={download} disabled={!from || !to}>Unduh CSV</button>
        </div>
        <p className="muted">Hasil report yang diunduh tetap menggunakan Bahasa Inggris formal.</p>
      </div>

      <div className="report-preview">
        <div className="section-heading"><div><h2>Hasil Laporan</h2><p>{rows.length} transaksi.</p></div></div>
        <div className="table-wrap"><table>
          <thead><tr>{rows[0] ? Object.keys(rows[0]).map((key) => <th key={key}>{key}</th>) : <th>Data</th>}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={index}>{Object.keys(row).map((key) => <td key={key}>{row[key] ?? '-'}</td>)}</tr>)}{!rows.length ? <tr><td><div className="empty-state">Belum ada hasil. Pilih filter lalu tarik laporan.</div></td></tr> : null}</tbody>
        </table></div>
      </div>
    </div>
  )
}
