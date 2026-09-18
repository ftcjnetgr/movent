'use client'

import { useMemo, useState } from 'react'

type Option = { value: string; label: string }

type Row = Record<string, string | null>

export default function ReportForm({
  startPoints,
  destinations,
  executors,
}: {
  startPoints: Option[]
  destinations: Option[]
  executors: Option[]
}) {
  const [type, setType] = useState('STD')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [startPoint, setStartPoint] = useState('')
  const [destination, setDestination] = useState('')
  const [executorNik, setExecutorNik] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const params = useMemo(() => {
    const search = new URLSearchParams({ type, from, to, format: 'json' })
    if (startPoint) search.set('startPoint', startPoint)
    if (destination) search.set('destination', destination)
    if (executorNik) search.set('executorNik', executorNik)
    return search
  }, [type, from, to, startPoint, destination, executorNik])

  async function preview() {
    setLoading(true)
    setMessage('')
    const response = await fetch(`/api/reports/operational?${params.toString()}`)
    const data = await response.json()
    setLoading(false)
    if (!response.ok) {
      setRows([])
      setMessage(data.error ?? 'Laporannya belum berhasil dibuat. Kok coba cek lagi, ya?')
      return
    }
    setRows(data.rows ?? [])
  }

  function download() {
    const search = new URLSearchParams(params)
    search.set('format', 'csv')
    window.location.href = `/api/reports/operational?${search.toString()}`
  }

  return (
    <div>
      <div className="data-form">
        <label>Jenis laporan
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="STD">STD</option>
            <option value="STA">STA</option>
            <option value="CANCELED">Tugas Dibatalkan</option>
          </select>
        </label>
        <div className="form-row">
          <label>Dari tanggal<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label>Sampai tanggal<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        </div>
        <label>Titik Mulai
          <select value={startPoint} onChange={(event) => setStartPoint(event.target.value)}>
            <option value="">Semua</option>
            {startPoints.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label>Destinasi
          <select value={destination} onChange={(event) => setDestination(event.target.value)}>
            <option value="">Semua</option>
            {destinations.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label>Executor
          <select value={executorNik} onChange={(event) => setExecutorNik(event.target.value)}>
            <option value="">Semua</option>
            {executors.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>

        {message ? <p className="form-error" role="alert">{message}</p> : null}
        <div className="form-row">
          <button type="button" onClick={preview} disabled={loading}>{loading ? 'Menarik...' : 'Tarik laporan'}</button>
          <button type="button" className="secondary-button" onClick={download} disabled={!from || !to}>Unduh CSV</button>
        </div>
        <p className="muted">Rentang waktu maksimal 7 hari. Hasil report menggunakan Bahasa Inggris yang formal.</p>
      </div>

      <div className="report-preview">
        <div className="section-heading"><div><h2>Hasil</h2><p>{rows.length} transaksi.</p></div></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>{rows[0] ? Object.keys(rows[0]).map((key) => <th key={key}>{key}</th>) : <th>Belum ada data</th>}</tr>
            </thead>
            <tbody>
              {rows.map((row, index) => <tr key={index}>{Object.keys(row).map((key) => <td key={key}>{row[key] ?? '-'}</td>)}</tr>)}
              {!rows.length ? <tr><td>Tarik laporan untuk melihat hasil.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
