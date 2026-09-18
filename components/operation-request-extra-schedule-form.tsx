'use client'

import { useActionState } from 'react'
import { createExtraScheduleAction } from '@/app/operation/request-extra-schedule/actions'
import SearchableMasterSelect from '@/components/searchable-master-select'

const initialState: { error?: string; success?: string } = {}

export default function OperationRequestExtraScheduleForm({ locations }: { locations: string[] }) {
  const [state, formAction, pending] = useActionState(createExtraScheduleAction, initialState)
  const locationOptions = locations.map((location) => ({ value: location, label: location, searchText: location }))

  return (
    <form action={formAction} className="data-form">
      <label>
        Titik Mulai
        <select name="startPoint" defaultValue="" required>
          <option value="">Pilih Titik Mulai</option>
          {locations.map((location) => <option key={location}>{location}</option>)}
        </select>
      </label>
      <label>
        Destinasi
        <select name="destination" defaultValue="" required>
          <option value="">Pilih destinasi</option>
          {locations.map((location) => <option key={location}>{location}</option>)}
        </select>
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
        {pending ? 'Sedang mengajukan...' : 'Ajukan permintaan'}
      </button>
    </form>
  )
}
