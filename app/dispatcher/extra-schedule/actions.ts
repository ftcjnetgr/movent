'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'

type State = { error?: string; success?: string }

export async function assignExtraScheduleAction(_state: State, formData: FormData): Promise<State> {
  const profile = await getCurrentProfile()
  if (!['Dispatcher', 'Super User'].includes(profile.role)) {
    return { error: 'Akses tidak tersedia.' }
  }

  const transactionId = String(formData.get('transactionId') ?? '').trim()
  const executorNik = String(formData.get('executorNik') ?? '').trim()
  const platNumber = String(formData.get('platNumber') ?? '').trim()

  if (!transactionId || !executorNik || !platNumber) {
    return { error: 'Executor dan Nomor Plat wajib dipilih.' }
  }

  const admin = createAdminClient()

  const [{ data: task }, { data: executor }, { data: fleet }] = await Promise.all([
    admin
      .from('tasks')
      .select('id, status, source_type, task_type')
      .eq('transaction_id', transactionId)
      .eq('source_type', 'Extra Schedule')
      .eq('status', 'Requested')
      .maybeSingle(),
    admin
      .from('executors')
      .select('executor_nik, full_name, status')
      .eq('executor_nik', executorNik)
      .eq('status', 'Active')
      .maybeSingle(),
    admin
      .from('fleets')
      .select('plat_number, fleet_type, status')
      .eq('plat_number', platNumber)
      .eq('status', 'Active')
      .maybeSingle(),
  ])

  if (!task) return { error: 'Request Extra Schedule tidak ditemukan atau sudah di-assign.' }
  if (!executor) return { error: 'Executor tidak tersedia.' }
  if (!fleet) return { error: 'Armada tidak tersedia.' }

  const { error } = await admin
    .from('tasks')
    .update({
      assigned_by: profile.id,
      executor_nik: executor.executor_nik,
      executor_snapshot: executor,
      fleet_snapshot: fleet,
      status: 'Assigned',
      assigned_at: new Date().toISOString(),
    })
    .eq('id', task.id)
    .eq('status', 'Requested')

  if (error) return { error: 'Assignment belum berhasil diselesaikan. Coba lagi.' }

  revalidatePath('/dispatcher/extra-schedule')
  revalidatePath('/operation/riwayat-permintaan')
  revalidatePath('/executor/tugas-saya')
  revalidatePath('/controller/beranda')

  return { success: `Extra Schedule ${transactionId} berhasil di-assign.` }
}
