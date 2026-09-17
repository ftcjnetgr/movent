'use client'

import { useActionState } from 'react'

import { createMaintenanceTicketAction } from '@/app/dispatcher/maintenance-armada/actions'

const initialState: { error?: string; success?: string; transactionId?: string } = {}

type Props = {
  maintenanceLists: string[]
  locations: string[]
  fleets: Array<{ plat_number: string; fleet_type: string }>
}

export default function DispatcherMaintenanceForm({ maintenanceLists, locations, fleets }: Props) {
  const [state, formAction, pending] = useActionState(createMaintenanceTicketAction, initialState)

  return (
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
            <a className="button-link" href={`https://wa.me/?text=${encodeURIComponent(`Tiket Maintenance MOVENT ${state.transactionId}`)}`} target="_blank" rel="noreferrer">Bagikan ke WhatsApp</a>
          </>
        ) : (
          <p className="muted">Pratinjau akan muncul setelah tiket berhasil dibuat.</p>
        )}
      </div>
    </section>
  )
}
