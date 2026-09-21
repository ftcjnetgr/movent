'use client'

import { FormEvent, useState, useTransition } from 'react'
import {
  cancelMaintenanceTicketAction,
  createMaintenanceTicketAction,
  confirmMaintenanceTicketAction,
} from '@/app/dispatcher/maintenance-armada/actions'
import SearchableMasterSelect from '@/components/searchable-master-select'
function ticketStatusLabel(status: string) {
  const labels: Record<string, string> = {
    Requested: 'Diajukan',
    Confirmed: 'Diterima',
    'In Progress': 'Sedang dikerjakan',
    Completed: 'Selesai',
    Canceled: 'Dibatalkan',
  }
  return labels[status] ?? status
}


type MaintenanceFormState = {
  error?: string
  success?: string
  transactionId?: string
  preview?: {
    transactionId: string
    maintenanceList: string
    location: string
    platNumber: string
  }
}

const initialState: MaintenanceFormState = {}

type Ticket = {
  transaction_id: string
  status: string
  maintenance_list: string | null
  location: string | null
  fleet_plat_number: string | null
  created_at: string
  created_by: string
  cancellation_note: string | null
}

type Props = {
  maintenanceLists: string[]
  locations: string[]
  fleets: Array<{ plat_number: string; fleet_type: string }>
  tickets: Ticket[]
}

export default function DispatcherMaintenanceForm({ maintenanceLists, locations, fleets, tickets }: Props) {
  const [state, setState] = useState<MaintenanceFormState>(initialState)
  const [isCreatePending, startCreateTransition] = useTransition()
  const [cancelMessage, setCancelMessage] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [isCancelPending, startCancelTransition] = useTransition()
  const [isConfirmPending, startConfirmTransition] = useTransition()
  const maintenanceOptions = maintenanceLists.map((item) => ({ value: item, label: item, searchText: item }))
  const locationOptions = locations.map((item) => ({ value: item, label: item, searchText: item }))
  const fleetOptions = fleets.map((fleet) => ({
    value: fleet.plat_number,
    label: fleet.plat_number + ' - ' + fleet.fleet_type,
    searchText: fleet.plat_number + ' ' + fleet.fleet_type,
  }))

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startCreateTransition(async () => {
      const result = await createMaintenanceTicketAction({}, formData)
      setState(result)
    })
  }

  function handleCancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startCancelTransition(async () => {
      const result = await cancelMaintenanceTicketAction(formData)
      setCancelMessage(result.error ?? '')
    })
  }

  return (
    <section>
      <section className="section-grid two-column">
        <div className="metric-card">
          <div className="card-title">Buat Ticketing Maintenance</div>
          <p className="muted">Pilih kebutuhan maintenance, lokasi armada, dan armada yang akan ditangani.</p>
          {!showCreate ? (
            <button type="button" onClick={() => setShowCreate(true)}>Buat Ticketing</button>
          ) : (
          <form onSubmit={handleCreate} className="data-form">
            <SearchableMasterSelect label="Daftar Maintenance" name="maintenanceList" options={maintenanceOptions} placeholder="Pilih jenis maintenance" required />
            <SearchableMasterSelect label="Lokasi Keberadaan Armada" name="location" options={locationOptions} placeholder="Pilih lokasi armada" required />
            <SearchableMasterSelect label="Armada" name="platNumber" options={fleetOptions} placeholder="Pilih Armada" required />
            {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
            {state.success ? <p className="form-success" role="status">{state.success}</p> : null}
            <div className="form-actions">
              <button type="submit" disabled={isCreatePending}>{isCreatePending ? 'Sedang menyimpan...' : 'Submit Ticketing'}</button>
              <button type="button" className="secondary-button" onClick={() => setShowCreate(false)}>Batal</button>
            </div>
          </form>
          )}
        </div>

        <div className="metric-card">
          <div className="card-title">Preview Ticketing</div>
          {state.preview ? (
            <>
              <span className="eyebrow">PREVIEW</span><h2>{state.preview.transactionId}</h2>
              <div className="compact-form">
                <div><span className="muted">Daftar Maintenance</span><strong>{state.preview.maintenanceList}</strong></div>
                <div><span className="muted">Lokasi</span><strong>{state.preview.location}</strong></div>
                <div><span className="muted">Armada</span><strong>{state.preview.platNumber}</strong></div>
              </div>
              <p className="muted">Periksa kembali data sebelum dikonfirmasi.</p>
              <form action={(formData) => {
                startConfirmTransition(async () => {
                  const result = await confirmMaintenanceTicketAction({}, formData)
                  setState(result)
                })
              }} className="compact-form">
                <input type="hidden" name="transactionId" value={state.preview.transactionId} />
                <input type="hidden" name="maintenanceList" value={state.preview.maintenanceList} />
                <input type="hidden" name="location" value={state.preview.location} />
                <input type="hidden" name="platNumber" value={state.preview.platNumber} />
                {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
                {state.success ? <p className="form-success" role="status">{state.success}</p> : null}
                <div className="form-actions">
                  <button type="submit" disabled={isConfirmPending}>{isConfirmPending ? 'Mengonfirmasi...' : 'Konfirmasi Ticket'}</button>
                  <button type="button" className="secondary-button" onClick={() => setState({})}>Edit Ticket</button>
                </div>
              </form>
            </>
          ) : (
            <p className="muted">Preview ticketing akan muncul setelah data berhasil disimpan.</p>
          )}
        </div>
      </section>

      <section className="data-table-card section-block">
        <div className="section-heading"><div><h2>Tiket yang sudah dibuat</h2><p>Tiket yang masih tersimpan di riwayat pembuatan.</p></div></div>
        {cancelMessage ? <p className="form-success">{cancelMessage}</p> : null}
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID Transaksi</th><th>Maintenance</th><th>Lokasi</th><th>Armada</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.transaction_id}>
                  <td><strong>{ticket.transaction_id}</strong></td>
                  <td>{ticket.maintenance_list ?? '-'}</td>
                  <td>{ticket.location ?? '-'}</td>
                  <td>{ticket.fleet_plat_number ?? '-'}</td>
                  <td><span className={'status-badge status-' + ticket.status.toLowerCase().replaceAll(' ', '-')}>{ticketStatusLabel(ticket.status)}</span></td>
                  <td>
                    {ticket.status === 'Requested' ? (
                      <details>
                        <summary className="link-button">Batalkan</summary>
                        <form onSubmit={handleCancel} className="compact-form" style={{marginTop:12}}>
                          <input type="hidden" name="transactionId" value={ticket.transaction_id} />
                          <input name="note" placeholder="Tulis alasan pembatalan" required />
                          <button type="submit" disabled={isCancelPending}>Ya, batalkan</button>
                        </form>
                      </details>
                    ) : ticket.status === 'Canceled' ? (
                      <span className="muted">{ticket.cancellation_note ?? '-'}</span>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {!tickets.length ? <tr><td colSpan={6}><div className="empty-state">Belum ada tiket yang dibuat untuk sekarang.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
