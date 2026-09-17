'use client'

import { useActionState } from 'react'

import AppShell from '@/components/app-shell'
import { createExtraScheduleAction } from './actions'

const initialState: { error?: string; success?: string } = {}

export default function RequestExtraSchedulePage() {
  const [state, formAction, pending] = useActionState(createExtraScheduleAction, initialState)

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Operation</span>
          <h1>Request Extra Schedule</h1>
          <p>Ajukan kebutuhan perjalanan tambahan ke Dispatcher.</p>
        </div>
      </div>

      <section className="section-grid two-column">
        <div className="metric-card">
          <div className="card-title">Buat request</div>
          <p className="muted">Isi kebutuhan perjalanan tambahan yang mau diajukan.</p>

          <form action={formAction} className="data-form">
            <label>
              Start Point
              <input name="startPoint" placeholder="Masukkan start point" required />
            </label>
            <label>
              Destinasi
              <input name="destination" placeholder="Masukkan destinasi" required />
            </label>
            <div className="form-row">
              <label>
                STD
                <input name="std" type="time" required />
              </label>
              <label>
                STA
                <input name="sta" type="time" required />
              </label>
            </div>

            {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
            {state.success ? <p className="form-success" role="status">{state.success}</p> : null}

            <button type="submit" disabled={pending}>
              {pending ? 'Mengajukan...' : 'Ajukan request'}
            </button>
          </form>
        </div>

        <div className="metric-card">
          <div className="card-title">Alur</div>
          <div className="flow-list">
            <div><strong>Requested</strong><span>Request sudah diajukan dan menunggu assignment.</span></div>
            <div><strong>Assigned</strong><span>Dispatcher sudah memilih Executor dan Armada.</span></div>
            <div><strong>Accepted</strong><span>Executor sudah menerima request.</span></div>
            <div><strong>Driving</strong><span>Executor sudah konfirmasi berangkat.</span></div>
            <div><strong>Completed</strong><span>Seluruh proses Extra Schedule selesai.</span></div>
          </div>
        </div>
      </section>
    </AppShell>
  )
}
