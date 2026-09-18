'use client'

import { FormEvent, useState, useTransition } from 'react'
import {
  cancelMaintenanceTicketAction,
  createMaintenanceTicketAction,
} from '@/app/dispatcher/maintenance-armada/actions'

const initialState: { error?: string; success?: string; transactionId?: string } = {}

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
  const [state, formAction, pending] = useActionState(createMaintenanceTicketAction, initialState)
  const [cancelMessage, setCancelMessage] = useState('')
  const [isCancelPending, startCancelTransition] = useTransition()

  function handleCancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startCancelTransition(async () => {
      const result = await cancelMaintenanceTicketAction(formData)
      setCancelMessage(result.success ?? result.error ?? '')
      if (result.success) window.location.reload()
    })
  }

  return (
    <section>
      <section className="section-grid two-column">
        <div className="metric-card">
          <div className="card-title">Buat tiket</div>
          <form action={formAction} className="data-form">
            <label>
              Daftar Maintenance
              <select name="maintenanceList" defaultValue="" required>
                <option value="">Pilih Maintenance</option>
                {maintenanceLists.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Lokasi Keberadaan Armada
              <select name="location" defaultValue="" required>
                <option value="">Pilih Lokasi</option>
                {locations.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Armada
              <select name="platNumber" defaultValue="" required>
                <option value="">Pilih Armada</option>
                {fleets.map((fleet) => <option key={fleet.plat_number} value={fleet.plat_number}>{fleet.plat_number} - {fleet.fleet_type}</option>)}
              </select>
            </label>
            {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
            {state.success ? <p className="form-success" role="status">{state.success}</p> : null}
            <button type="submit" disabled={pending}>{pending ? 'Membuat tiket...' : 'Buat tiket'}</button>
          </form>
        </div>

        <div className="metric-card">
          <div className="card-title">Pratinjau tiket</div>
          {state.transactionId ? (
            <>
              <h2>{state.transactionId}</h2>
              <p className="muted">Detail tiket siap dibagikan ke WhatsApp.</p>
              <a className="button-link" href={'https://wa.me/?text=' + encodeURIComponent('Tiket Maintenance MOVENT ' + state.transactionId)} target="_blank" rel="noreferrer">Bagikan ke WhatsApp</a>
            </>
          ) : (
            <p className="muted">Pratinjau akan muncul setelah tiket berhasil dibuat.</p>
          )}
        </div>
      </section>

      <section className="data-table-card section-block">
        <div className="section-heading"><div><h2>Tiket yang dibuat</h2><p>Ticketing yang masih tersimpan di riwayat pembuatan.</p></div></div>
        {cancelMessage ? <p className="form-success">{cancelMessage}</p> : null}
        <div className="table-wrap">
          <table>
            <thead><tr><th>Transaction ID</th><th>Maintenance</th><th>Lokasi</th><th>Armada</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.transaction_id}>
                  <td><strong>{ticket.transaction_id}</strong></td>
                  <td>{ticket.maintenance_list ?? '-'}</td>
                  <td>{ticket.location ?? '-'}</td>
                  <td>{ticket.fleet_plat_number ?? '-'}</td>
                  <td><span className={'status-badge status-' + ticket.status.toLowerCase().replaceAll(' ', '-')}>{ticket.status}</span></td>
                  <td>
                    {ticket.status === 'Created' ? (
                      <details>
                        <summary className="link-button">Batalkan</summary>
                        <form onSubmit={handleCancel} className="compact-form" style={{marginTop:12}}>
                          <input type="hidden" name="transactionId" value={ticket.transaction_id} />
                          <input name="note" placeholder="Alasan pembatalan" required />
                          <button type="submit" disabled={isCancelPending}>Konfirmasi batal</button>
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
              {!tickets.length ? <tr><td colSpan={6}><div className="empty-state">Belum ada tiket yang dibuat.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
