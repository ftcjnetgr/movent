'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentProfile } from '@/lib/server/profile'
import { createAdminClient } from '@/lib/supabase/admin'

type Preview = {
  startPoint: string
  destination: string
  std: string
  sta: string
  externalExecutor: string
  externalFleet: string
  sjNumber: string
  sjQty: number
  sjWeight: number
  product: string
  sjNote: string | null
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
  const sjNumber = String(formData.get('sjNumber') ?? '').trim()
  const sjQty = Number(formData.get('sjQty'))
  const sjWeight = Number(formData.get('sjWeight'))
  const product = String(formData.get('product') ?? '').trim()
  const sjNote = String(formData.get('sjNote') ?? '').trim()

  if (!startPoint || !destination || !std || !sta || !executorName || !executorPhone || !fleetPlate || !fleetType || !sjNumber || !product || !Number.isFinite(sjQty) || !Number.isFinite(sjWeight)) {
    return { error: 'Data perjalanan, executor, armada, dan SJ perlu diisi lengkap dulu, ya.' } as const
  }

  const stdTimestamp = jakartaTimestamp(std)
  const staTimestamp = jakartaTimestamp(sta)
  if (!stdTimestamp || !staTimestamp) return { error: 'Format STD atau STA belum benar.' } as const

  const admin = createAdminClient()
  const [{ data: startLocation }, { data: destinationLocation }, { data: productData }] = await Promise.all([
    admin.from('locations').select('location, grouping, status').eq('location', startPoint).eq('status', 'Active').maybeSingle(),
    admin.from('locations').select('location, grouping, status').eq('location', destination).eq('status', 'Active').maybeSingle(),
    admin.from('products').select('product, status').eq('product', product).eq('status', 'Active').maybeSingle(),
  ])

  if (!startLocation || !destinationLocation) return { error: 'Start Point dan Destinasi harus berasal dari Database Lokasi yang Active.' } as const
  if (!productData) return { error: 'Produk belum tersedia.' } as const

  return {
    value: {
      startPoint,
      destination,
      std: stdTimestamp,
      sta: staTimestamp,
      externalExecutor: `${executorName} · ${executorPhone}`,
      externalFleet: `${fleetPlate} · ${fleetType}`,
      sjNumber,
      sjQty,
      sjWeight,
      product,
      sjNote: sjNote || null,
    } satisfies Preview,
    snapshots: { startLocation, destinationLocation, productData },
  }
}

export async function createNonTgrSupplyAction(_state: State, formData: FormData): Promise<State> {
  const profile = await getCurrentProfile()
  if (!['Operation', 'Super User'].includes(profile.role)) return { error: 'Kamu belum punya akses ke bagian ini.' }

  const validated = await validateNonTgrInput(formData)
  if ('error' in validated) return validated

  return {
    success: 'Data sudah divalidasi. Periksa preview sebelum mengonfirmasi penugasan.',
    preview: validated.value,
  }
}

export async function confirmNonTgrSupplyAction(_state: State, formData: FormData): Promise<State> {
  const profile = await getCurrentProfile()
  if (!['Operation', 'Super User'].includes(profile.role)) return { error: 'Kamu belum punya akses ke bagian ini.' }

  const validated = await validateNonTgrInput(formData)
  if ('error' in validated) return validated

  const admin = createAdminClient()
  const { data: transactionId, error: transactionError } = await admin.rpc('movent_next_transaction_id')
  if (transactionError || !transactionId) return { error: 'ID transaksi belum berhasil dibuat. Coba lagi, ya.' }

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
    sj_number: value.sjNumber,
    sj_qty: value.sjQty,
    sj_weight: value.sjWeight,
    product: value.product,
    product_snapshot: snapshots.productData,
    sj_note: value.sjNote,
    assigned_at: new Date().toISOString(),
  })

  if (error) return { error: 'Tugas Supply Non-TGR belum berhasil dibuat. Coba lagi, ya.' }

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
