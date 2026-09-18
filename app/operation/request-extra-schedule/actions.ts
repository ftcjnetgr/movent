'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'

type State = { error?: string; success?: string }

function jakartaTimestamp(time: string) {
  const parts = time.split(':')
  if (parts.length !== 2) return null
  const [hour, minute] = parts.map(Number)
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null
  }

  const now = new Date()
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)

  return `${date}T${time}:00+07:00`
}

export async function createExtraScheduleAction(_state: State, formData: FormData): Promise<State> {
  const profile = await getCurrentProfile()

  if (profile.role !== 'Operation' && profile.role !== 'Super User') {
    return { error: 'Kamu belum punya akses ke bagian ini.' }
  }

  const startPoint = String(formData.get('startPoint') ?? '').trim()
  const destination = String(formData.get('destination') ?? '').trim()
  const std = String(formData.get('std') ?? '').trim()
  const sta = String(formData.get('sta') ?? '').trim()

  if (!startPoint || !destination || !std || !sta) {
    return { error: 'Start Point, Destinasi, STD, dan STA perlu diisi dulu, ya.' }
  }

  const stdTimestamp = jakartaTimestamp(std)
  const staTimestamp = jakartaTimestamp(sta)

  if (!stdTimestamp || !staTimestamp) {
    return { error: 'Format STD atau STA belum benar.' }
  }

  const admin = createAdminClient()
  const { data: activeLocations } = await admin
    .from('locations')
    .select('location, grouping, status')
    .eq('status', 'Active')
    .in('location', [startPoint, destination])

  const activeLocationNames = new Set((activeLocations ?? []).map((item) => item.location))
  if (!activeLocationNames.has(startPoint) || !activeLocationNames.has(destination)) {
    return { error: 'Start Point dan Destinasi harus berasal dari Database Lokasi yang Active.' }
  }

  const { data: transactionId, error: transactionError } = await admin.rpc('movent_next_transaction_id')
  if (transactionError || !transactionId) {
    return { error: 'ID transaksi belum berhasil dibuat. Coba lagi, ya. Coba lagi, ya.' }
  }

  const { error: insertError } = await admin.from('tasks').insert({
    transaction_id: transactionId,
    source_type: 'Extra Schedule',
    task_type: 'Extra Schedule',
    status: 'Requested',
    created_by: profile.id,
    requested_by: profile.id,
    start_point: startPoint,
    destination,
    std: stdTimestamp,
    sta: staTimestamp,
    requested_at: new Date().toISOString(),
  })

  if (insertError) {
    return { error: 'Request Extra Schedule belum berhasil dibuat. Coba lagi, ya.' }
  }

  revalidatePath('/operation/request-extra-schedule')
  revalidatePath('/operation/riwayat-permintaan')
  revalidatePath('/dispatcher/extra-schedule')
  revalidatePath('/controller/beranda')
  revalidatePath('/dispatcher/beranda')
  revalidatePath('/maintainer/beranda')

  return { success: `Request ${transactionId} berhasil diajukan.` }
}

export async function cancelExtraScheduleAction(formData: FormData) {
  const profile = await getCurrentProfile()
  const transactionId = String(formData.get('transactionId') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim()

  if (!transactionId || !note) {
    return { error: 'Transaction ID dan alasan pembatalan perlu diisi dulu, ya.' }
  }

  if (profile.role !== 'Operation' && profile.role !== 'Super User') {
    return { error: 'Kamu belum punya akses ke bagian ini.' }
  }

  const admin = createAdminClient()
  let query = admin
    .from('tasks')
    .select('id, status, requested_by')
    .eq('transaction_id', transactionId)
    .eq('source_type', 'Extra Schedule')
    .eq('status', 'Requested')

  if (profile.role !== 'Super User') {
    query = query.eq('requested_by', profile.id)
  }

  const { data: task, error: findError } = await query.maybeSingle()
  if (findError || !task) {
    return { error: 'Request tidak ditemukan atau sudah tidak bisa dibatalkan.' }
  }

  const { error } = await admin
    .from('tasks')
    .update({
      status: 'Canceled',
      canceled_at: new Date().toISOString(),
      canceled_from_status: 'Requested',
      cancellation_note: note,
    })
    .eq('id', task.id)

  if (error) {
    return { error: 'Request belum berhasil dibatalkan. Coba lagi, ya.' }
  }

  revalidatePath('/operation/riwayat-permintaan')
  revalidatePath('/dispatcher/extra-schedule')
  revalidatePath('/controller/beranda')

  redirect('/operation/riwayat-permintaan')
}
