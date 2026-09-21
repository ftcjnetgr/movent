'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentProfile } from '@/lib/server/profile'
import { createAdminClient } from '@/lib/supabase/admin'

type Preview = {
  transactionId: string
  startPoint: string
  destination: string
  std: string
  sta: string
  externalExecutor: string
  externalFleet: string
  sjs: { sjNumber: string; sjQty: number; sjWeight: number; product: string; sjNote: string | null }[]
}

type State = { error?: string; success?: string; transactionId?: string; preview?: Preview }

function jakartaTimestamp(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return null
  const now = new Date()
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  return `${date}T${value}:00+07:00`
}

async function validateNonTgrInput(formData: FormData) {
  const startPoint = String(formData.get('startPoint') ?? '').trim()
  const destination = String(formData.get('destination') ?? '').trim()
  const std = String(formData.get('std') ?? '').trim()
  const sta = String(formData.get('sta') ?? '').trim()
  const executorName = String(formData.get('executorName') ?? '').trim()
  const executorPhone = String(formData.get('executorPhone') ?? '').trim()
  const fleetPlate = String(formData.get('fleetPlate') ?? '').trim()
  const fleetType = String(formData.get('fleetType') ?? '').trim()
  const sjNumbers = formData.getAll('sjNumber').map(String).map((v) => v.trim())
  const sjQtys = formData.getAll('sjQty').map((v) => Number(v))
  const sjWeights = formData.getAll('sjWeight').map((v) => Number(v))
  const products = formData.getAll('product').map(String).map((v) => v.trim())
  const sjNotes = formData.getAll('sjNote').map(String).map((v) => v.trim())

  if (!startPoint || !destination || !std || !sta || !executorName || !executorPhone || !fleetPlate || !fleetType || !sjNumbers.length) {
    return { error: 'Data perjalanan, executor, armada, dan minimal satu SJ perlu diisi lengkap dulu, ya.' } as const
  }
  if (sjNumbers.length !== sjQtys.length || sjNumbers.length !== sjWeights.length || sjNumbers.length !== products.length) {
    return { error: 'Data setiap SJ belum lengkap.' } as const
  }

  const stdTimestamp = jakartaTimestamp(std)
  const staTimestamp = jakartaTimestamp(sta)
  if (!stdTimestamp || !staTimestamp) return { error: 'Format STD atau STA belum benar.' } as const
  if (new Date(staTimestamp).getTime() <= new Date(stdTimestamp).getTime()) return { error: 'STA harus lebih besar dari STD.' } as const

  const admin = createAdminClient()
  const [{ data: startLocation }, { data: destinationLocation }] = await Promise.all([
    admin.from('locations').select('location, grouping, status').eq('location', startPoint).eq('status', 'Active').maybeSingle(),
    admin.from('locations').select('location, grouping, status').eq('location', destination).eq('status', 'Active').maybeSingle(),
  ])
  if (!startLocation || !destinationLocation) return { error: 'Start Point dan Destinasi harus berasal dari Database Lokasi yang Active.' } as const

  const suppliedTransactionId = String(formData.get('transactionId') ?? '').trim()
  let transactionId = suppliedTransactionId
  if (!transactionId) {
    const { data, error: transactionError } = await admin.rpc('movent_next_transaction_id')
    if (transactionError || !data) return { error: 'ID transaksi belum berhasil dibuat. Coba lagi, ya.' } as const
    transactionId = String(data)
  }

  const sjs: { sjNumber: string; sjQty: number; sjWeight: number; product: string; sjNote: string | null }[] = []
  for (let i = 0; i < sjNumbers.length; i++) {
    if (!sjNumbers[i] || !products[i] || !Number.isFinite(sjQtys[i]) || !Number.isFinite(sjWeights[i])) return { error: 'Nomor SJ, Qty, Berat, dan Produk wajib diisi pada setiap SJ.' } as const
    const { data: productData } = await admin.from('products').select('product, status').eq('product', products[i]).eq('status', 'Active').maybeSingle()
    if (!productData) return { error: `Produk pada SJ ke-${i + 1} belum tersedia.` } as const
    sjs.push({ sjNumber: sjNumbers[i], sjQty: sjQtys[i], sjWeight: sjWeights[i], product: products[i], sjNote: sjNotes[i] || null })
  }

  return {
    value: {
      transactionId,
      startPoint,
      destination,
      std: stdTimestamp,
      sta: staTimestamp,
      externalExecutor: `${executorName} · ${executorPhone}`,
      externalFleet: `${fleetPlate} · ${fleetType}`,
      sjs,
    } satisfies Preview,
    snapshots: { startLocation, destinationLocation },
  }
}

