'use client'

import { useState } from 'react'
import DispatcherCreateTask from '@/components/dispatcher-create-task'
import DispatcherMaintenanceForm from '@/components/dispatcher-maintenance-form'

type Props = {
  locations: string[]
  schedules: Array<{ schedule_id: string; route: string; category: string; start_point: string; destination: string; std: string; sta: string; trip: number }>
  executors: Array<{ executor_nik: string; full_name: string }>
  fleets: Array<{ plat_number: string; fleet_type: string }>
  products: string[]
  maintenanceLists: string[]
  tickets: Array<{
    transaction_id: string
    status: string
    maintenance_list: string | null
    location: string | null
    fleet_plat_number: string | null
    created_at: string
    created_by: string
    cancellation_note: string | null
  }>
}

export default function DispatcherCreationHub(props: Props) {
  const [choice, setChoice] = useState<'task' | 'ticket' | null>(null)

  if (!choice) {
    return (
      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Buat Proses Baru</h2>
            <p>Pilih dulu proses yang mau dibuat. Setelah itu baru isi detailnya.</p>
          </div>
        </div>
        <div className="creation-choice-grid">
          <button type="button" className="creation-choice-card" onClick={() => setChoice('task')}>
            <span className="creation-choice-icon">▤</span>
            <span><strong>Buat Penugasan</strong><small>Pilih jenis penugasan, lalu lengkapi detail perjalanan.</small></span>
            <b>→</b>
          </button>
          <button type="button" className="creation-choice-card" onClick={() => setChoice('ticket')}>
            <span className="creation-choice-icon">⌁</span>
            <span><strong>Buat Ticketing Maintenance</strong><small>Pilih kebutuhan maintenance, lokasi, dan armada.</small></span>
            <b>→</b>
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="section-block">
      <div className="creation-flow-toolbar">
        <div>
          <span className="eyebrow">PROSES BARU</span>
          <strong>{choice === 'task' ? 'Penugasan' : 'Ticketing Maintenance'}</strong>
        </div>
        <button type="button" className="secondary-button" onClick={() => setChoice(null)}>Ganti proses</button>
      </div>
      {choice === 'task' ? (
        <DispatcherCreateTask
          locations={props.locations}
          schedules={props.schedules}
          executors={props.executors}
          fleets={props.fleets}
          products={props.products}
        />
      ) : (
        <DispatcherMaintenanceForm
          maintenanceLists={props.maintenanceLists}
          locations={props.locations}
          fleets={props.fleets}
          tickets={props.tickets}
        />
      )}
    </section>
  )
}
