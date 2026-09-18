'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'

type State = {
  error?: string
  success?: string
  transactionId?: string
  preview?: {
    transactionId: string
    maintenanceList: string
    location: string
    platNumber: string
  }
}

export async function createMaintenanceTicketAction(_state: State, formData: FormData): Promise<State> {
  const profile = await getCurrentProfile()
  if (!['Dispatcher', 'Super User'].includes(profile.role)) return { error: 'Akses tidak tersedia.' }

  const maintenanceList = String(formData.get('maintenanceList') ?? '').trim()
  const location = String(formData.get('location') ?? '').trim()
  const platNumber = String(formData.get('platNumber') ?? '').trim()

  if (!maintenanceList || !location || !platNumber) {
    return { error: 'Daftar Maintenance, lokasi, dan armada wajib diisi.' }
  }

  const admin = createAdminClient()
  const [{ data: maintenance }, { data: locationData }, { data: fleet }] = await Promise.all([
    admin.from('maintenance_lists').select('maintenance_list, status').eq('maintenance_list', maintenanceList).eq('status', 'Active').maybeSingle(),
    admin.from('locations').select('location, grouping, status').eq('location', location).eq('status', 'Active').maybeSingle(),
    admin.from('fleets').select('plat_number, fleet_type, status').eq('plat_number', platNumber).eq('status', 'Active').maybeSingle(),
  ])

  if (!maintenance) return { error: 'Daftar Maintenance tidak tersedia.' }
  if (!locationData) return { error: 'Lokasi tidak tersedia.' }
  if (!fleet) return { error: 'Armada tidak tersedia.' }

  const { data: transactionId, error: transactionError } = await admin.rpc('movent_next_transaction_id')
  if (transactionError || !transactionId) return { error: 'Transaction ID belum berhasil dibuat.' }

  const { error } = await admin.from('ticketings').insert({
    transaction_id: transactionId,
    status: 'Created',
    created_by: profile.id,
    maintenance_list: maintenance.maintenance_list,
    maintenance_snapshot: maintenance,
    fleet_plat_number: fleet.plat_number,
    fleet_snapshot: fleet,
    location: locationData.location,
    location_snapshot: locationData,
  })

  if (error) return { error: 'Tiket maintenance belum berhasil dibuat.' }

  revalidatePath('/dispatcher/maintenance-armada')
  revalidatePath('/maintainer/tiket-maintenance')
  revalidatePath('/controller/beranda')
  revalidatePath('/dispatcher/beranda')
  revalidatePath('/maintainer/beranda')

  return {
    success: `Tiket ${transactionId} berhasil dibuat.`,
    transactionId,
    preview: {
      transactionId,
      maintenanceList: maintenance.maintenance_list,
      location: locationData.location,
      platNumber: fleet.plat_number,
    },
  }
}

export async function cancelMaintenanceTicketAction(formData: FormData) {
  const profile = await getCurrentProfile()
  const transactionId = String(formData.get('transactionId') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim()

  if (!transactionId || !note) return { error: 'Transaction ID dan alasan pembatalan wajib diisi.' }
  if (!['Dispatcher', 'Super User'].includes(profile.role)) return { error: 'Akses tidak tersedia.' }

  const admin = createAdminClient()
  let query = admin.from('ticketings').select('id, status, created_by').eq('transaction_id', transactionId).eq('status', 'Created')
  if (profile.role !== 'Super User') query = query.eq('created_by', profile.id)
  const { data: ticket } = await query.maybeSingle()
  if (!ticket) return { error: 'Tiket tidak ditemukan atau sudah tidak bisa dibatalkan.' }

  const { error } = await admin.from('ticketings').update({
    status: 'Canceled',
    canceled_at: new Date().toISOString(),
    canceled_from_status: 'Created',
    cancellation_note: note,
  }).eq('id', ticket.id).eq('status', 'Created')

  if (error) return { error: 'Tiket belum berhasil dibatalkan.' }

  revalidatePath('/dispatcher/maintenance-armada')
  revalidatePath('/maintainer/tiket-maintenance')
  revalidatePath('/controller/beranda')
  redirect('/dispatcher/maintenance-armada')
}
