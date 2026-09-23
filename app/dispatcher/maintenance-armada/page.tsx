import DispatcherMaintenanceForm from '@/components/dispatcher-maintenance-form'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'

export default async function DispatcherMaintenanceArmadaPage() {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()
  const [{ data: maintenanceLists }, { data: locations }, { data: fleets }, { data: tickets }] = await Promise.all([
    admin.from('maintenance_lists').select('maintenance_list').eq('status', 'Active').order('maintenance_list'),
    admin.from('locations').select('location').eq('status', 'Active').order('location'),
    admin.from('fleets').select('plat_number, fleet_type').eq('status', 'Active').order('plat_number'),
    (() => {
      let query = admin
        .from('ticketings')
        .select('transaction_id, status, maintenance_list, location, fleet_plat_number, created_at, created_by, cancellation_note')
        .order('created_at', { ascending: false })
        .limit(20)
      if (profile.role !== 'Super User') query = query.eq('created_by', profile.id)
      return query
    })(),
  ])

  return (
    <>
    <div className="page-heading">
        <div>
          <h1>Daftar Maintenance Armada</h1>
          <p>Yuk, buat maintenance untuk armada dari sini.</p>
        </div>
      </div>
      <DispatcherMaintenanceForm
        maintenanceLists={(maintenanceLists ?? []).map((item) => item.maintenance_list)}
        locations={(locations ?? []).map((item) => item.location)}
        fleets={fleets ?? []}
        tickets={tickets ?? []}
      />
    </>
  )
}
