'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'

type Result = { error?: string; success?: string }

async function getTask(transactionId: string, statuses: string[]) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('tasks')
    .select('*')
    .eq('transaction_id', transactionId)
    .in('status', statuses)
    .maybeSingle()
  return { admin, task: data }
}

function allowedExecutor(profileRole: string, taskNik: string | null | undefined, profileNik: string) {
  return profileRole === 'Super User' || (profileRole === 'Executor' && taskNik === profileNik)
}

function requiresSj(task: Record<string, any>) {
  return task.task_type === 'Extra Schedule' || (task.task_type === 'Supply' && task.fleet_ownership === 'TGR')
}

export async function acceptExtraScheduleAction(formData: FormData): Promise<Result> {
  const profile = await getCurrentProfile()
  const transactionId = String(formData.get('transactionId') ?? '').trim()
  const { admin, task } = await getTask(transactionId, ['Assigned'])

  if (!task || task.fleet_ownership === 'Non-TGR' || !allowedExecutor(profile.role, task.executor_nik, profile.nik)) {
    return { error: 'Tugas tidak tersedia untuk kamu.' }
  }

  const { error } = await admin
    .from('tasks')
    .update({ status: 'Accepted', accepted_at: new Date().toISOString() })
    .eq('id', task.id)
    .eq('status', 'Assigned')

  if (error) return { error: 'Konfirmasi menerima tugas belum berhasil.' }

  revalidateExecutorPaths()
  return { success: 'Tugas sudah diterima.' }
}

