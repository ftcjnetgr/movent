'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'

type Result = { error?: string; success?: string }

function manualTimestamp(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null

  const [, year, month, day, hour, minute] = match
  const iso = `${year}-${month}-${day}T${hour}:${minute}:00+07:00`
  const parsed = new Date(iso)

  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

export async function submitNonTgrDepartureAction(formData: FormData): Promise<Result> {
  const profile = await getCurrentProfile()
  if (!['Dispatcher', 'Super User'].includes(profile.role)) return { error: 'Kamu belum punya akses ke bagian ini.' }

  const transactionId = String(formData.get('transactionId') ?? '').trim()
  const departure = String(formData.get('departure') ?? '').trim()
  const timestamp = manualTimestamp(departure)
  if (!transactionId || !timestamp) return { error: 'Tanggal dan jam keberangkatan perlu diisi dulu, ya.' }

  const admin = createAdminClient()
  const { data: task } = await admin
    .from('tasks')
    .select('id, status, fleet_ownership')
    .eq('transaction_id', transactionId)
    .eq('task_type', 'Supply')
    .eq('fleet_ownership', 'Non-TGR')
    .eq('status', 'Assigned')
    .maybeSingle()

  if (!task) return { error: 'Tugas Armada Non-TGR tidak ditemukan atau sudah diproses.' }

  const { error } = await admin
    .from('tasks')
    .update({
      status: 'Driving',
      external_departure_at: timestamp,
      driving_at: new Date().toISOString(),
    })
    .eq('id', task.id)
    .eq('status', 'Assigned')

  if (error) return { error: 'Submit keberangkatan belum berhasil.' }

  revalidatePaths()
  return { success: 'Keberangkatan berhasil disubmit.' }
}

export async function submitNonTgrArrivalAction(formData: FormData): Promise<Result> {
  const profile = await getCurrentProfile()
  if (!['Dispatcher', 'Super User'].includes(profile.role)) return { error: 'Kamu belum punya akses ke bagian ini.' }

  const transactionId = String(formData.get('transactionId') ?? '').trim()
  const arrival = String(formData.get('arrival') ?? '').trim()
  const timestamp = manualTimestamp(arrival)
  if (!transactionId || !timestamp) return { error: 'Tanggal dan jam kedatangan perlu diisi dulu, ya.' }

  const admin = createAdminClient()
  const { data: task } = await admin
    .from('tasks')
    .select('id, status, fleet_ownership, external_departure_at')
    .eq('transaction_id', transactionId)
    .eq('task_type', 'Supply')
    .eq('fleet_ownership', 'Non-TGR')
    .eq('status', 'Driving')
    .maybeSingle()

  if (!task || !task.external_departure_at) return { error: 'Tugas belum memiliki waktu keberangkatan.' }

  const { error } = await admin
    .from('tasks')
    .update({
      status: 'Completed',
      external_arrival_at: timestamp,
      completed_at: new Date().toISOString(),
    })
    .eq('id', task.id)
    .eq('status', 'Driving')

  if (error) return { error: 'Submit kedatangan belum berhasil.' }

  revalidatePaths()
  redirect('/dispatcher/armada-non-tgr')
}

function revalidatePaths() {
  revalidatePath('/dispatcher/armada-non-tgr')
  revalidatePath('/dispatcher/beranda')
  revalidatePath('/dispatcher/riwayat-penugasan')
  revalidatePath('/dispatcher/timetable')
  revalidatePath('/controller/beranda')
  revalidatePath('/controller/timetable')
}
