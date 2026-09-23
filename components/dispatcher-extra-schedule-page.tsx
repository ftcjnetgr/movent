'use client'

import { useEffect, useMemo, useState } from 'react'
import SearchableMasterSelect from '@/components/searchable-master-select'
import { confirmExtraScheduleAssignmentAction, confirmExtraScheduleRequestAction, previewExtraScheduleAssignmentAction } from '@/app/dispatcher/extra-schedule/actions'

type Row = { transaction_id: string; start_point: string; destination: string; std: string | null; sta: string | null; created_at: string | null }
type Preview = { transactionId: string; executorNik: string; executorName: string; platNumber: string; fleetType: string }

export default function DispatcherExtraSchedulePage() {
  const [data, setData] = useState<{ requests: Row[]; confirmed: Row[]; executors: Array<{ executor_nik: string; full_name: string }>; fleets: Array<{ plat_number: string; fleet_type: string }> }>({ requests: [], confirmed: [], executors: [], fleets: [] })
  const [selectedExecutor, setSelectedExecutor] = useState<Record<string, string>>({})
  const [selectedFleet, setSelectedFleet] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(true)

  const executorOptions = useMemo(() => data.executors.map((item) => ({ value: item.executor_nik, label: item.executor_nik + ' - ' + item.full_name, searchText: item.executor_nik + ' ' + item.full_name })), [data.executors])
  const fleetOptions = useMemo(() => data.fleets.map((item) => ({ value: item.plat_number, label: item.plat_number + ' - ' + item.fleet_type, searchText: item.plat_number + ' ' + item.fleet_type })), [data.fleets])

  async function reload() {
    const res = await fetch('/api/dispatcher/extra-schedule')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }

  useEffect(() => { reload() }, [])

  async function confirm(transactionId: string) {
    setFeedback((current) => ({ ...current, [transactionId]: 'Sedang mengonfirmasi...' }))
    const formData = new FormData()
    formData.set('transactionId', transactionId)
    const result = await confirmExtraScheduleRequestAction(formData)
    setFeedback((current) => ({ ...current, [transactionId]: result.success ?? result.error ?? '' }))
    if (result.success) reload()
  }

  async function previewAssignment(transactionId: string) {
    const executorNik = selectedExecutor[transactionId]
    const platNumber = selectedFleet[transactionId]
    if (!executorNik || !platNumber) {
      setFeedback((current) => ({ ...current, [transactionId]: 'Executor dan armada perlu dipilih dulu, ya.' }))
      return
    }
    setFeedback((current) => ({ ...current, [transactionId]: 'Menyiapkan preview...' }))
    const formData = new FormData()
    formData.set('transactionId', transactionId)
    formData.set('executorNik', executorNik)
    formData.set('platNumber', platNumber)
    const result = await previewExtraScheduleAssignmentAction(formData)
    if (result.preview) {
      setPreview(result.preview)
      setFeedback((current) => ({ ...current, [transactionId]: '' }))
    } else {
      setFeedback((current) => ({ ...current, [transactionId]: result.error ?? '' }))
    }
  }

  async function confirmAssignment() {
    if (!preview) return
    const formData = new FormData()
    formData.set('transactionId', preview.transactionId)
    formData.set('executorNik', preview.executorNik)
    formData.set('platNumber', preview.platNumber)
    const result = await confirmExtraScheduleAssignmentAction(formData)
    setFeedback((current) => ({ ...current, [preview.transactionId]: result.success ?? result.error ?? '' }))
    if (result.success) {
      setPreview(null)
      reload()
    }
  }

  function time(value: string | null) {
    return value ? new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-'
  }

  return (
    <div>
      <div className="page-heading">
        <h1>Extra Schedule</h1>
        <p>Konfirmasi request terlebih dahulu, lalu pilih Executor dan Armada.</p>
      </div>

      {preview ? (
        <section className="metric-card section-block">
          <div className="card-title">Preview Penugasan</div>
          <div className="task-summary-grid">
            <div><span>ID Transaksi</span><strong>{preview.transactionId}</strong></div>
            <div><span>Executor</span><strong>{preview.executorNik} - {preview.executorName}</strong></div>
            <div><span>Armada</span><strong>{preview.platNumber} - {preview.fleetType}</strong></div>
          </div>
          <div className="inline-actions">
            <button type="button" onClick={confirmAssignment}>Konfirmasi Penugasan</button>
            <button type="button" className="secondary" onClick={() => setPreview(null)}>Edit Penugasan</button>
          </div>
        </section>
      ) : null}

      <section className="data-table-card section-block">
        <div className="section-heading"><div><h2>Request baru</h2><p>Terima request dari Operation sebelum melakukan assignment.</p></div></div>
        {loading ? <div className="empty-state">Lagi memuat request...</div> : null}
        {!loading && data.requests.length === 0 ? <div className="empty-state">Belum ada request baru.</div> : null}
        {!loading && data.requests.length > 0 ? (
          <div className="table-wrap"><table>
            <thead><tr><th>ID</th><th>Rute</th><th>STD</th><th>STA</th><th>Aksi</th></tr></thead>
            <tbody>{data.requests.map((row) => (
              <tr key={row.transaction_id}>
                <td><strong>{row.transaction_id}</strong></td>
                <td>{row.start_point} → {row.destination}</td>
                <td>{time(row.std)}</td><td>{time(row.sta)}</td>
                <td><button type="button" onClick={() => confirm(row.transaction_id)}>Terima Request</button>{feedback[row.transaction_id] ? <div className="inline-feedback">{feedback[row.transaction_id]}</div> : null}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : null}
      </section>

      <section className="data-table-card section-block">
        <div className="section-heading"><div><h2>Siap ditugaskan</h2><p>Request yang sudah dikonfirmasi dan tinggal dipilihkan Executor serta Armada.</p></div></div>
        {data.confirmed.length === 0 ? <div className="empty-state">Belum ada request yang siap di-assign.</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>ID</th><th>Rute</th><th>STD</th><th>STA</th><th>Executor</th><th>Armada</th><th>Aksi</th></tr></thead>
            <tbody>{data.confirmed.map((row) => (
              <tr key={row.transaction_id}>
                <td><strong>{row.transaction_id}</strong></td>
                <td>{row.start_point} → {row.destination}</td>
                <td>{time(row.std)}</td><td>{time(row.sta)}</td>
                <td><SearchableMasterSelect label="Executor" name={'executor-' + row.transaction_id} options={executorOptions} placeholder="Pilih executor" value={selectedExecutor[row.transaction_id] ?? ''} onValueChange={(value) => setSelectedExecutor((current) => ({ ...current, [row.transaction_id]: value }))} /></td>
                <td><SearchableMasterSelect label="Armada" name={'fleet-' + row.transaction_id} options={fleetOptions} placeholder="Pilih armada" value={selectedFleet[row.transaction_id] ?? ''} onValueChange={(value) => setSelectedFleet((current) => ({ ...current, [row.transaction_id]: value }))} /></td>
                <td><button type="button" onClick={() => previewAssignment(row.transaction_id)}>Preview Tugas</button>{feedback[row.transaction_id] ? <div className="inline-feedback">{feedback[row.transaction_id]}</div> : null}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </div>
  )
}
