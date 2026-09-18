'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'

type Result = { error?: string; success?: string }

async function findTicket(transactionId: string, statuses: string[]) {
  const admin = createAdminClient()
  const { data: ticket } = await admin
    .from('ticketings')
    .select('*')
    .eq('transaction_id', transactionId)
    .in('status', statuses)
    .maybeSingle()
  return { admin, ticket }
}

function allowedMaintainer(role: string) {
  return role === 'Maintainer' || role === 'Super User'
}

export async function acceptMaintenanceTicketAction(formData: FormData): Promise<Result> {
  const profile = await getCurrentProfile()
  if (!allowedMaintainer(profile.role)) return { error: 'Kamu belum punya akses ke bagian ini.' }

  const transactionId = String(formData.get('transactionId') ?? '').trim()
  const { admin, ticket } = await findTicket(transactionId, ['Created'])
  if (!ticket) return { error: 'Tiket tidak ditemukan atau sudah diproses.' }

  const { error } = await admin.from('ticketings').update({
    status: 'Accepted',
    maintainer_user_id: profile.id,
    accepted_at: new Date().toISOString(),
  }).eq('id', ticket.id).eq('status', 'Created')

  if (error) return { error: 'Konfirmasi menerima tiket belum berhasil.' }
  revalidatePath('/maintainer/tiket-maintenance')
  revalidatePath('/dispatcher/maintenance-armada')
  revalidatePath('/controller/beranda')
  return { success: 'Tiket sudah diterima.' }
}

export async function startMaintenanceAction(formData: FormData): Promise<Result> {
  const profile = await getCurrentProfile()
  if (!allowedMaintainer(profile.role)) return { error: 'Kamu belum punya akses ke bagian ini.' }
  const transactionId = String(formData.get('transactionId') ?? '').trim()
  const { admin, ticket } = await findTicket(transactionId, ['Accepted'])
  if (!ticket) return { error: 'Tiket nggak ditemukan.' }
  if (profile.role !== 'Super User' && ticket.maintainer_user_id !== profile.id) return { error: 'Tiket ini bukan tanggung jawab kamu.' }

  const { error } = await admin.from('ticketings').update({
    status: 'In Progress',
    in_progress_at: new Date().toISOString(),
  }).eq('id', ticket.id).eq('status', 'Accepted')

  if (error) return { error: 'Pengerjaan maintenance belum berhasil dimulai.' }
  revalidatePath('/maintainer/tiket-maintenance')
  revalidatePath('/controller/beranda')
  return { success: 'Pengerjaan maintenance dimulai.' }
}

export async function completeMaintenanceAction(formData: FormData): Promise<Result> {
  const profile = await getCurrentProfile()
  if (!allowedMaintainer(profile.role)) return { error: 'Kamu belum punya akses ke bagian ini.' }
  const transactionId = String(formData.get('transactionId') ?? '').trim()
  const { admin, ticket } = await findTicket(transactionId, ['In Progress'])
  if (!ticket) return { error: 'Tiket nggak ditemukan.' }
  if (profile.role !== 'Super User' && ticket.maintainer_user_id !== profile.id) return { error: 'Tiket ini bukan tanggung jawab kamu.' }

  const { error } = await admin.from('ticketings').update({
    status: 'Completed',
    completed_at: new Date().toISOString(),
  }).eq('id', ticket.id).eq('status', 'In Progress')

  if (error) return { error: 'Maintenance belum berhasil diselesaikan.' }
  revalidatePath('/maintainer/tiket-maintenance')
  revalidatePath('/controller/beranda')
  revalidatePath('/dispatcher/beranda')
  return { success: 'Maintenance selesai.' }
}