export async function createNonTgrSupplyAction(_state: State, formData: FormData): Promise<State> {
  const profile = await getCurrentProfile()
  if (!['Operation', 'Super User'].includes(profile.role)) return { error: 'Kamu belum punya akses ke bagian ini.' }

  const validated = await validateNonTgrInput(formData)
  if ('error' in validated) return validated

  return {
    success: 'SJ sudah disubmit. Periksa preview penugasan dan hasil SJ sebelum dikonfirmasi.',
    preview: validated.value,
  }
}

export async function confirmNonTgrSupplyAction(_state: State, formData: FormData): Promise<State> {
  const profile = await getCurrentProfile()
  if (!['Operation', 'Super User'].includes(profile.role)) return { error: 'Kamu belum punya akses ke bagian ini.' }

  const validated = await validateNonTgrInput(formData)
  if ('error' in validated) return validated

  const admin = createAdminClient()
  const transactionId = String(formData.get('transactionId') ?? '').trim()
  if (!transactionId) return { error: 'ID transaksi tidak ditemukan. Buat preview terlebih dahulu.' }

  const { snapshots } = validated
  const { value } = validated
  const { error } = await admin.from('tasks').insert({
    transaction_id: transactionId,
    source_type: 'Manual',
    task_type: 'Supply',
    fleet_ownership: 'Non-TGR',
    status: 'Assigned',
    created_by: profile.id,
    assigned_by: profile.id,
    external_executor: value.externalExecutor,
    external_fleet: value.externalFleet,
    start_point: value.startPoint,
    start_point_snapshot: snapshots.startLocation,
    destination: value.destination,
    destination_snapshot: snapshots.destinationLocation,
    std: value.std,
    sta: value.sta,
    sj_number: value.sjs[0].sjNumber,
    sj_qty: value.sjs[0].sjQty,
    sj_weight: value.sjs[0].sjWeight,
    product: value.sjs[0].product,
    sj_note: value.sjs[0].sjNote,
    assigned_at: new Date().toISOString(),
  })

  if (error) return { error: 'Tugas Supply Non-TGR belum berhasil dibuat. Coba lagi, ya.' }

  const { data: taskRow } = await admin.from('tasks').select('id').eq('transaction_id', transactionId).maybeSingle()
  if (!taskRow) return { error: 'Tugas dibuat, tetapi detail SJ belum ditemukan.' }
  const sjRows = value.sjs.map((sj) => ({ task_id: taskRow.id, sj_number: sj.sjNumber, sj_qty: sj.sjQty, sj_weight: sj.sjWeight, product: sj.product, note: sj.sjNote }))
  const { error: sjError } = await admin.from('task_sj_items').insert(sjRows)
  if (sjError) return { error: 'Tugas dibuat, tetapi detail SJ belum berhasil disimpan.' }

  revalidateOperationPaths()
  return { success: `Tugas ${transactionId} berhasil dikonfirmasi dan ditugaskan.`, transactionId }
}

export async function confirmNonTgrDepartureByOperationAction(_state: State, formData: FormData): Promise<State> {
  const profile = await getCurrentProfile()
  if (!['Operation', 'Super User'].includes(profile.role)) return { error: 'Kamu belum punya akses ke bagian ini.' }

  const transactionId = String(formData.get('transactionId') ?? '').trim()
  const departure = String(formData.get('departure') ?? '').trim()
  const timestamp = jakartaTimestamp(departure)
  if (!transactionId || !timestamp) return { error: 'Tanggal dan jam ATD perlu diisi dulu, ya.' }

  const admin = createAdminClient()
  const query = admin.from('tasks').select('id, status, created_by').eq('transaction_id', transactionId).eq('task_type', 'Supply').eq('fleet_ownership', 'Non-TGR').eq('status', 'Assigned')
  const { data: task } = profile.role === 'Super User'
    ? await query.maybeSingle()
    : await query.eq('created_by', profile.id).maybeSingle()

  if (!task) return { error: 'Tugas Non-TGR tidak ditemukan atau sudah diproses.' }

  const { error } = await admin.from('tasks').update({
    status: 'Driving',
    external_departure_at: timestamp,
  }).eq('id', task.id).eq('status', 'Assigned')

  if (error) return { error: 'Konfirmasi berangkat belum berhasil.' }

  revalidateOperationPaths()
  return { success: `ATD ${transactionId} berhasil dikonfirmasi.` }
}

function revalidateOperationPaths() {
  revalidatePath('/operation/beranda')
  revalidatePath('/operation/riwayat-permintaan')
  revalidatePath('/dispatcher/armada-non-tgr')
  revalidatePath('/dispatcher/riwayat-penugasan')
  revalidatePath('/controller/beranda')
  revalidatePath('/controller/timetable')
}