export async function submitExtraScheduleSjAction(formData: FormData): Promise<Result> {
  const profile = await getCurrentProfile()
  const transactionId = String(formData.get('transactionId') ?? '').trim()
  const sjNumber = String(formData.get('sjNumber') ?? '').trim()
  const qty = Number(formData.get('qty'))
  const weight = Number(formData.get('weight'))
  const product = String(formData.get('product') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim()

  if (!sjNumber || !Number.isFinite(qty) || !Number.isFinite(weight) || !product) {
    return { error: 'Nomor SJ, Qty, Berat, dan Produk wajib diisi.' }
  }

  const { admin, task } = await getTask(transactionId, ['Accepted'])
  if (!task || !requiresSj(task) || !allowedExecutor(profile.role, task.executor_nik, profile.nik)) {
    return { error: 'Tugas tidak tersedia untuk proses SJ.' }
  }

  const { data: productData } = await admin
    .from('products')
    .select('product, status')
    .eq('product', product)
    .eq('status', 'Active')
    .maybeSingle()

  if (!productData) return { error: 'Produk tidak tersedia.' }

  const { error } = await admin
    .from('tasks')
    .update({
      sj_number: sjNumber,
      sj_qty: qty,
      sj_weight: weight,
      product,
      product_snapshot: productData,
      sj_note: note || null,
    })
    .eq('id', task.id)
    .eq('status', 'Accepted')

  if (error) return { error: 'SJ belum berhasil disimpan.' }

  revalidateExecutorPaths()
  return { success: 'SJ berhasil disimpan.' }
}

export async function saveOdometerStartAction(formData: FormData): Promise<Result> {
  const profile = await getCurrentProfile()
  const transactionId = String(formData.get('transactionId') ?? '').trim()
  const value = Number(formData.get('odometerStart'))
  if (!Number.isFinite(value) || value < 0) return { error: 'Odometer Awal belum benar.' }

  const { admin, task } = await getTask(transactionId, ['Accepted'])
  if (!task || !allowedExecutor(profile.role, task.executor_nik, profile.nik)) return { error: 'Tugas tidak tersedia untuk kamu.' }
  if (requiresSj(task) && !task.sj_number) return { error: 'Submit SJ terlebih dahulu.' }

  const { error } = await admin.from('tasks').update({ odometer_start: value }).eq('id', task.id).eq('status', 'Accepted')
  if (error) return { error: 'Odometer Awal belum berhasil disimpan.' }
  revalidateExecutorPaths()
  return { success: 'Odometer Awal tersimpan.' }
}

export async function confirmDrivingAction(formData: FormData): Promise<Result> {
  const profile = await getCurrentProfile()
  const transactionId = String(formData.get('transactionId') ?? '').trim()
  const { admin, task } = await getTask(transactionId, ['Accepted'])
  if (!task || task.fleet_ownership === 'Non-TGR' || !allowedExecutor(profile.role, task.executor_nik, profile.nik)) return { error: 'Tugas tidak tersedia untuk kamu.' }
  if (requiresSj(task) && !task.sj_number) return { error: 'Submit SJ terlebih dahulu.' }
  if (task.odometer_start === null) return { error: 'Isi Odometer Awal terlebih dahulu.' }

  const { error } = await admin
    .from('tasks')
    .update({ status: 'Driving', driving_at: new Date().toISOString() })
    .eq('id', task.id)
    .eq('status', 'Accepted')
  if (error) return { error: 'Konfirmasi Berangkat belum berhasil.' }
  revalidateExecutorPaths()
  return { success: 'Berangkat sudah dikonfirmasi.' }
}

export async function confirmArrivalAction(formData: FormData): Promise<Result> {
  const profile = await getCurrentProfile()
  const transactionId = String(formData.get('transactionId') ?? '').trim()
  const { admin, task } = await getTask(transactionId, ['Driving'])
  if (!task || !allowedExecutor(profile.role, task.executor_nik, profile.nik)) return { error: 'Tugas tidak tersedia untuk kamu.' }

  const { error } = await admin
    .from('tasks')
    .update({ arrived_at: new Date().toISOString() })
    .eq('id', task.id)
    .eq('status', 'Driving')
    .is('arrived_at', null)

  if (error) return { error: 'Konfirmasi Datang belum berhasil.' }
  revalidateExecutorPaths()
  return { success: 'Kedatangan sudah dikonfirmasi.' }
}

export async function saveOdometerEndAction(formData: FormData): Promise<Result> {
  const profile = await getCurrentProfile()
  const transactionId = String(formData.get('transactionId') ?? '').trim()
  const value = Number(formData.get('odometerEnd'))
  if (!Number.isFinite(value) || value < 0) return { error: 'Odometer Akhir belum benar.' }

  const { admin, task } = await getTask(transactionId, ['Driving'])
  if (!task || !allowedExecutor(profile.role, task.executor_nik, profile.nik)) return { error: 'Tugas tidak tersedia untuk kamu.' }
  if (!task.arrived_at) return { error: 'Konfirmasi Datang terlebih dahulu.' }
  if (task.odometer_start !== null && value < Number(task.odometer_start)) return { error: 'Odometer Akhir tidak boleh lebih kecil dari Odometer Awal.' }

  const { error } = await admin.from('tasks').update({ odometer_end: value }).eq('id', task.id).eq('status', 'Driving')
  if (error) return { error: 'Odometer Akhir belum berhasil disimpan.' }
  revalidateExecutorPaths()
  return { success: 'Odometer Akhir tersimpan.' }
}

export async function confirmCompletedAction(formData: FormData): Promise<Result> {
  const profile = await getCurrentProfile()
  const transactionId = String(formData.get('transactionId') ?? '').trim()
  const { admin, task } = await getTask(transactionId, ['Driving'])
  if (!task || !allowedExecutor(profile.role, task.executor_nik, profile.nik)) return { error: 'Tugas tidak tersedia untuk kamu.' }
  if (!task.arrived_at) return { error: 'Konfirmasi Datang terlebih dahulu.' }
  if (task.odometer_end === null) return { error: 'Isi Odometer Akhir terlebih dahulu.' }

  const { error } = await admin
    .from('tasks')
    .update({ status: 'Completed', completed_at: new Date().toISOString() })
    .eq('id', task.id)
    .eq('status', 'Driving')
  if (error) return { error: 'Konfirmasi selesai belum berhasil.' }
  revalidateExecutorPaths()
  return { success: 'Tugas selesai.' }
}

function revalidateExecutorPaths() {
  revalidatePath('/executor/tugas-saya')
  revalidatePath('/executor/riwayat-tugas')
  revalidatePath('/dispatcher/beranda')
  revalidatePath('/dispatcher/riwayat-penugasan')
  revalidatePath('/controller/beranda')
  revalidatePath('/controller/timetable')
}
