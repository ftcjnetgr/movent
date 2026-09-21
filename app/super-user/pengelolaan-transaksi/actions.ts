'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'

type Result = { error?: string; success?: string }

async function requireSuperUser() {
  const profile = await getCurrentProfile()
  if (profile.role !== 'Super User') throw new Error('Akses tidak tersedia.')
  return profile
}

function text(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? '').trim()
  return value || null
}

function numberOrNull(formData: FormData, name: string) {
  const raw = text(formData, name)
  if (raw === null) return null
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : null
}

export async function updateTaskTransactionAction(_state: Result, formData: FormData): Promise<Result> {
  try { await requireSuperUser() } catch { return { error: 'Akses tidak tersedia.' } }

  const transactionId = String(formData.get('transactionId') ?? '').trim()
  if (!transactionId) return { error: 'Transaction ID wajib diisi.' }

  const admin = createAdminClient()
  const { data: task } = await admin.from('tasks').select('*').eq('transaction_id', transactionId).maybeSingle()
  if (!task) return { error: 'Tugas tidak ditemukan.' }
  if (task.status === 'Completed') return { error: 'Tugas Completed sudah immutable dan tidak dapat diubah.' }

  const update: Record<string, unknown> = {}

  if (task.schedule_id) {
    const scheduleId = String(formData.get('scheduleId') ?? '').trim()
    if (!scheduleId) return { error: 'Schedule wajib diisi.' }
    const { data: schedule } = await admin.from('schedules').select('*').eq('schedule_id', scheduleId).eq('status', 'Active').maybeSingle()
    if (!schedule) return { error: 'Schedule tidak tersedia.' }
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(task.std ?? new Date().toISOString()))
    update.schedule_id = schedule.schedule_id
    update.schedule_snapshot = schedule
    update.start_point = schedule.start_point
    update.start_point_snapshot = schedule
    update.destination = schedule.destination
    update.destination_snapshot = schedule
    update.std = date + 'T' + schedule.std + '+07:00'
    update.sta = date + 'T' + schedule.sta + '+07:00'
  } else {
    update.start_point = text(formData, 'startPoint')
    update.destination = text(formData, 'destination')
    const std = text(formData, 'std')
    const sta = text(formData, 'sta')
    if (!update.start_point || !update.destination || !std || !sta) return { error: 'Titik Mulai, Destinasi, STD, dan STA wajib diisi.' }
    const toJakartaTimestamp = (value: string) => /^\d{2}:\d{2}$/.test(value) ? value : null
    if (!toJakartaTimestamp(std) || !toJakartaTimestamp(sta)) return { error: 'STD atau STA belum benar.' }
    if (sta <= std) return { error: 'STA harus lebih besar dari STD.' }
  }

  if (task.fleet_ownership === 'Non-TGR') {
    update.external_executor = text(formData, 'externalExecutor')
    update.external_fleet = text(formData, 'externalFleet')
  } else {
    const executorNik = text(formData, 'executorNik')
    const platNumber = text(formData, 'platNumber')
    if (!executorNik || !platNumber) return { error: 'Executor dan Armada wajib diisi.' }
    const [{ data: executor }, { data: fleet }] = await Promise.all([
      admin.from('executors').select('executor_nik, full_name, status').eq('executor_nik', executorNik).eq('status', 'Active').maybeSingle(),
      admin.from('fleets').select('plat_number, fleet_type, status').eq('plat_number', platNumber).eq('status', 'Active').maybeSingle(),
    ])
    if (!executor) return { error: 'Executor tidak tersedia.' }
    if (!fleet) return { error: 'Armada tidak tersedia.' }
    update.executor_nik = executor.executor_nik
    update.executor_snapshot = executor
    update.fleet_snapshot = fleet
  }

  if (!task.schedule_id) {
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(task.std ?? new Date().toISOString()))
    const std = text(formData, 'std')
    const sta = text(formData, 'sta')
    update.std = date + 'T' + std + ':00+07:00'
    update.sta = date + 'T' + sta + ':00+07:00'
  }

  const sjItemsRaw = text(formData, 'sjItemsJson')
  if (sjItemsRaw) {
    let sjItems: Array<{ id?: string; sj_number: string; sj_qty: number; sj_weight: number; product: string; note?: string | null }>
    try { sjItems = JSON.parse(sjItemsRaw) } catch { return { error: 'Data SJ tidak valid.' } }
    if (!Array.isArray(sjItems)) return { error: 'Data SJ tidak valid.' }
    for (const item of sjItems) {
      if (!item.sj_number || !Number.isFinite(Number(item.sj_qty)) || Number(item.sj_qty) < 0 || !Number.isFinite(Number(item.sj_weight)) || Number(item.sj_weight) < 0 || !item.product) return { error: 'Data SJ belum lengkap.' }
      const { data: productData } = await admin.from('products').select('product, status').eq('product', item.product).eq('status', 'Active').maybeSingle()
      if (!productData) return { error: 'Produk SJ tidak tersedia.' }
      const payload = { task_id: task.id, sj_number: item.sj_number.trim(), sj_qty: Number(item.sj_qty), sj_weight: Number(item.sj_weight), product: item.product, product_snapshot: productData, note: item.note?.trim() || null }
      const result = item.id
        ? await admin.from('task_sj_items').update(payload).eq('id', item.id).eq('task_id', task.id)
        : await admin.from('task_sj_items').insert(payload)
      if (result.error) return { error: 'Data SJ belum berhasil diperbarui.' }
    }
    const { data: currentItems } = await admin.from('task_sj_items').select('id').eq('task_id', task.id)
    const keepIds = new Set(sjItems.filter((item) => item.id).map((item) => item.id))
    const removeIds = (currentItems ?? []).map((item) => item.id).filter((id) => !keepIds.has(id))
    if (removeIds.length) { const result = await admin.from('task_sj_items').delete().in('id', removeIds).eq('task_id', task.id); if (result.error) return { error: 'SJ lama belum berhasil dihapus.' } }
    const latest = sjItems[sjItems.length - 1]
    if (latest) { update.sj_number = latest.sj_number; update.sj_qty = Number(latest.sj_qty); update.sj_weight = Number(latest.sj_weight); update.product = latest.product; update.sj_note = latest.note?.trim() || null }
  } else {
  update.sj_number = text(formData, 'sjNumber')
  update.sj_qty = numberOrNull(formData, 'sjQty')
  update.sj_weight = numberOrNull(formData, 'sjWeight')
  update.sj_note = text(formData, 'sjNote')
  update.odometer_start = numberOrNull(formData, 'odometerStart')
  update.odometer_end = numberOrNull(formData, 'odometerEnd')

  }

  const product = text(formData, 'product')
  if (product) {
    const { data: productData } = await admin.from('products').select('product, status').eq('product', product).eq('status', 'Active').maybeSingle()
    if (!productData) return { error: 'Produk tidak tersedia.' }
    update.product = product
    update.product_snapshot = productData
  } else {
    update.product = null
    update.product_snapshot = null
  }

  const odometerStart = update.odometer_start as number | null
  const odometerEnd = update.odometer_end as number | null
  if (odometerStart !== null && odometerEnd !== null && odometerEnd < odometerStart) return { error: 'Odometer Akhir tidak boleh lebih kecil dari Odometer Awal.' }

  const { error } = await admin.from('tasks').update(update).eq('id', task.id).neq('status', 'Completed')
  if (error) return { error: 'Data tugas belum berhasil diperbarui.' }

  revalidatePath('/super-user/pengelolaan-transaksi')
  revalidatePath('/dispatcher/beranda')
  revalidatePath('/dispatcher/riwayat-penugasan')
  revalidatePath('/dispatcher/timetable')
  revalidatePath('/controller/beranda')
  revalidatePath('/controller/timetable')
  revalidatePath('/operation/riwayat-permintaan')
  revalidatePath('/executor/tugas-saya')
  return { success: 'Data tugas berhasil diperbarui.' }
}

