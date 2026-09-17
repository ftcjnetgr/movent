'use client'

import { useActionState } from 'react'

import AppShell from '@/components/app-shell'
import { createMaintenanceTicketAction } from './actions'

const initialState: { error?: string; success?: string; transactionId?: string } = {}

export default function DispatcherMaintenanceArmadaPage() {
  const [state, formAction, pending] = useActionState(createMaintenanceTicketAction, initialState)

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Dispatcher</span>
          <h1>Maintenance Armada</h1>
          <p>Buat tiket maintenance untuk armada.</p>
        </div>
      </div>

      <section className="section-grid two-column">
        <div className="metric-card">
          <div className="card-title">Buat tiket</div>
          <form action={formAction} className="data-form">
            <label>
              Daftar Maintenance
              <select name="maintenanceList" defaultValue="" required>
                <option value="">Pilih Maintenance</option>
                <option value="Service Rutin">Service Rutin</option>
                <option value="Ganti Oli">Ganti Oli</option>
                <option value="Ganti Ban">Ganti Ban</option>
                <option value="Perpanjang KIR">Perpanjang KIR</option>
                <option value="Perpanjang STNK">Perpanjang STNK</option>
              </select>
            </label>
            <label>
              Lokasi Keberadaan Armada
              <input name="location" placeholder="Masukkan lokasi" required />
            </label>
            <label>
              Armada
              <input name="platNumber" placeholder="Nomor plat" required />
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
              <p className="muted">Tiket sudah dibuat dan siap dibagikan ke WhatsApp.</p>
              <a className="button-link" href={`https://wa.me/?text=${encodeURIComponent(`Tiket Maintenance MOVENT ${state.transactionId}`)}`} target="_blank" rel="noreferrer">Bagikan ke WhatsApp</a>
            </>
          ) : (
            <p className="muted">Pratinjau akan muncul setelah tiket berhasil dibuat.</p>
          )}
        </div>
      </section>
    </AppShell>
  )
}
