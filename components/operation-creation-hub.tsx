'use client'

import { useState } from 'react'
import OperationCreateTask from '@/components/operation-create-task'
import OperationRequestExtraScheduleForm from '@/components/operation-request-extra-schedule-form'

export default function OperationCreationHub({
  locations,
  products,
  tasks,
}: {
  locations: string[]
  products: string[]
  tasks: Array<{
    transaction_id: string
    status: string
    start_point: string | null
    destination: string | null
    std: string | null
    sta: string | null
    external_executor: string | null
    external_fleet: string | null
    sj_number: string | null
    sj_qty: number | null
    sj_weight: number | null
    product: string | null
    sj_note: string | null
  }>
}) {
  const [choice, setChoice] = useState<'supply' | 'schedule' | null>(null)

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
          <button type="button" className="creation-choice-card" onClick={() => setChoice('supply')}>
            <span className="creation-choice-icon">SP</span>
            <span><strong>Buat Supply Non-TGR</strong><small>Lengkapi detail perjalanan dan surat jalan.</small></span>
            <b>→</b>
          </button>
          <button type="button" className="creation-choice-card" onClick={() => setChoice('schedule')}>
            <span className="creation-choice-icon">JS</span>
            <span><strong>Request Extra Schedule</strong><small>Ajukan jadwal tambahan ke Dispatcher.</small></span>
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
          <strong>{choice === 'supply' ? 'Supply Non-TGR' : 'Request Extra Schedule'}</strong>
        </div>
        <button type="button" className="secondary-button" onClick={() => setChoice(null)}>Ganti proses</button>
      </div>

      {choice === 'supply' ? (
        <OperationCreateTask locations={locations} products={products} tasks={tasks} />
      ) : (
        <div className="metric-card operation-request-card">
          <p className="muted">Isi Start Point, Destination, STD, dan STA. Setelah dikonfirmasi, request masuk ke Dispatcher.</p>
          <OperationRequestExtraScheduleForm locations={locations} />
        </div>
      )}
    </section>
  )
}
