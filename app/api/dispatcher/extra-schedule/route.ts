import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'

export async function GET() {
  const profile = await getCurrentProfile()
  if (!['Dispatcher', 'Super User'].includes(profile.role)) {
    return NextResponse.json({ error: 'Akses tidak tersedia.' }, { status: 403 })
  }

  const admin = createAdminClient()
  const [{ data: requests }, { data: confirmed }, { data: executors }, { data: fleets }] = await Promise.all([
    admin.from('tasks').select('transaction_id, start_point, destination, std, sta, created_at').eq('source_type', 'Extra Schedule').eq('status', 'Requested').order('created_at', { ascending: true }),
    admin.from('tasks').select('transaction_id, start_point, destination, std, sta, created_at').eq('source_type', 'Extra Schedule').eq('status', 'Confirmed').order('created_at', { ascending: true }),
    admin.from('executors').select('executor_nik, full_name').eq('status', 'Active').order('full_name'),
    admin.from('fleets').select('plat_number, fleet_type').eq('status', 'Active').order('plat_number'),
  ])

  return NextResponse.json({
    requests: requests ?? [],
    confirmed: confirmed ?? [],
    executors: executors ?? [],
    fleets: fleets ?? [],
  })
}
