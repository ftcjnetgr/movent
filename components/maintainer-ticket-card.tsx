'use client'

import { FormEvent, useState, useTransition } from 'react'

import {
  acceptMaintenanceTicketAction,
  completeMaintenanceAction,
  startMaintenanceAction,
} from '@/app/maintainer/tiket-maintenance/actions'
function ticketStatusLabel(status: string) {
  const labels: Record<string, string> = {
    Requested: 'Diajukan',
    Confirmed: 'Dikonfirmasi',
    'In Progress': 'Sedang dikerjakan',
    Completed: 'Selesai',
    Canceled: 'Dibatalkan',
  }
  return labels[status] ?? status
}

function nextActionLabel(status: string) {
  if (status === 'Requested') return 'Terima Ticket'
  if (status === 'Confirmed') return 'Konfirmasi Pengerjaan'
  if (status === 'In Progress') return 'Konfirmasi Maintenance Selesai'
  return 'Tidak ada tindakan'
}


type Ticket = {
  transaction_id: string
  status: string
  maintenance_list: string | null
  location: string | null
  fleet_plat_number: string | null
  created_at: string
  accepted_at: string | null
  in_progress_at: string | null
  maintainer_user_id: string | null
}

export default function MaintainerTicketCard({ ticket }: { ticket: Ticket }) {
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function submit(action: (formData: FormData) => Promise<{ error?: string; success?: string }>, form: HTMLFormElement) {
    const formData = new FormData(form)
    startTransition(async () => {
      const result = await action(formData)
      setMessage(result.success ?? result.error ?? '')
      if (result.success) window.location.reload()
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>, action: (formData: FormData) => Promise<{ error?: string; success?: string }>) {
    event.preventDefault()
    submit(action, event.currentTarget)
  }

  return (
    <article className="task-card">
      <div className="task-card-top">
        <div>
          <span className="eyebrow">Tiket Maintenance</span>
          <h2>{ticket.transaction_id}</h2>
        </div>
        <span className={`status-badge status-${ticket.status.toLowerCase().replaceAll(' ', '-')}`}>{ticketStatusLabel(ticket.status)}</span>
      </div>
      <div className="task-next-step">
        <span>LANGKAH BERIKUTNYA</span>
        <strong>{nextActionLabel(ticket.status)}</strong>
      </div>
      <div className="task-summary-grid">
        <div><span>Maintenance</span><strong>{ticket.maintenance_list ?? '-'}</strong></div>
        <div><span>Lokasi</span><strong>{ticket.location ?? '-'}</strong></div>
        <div><span>Armada</span><strong>{ticket.fleet_plat_number ?? '-'}</strong></div>
      </div>
      {message ? <div className="inline-feedback">{message}</div> : null}

      {ticket.status === 'Requested' ? (
        <form onSubmit={(event) => handleSubmit(event, acceptMaintenanceTicketAction)}>
          <input type="hidden" name="transactionId" value={ticket.transaction_id} />
          <button type="submit" disabled={isPending}>Terima Ticket</button>
        </form>
      ) : null}

      {ticket.status === 'Confirmed' ? (
        <form onSubmit={(event) => handleSubmit(event, startMaintenanceAction)}>
          <input type="hidden" name="transactionId" value={ticket.transaction_id} />
          <button type="submit" disabled={isPending}>Konfirmasi Pengerjaan</button>
        </form>
      ) : null}

      {ticket.status === 'In Progress' ? (
        <form onSubmit={(event) => handleSubmit(event, completeMaintenanceAction)}>
          <input type="hidden" name="transactionId" value={ticket.transaction_id} />
          <button type="submit" disabled={isPending}>Konfirmasi Maintenance Selesai</button>
        </form>
      ) : null}
    </article>
  )
}
