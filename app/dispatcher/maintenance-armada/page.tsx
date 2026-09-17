import AppShell from '@/components/app-shell'
import DispatcherMaintenanceForm from '@/components/dispatcher-maintenance-form'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function DispatcherMaintenanceArmadaPage() {
  const admin = createAdminClient()
  const [{ data: maintenanceLists }, { data: locations }, { data: fleets }] = await Promise.all([
    admin.from('maintenance_lists').select('maintenance_list').eq('status', 'Active').order('maintenance_list'),
    admin.from('locations').select('location').eq('status', 'Active').order('location'),
    admin.from('fleets').select('plat_number, fleet_type').eq('status', 'Active').order('plat_number'),
  ])

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Dispatcher</span>
          <h1>Maintenance Armada</h1>
          <p>Buat tiket maintenance untuk armada.</p>
        </div>
      </div>

      <DispatcherMaintenanceForm
        maintenanceLists={(maintenanceLists ?? []).map((item) => item.maintenance_list)}
        locations={(locations ?? []).map((item) => item.location)}
        fleets={fleets ?? []}
      />
    </AppShell>
  )
}