export async function updateTicketTransactionAction(_state: Result, formData: FormData): Promise<Result> {
  try { await requireSuperUser() } catch { return { error: 'Akses tidak tersedia.' } }

  const transactionId = String(formData.get('transactionId') ?? '').trim()
  const maintenanceList = text(formData, 'maintenanceList')
  const location = text(formData, 'location')
  const platNumber = text(formData, 'platNumber')
  if (!transactionId || !maintenanceList || !location || !platNumber) return { error: 'Data ticketing wajib lengkap.' }

  const admin = createAdminClient()
  const { data: ticket } = await admin.from('ticketings').select('id, status').eq('transaction_id', transactionId).maybeSingle()
  if (!ticket) return { error: 'Ticketing tidak ditemukan.' }
  if (ticket.status === 'Completed') return { error: 'Ticketing Completed sudah immutable dan tidak dapat diubah.' }

  const [{ data: maintenance }, { data: locationData }, { data: fleet }] = await Promise.all([
    admin.from('maintenance_lists').select('maintenance_list, status').eq('maintenance_list', maintenanceList).eq('status', 'Active').maybeSingle(),
    admin.from('locations').select('location, grouping, status').eq('location', location).eq('status', 'Active').maybeSingle(),
    admin.from('fleets').select('plat_number, fleet_type, status').eq('plat_number', platNumber).eq('status', 'Active').maybeSingle(),
  ])
  if (!maintenance || !locationData || !fleet) return { error: 'Master data ticketing tidak tersedia.' }

  const { error } = await admin.from('ticketings').update({
    maintenance_list: maintenance.maintenance_list,
    maintenance_snapshot: maintenance,
    location: locationData.location,
    location_snapshot: locationData,
    fleet_plat_number: fleet.plat_number,
    fleet_snapshot: fleet,
  }).eq('id', ticket.id).neq('status', 'Completed')
  if (error) return { error: 'Data ticketing belum berhasil diperbarui.' }

  revalidatePath('/super-user/pengelolaan-transaksi')
  revalidatePath('/dispatcher/maintenance-armada')
  revalidatePath('/maintainer/tiket-maintenance')
  revalidatePath('/controller/beranda')
  return { success: 'Data ticketing berhasil diperbarui.' }
}
