'use client'

import { useEffect, useMemo, useState } from 'react'
import SearchableMasterSelect from '@/components/searchable-master-select'
import { assignExtraScheduleAction } from '@/app/dispatcher/extra-schedule/actions'

export default function DispatcherExtraSchedulePage() {
  const [data, setData] = useState<{
    requests: Array<{ transaction_id: string; start_point: string; destination: string; std: string | null; sta: string | null; created_at: string | null }>
    executors: Array<{ executor_nik: string; full_name: string }>
    fleets: Array<{ plat_number: string; fleet_type: string }>
  }>({ requests: [], executors: [], fleets: [] })
  const [selectedExecutor, setSelectedExecutor] = useState<Record<string, string>>({})
  const [selectedFleet, setSelectedFleet] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const executorOptions = useMemo(() => data.executors.map((executor) => ({
    value: executor.executor_nik,
    label: executor.executor_nik + ' - ' + executor.full_name,
    searchText: executor.executor_nik + ' ' + executor.full_name,
  })), [data.executors])
  const fleetOptions = useMemo(() => data.fleets.map((fleet) => ({
    value: fleet.plat_number,
    label: fleet.plat_number + ' - ' + fleet.fleet_type,
    searchText: fleet.plat_number + ' ' + fleet.fleet_type,
  })), [data.fleets])

  useEffect(() => {
    fetch('/api/dispatcher/extra-schedule').then(async (res) => {
      if (!res.ok) return
      setData(await res.json())
      setLoading(false)
    })
  }, [])

  async function assign(transactionId: string) {
    const executorNik = selectedExecutor[transactionId]
    const platNumber = selectedFleet[transactionId]
    if (!executorNik || !platNumber) {
      setFeedback((current) => ({ ...current, [transactionId]: 'Executor dan Armada wajib dipilih.' }))
      return
    }

    setFeedback((current) => ({ ...current, [transactionId]: 'Menyelesaikan assignment...' }))
    const formData = new FormData()
    formData.set('transactionId', transactionId)
    formData.set('executorNik', executorNik)
    formData.set('platNumber', platNumber)
    const result = await assignExtraScheduleAction({}, formData)
    setFeedback((current) => ({ ...current, [transactionId]: result.success ?? result.error ?? '' }))
    if (result.success) {
      setData((current) => ({ ...current, requests: current.requests.filter((item) => item.transaction_id !== transactionId) }))
    }
  }

  return (
    <div>
      <div className="page-heading">
          <span className="eyebrow">Dispatcher</span>
          <h1>Extra Schedule</h1>
          <p>Terima request dari Operation, lalu assign Executor dan Armada.</p>
        </div>

      <section className="data-table-card">
        {loading ? <div className="empty-state">Memuat request...</div> : null}
        {!loading && data.requests.length === 0 ? <div className="empty-state">Belum ada request Extra Schedule yang menunggu assignment.</div> : null}
        {!loading && data.requests.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Transaction ID</th><th>Rute</th><th>STD</th><th>STA</th><th>Executor</th><th>Armada</th><th>Aksi</th></tr>
              </thead>
              <tbody>
                {data.requests.map((request) => (
                  <tr key={request.transaction_id}>
                    <td><strong>{request.transaction_id}</strong></td>
                    <td>{request.start_point} → {request.destination}</td>
                    <td>{request.std ? new Date(request.std).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-'}</td>
                    <td>{request.sta ? new Date(request.sta).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-'}</td>
                    <td>
                      <SearchableMasterSelect
                        label="Executor"
                        name={'executor-' + request.transaction_id}
                        options={executorOptions}
                        placeholder="Pilih Executor"
                        value={selectedExecutor[request.transaction_id] ?? ''}
                        onValueChange={(value) => setSelectedExecutor((current) => ({ ...current, [request.transaction_id]: value }))}
                      />
                    </td>
                    <td>
                      <SearchableMasterSelect
                        label="Armada"
                        name={'fleet-' + request.transaction_id}
                        options={fleetOptions}
                        placeholder="Pilih Armada"
                        value={selectedFleet[request.transaction_id] ?? ''}
                        onValueChange={(value) => setSelectedFleet((current) => ({ ...current, [request.transaction_id]: value }))}
                      />
                    </td>
                    <td>
                      <button type="button" onClick={() => assign(request.transaction_id)}>Assign</button>
                      {feedback[request.transaction_id] ? <div className="inline-feedback">{feedback[request.transaction_id]}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  )
}
