import Link from 'next/link'
import DispatcherCreateTask from '@/components/dispatcher-create-task'
import DispatcherMaintenanceForm from '@/components/dispatcher-maintenance-form'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDashboardData } from '@/lib/server/dashboard'
import { getCurrentProfile } from '@/lib/server/profile'

export default async function DispatcherBerandaPage() {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()
  const [{ data: locations }, { data: schedules }, { data: executors }, { data: fleets }, { data: products }, { data: maintenanceLists }, { data: tickets }] = await Promise.all([
    admin.from('locations').select('location').eq('status', 'Active').order('location'),
    admin.from('schedules').select('schedule_id, route, category, start_point, destination, std, sta, trip').eq('status', 'Active').order('schedule_day').order('std'),
    admin.from('executors').select('executor_nik, full_name').eq('status', 'Active').order('full_name'),
    admin.from('fleets').select('plat_number, fleet_type').eq('status', 'Active').order('plat_number'),
    admin.from('products').select('product').eq('status', 'Active').order('product'),
    admin.from('maintenance_lists').select('maintenance_list').eq('status', 'Active').order('maintenance_list'),
    admin.from('ticketings').select('transaction_id, status, maintenance_list, location, fleet_plat_number, created_at, created_by, cancellation_note').eq('created_by', profile.id).order('created_at', { ascending: false }),
  ])
  const data = await getDashboardData(profile)
  const active = (data.taskCounts.Requested ?? 0) + (data.taskCounts.Assigned ?? 0) + (data.taskCounts.Confirmed ?? 0) + (data.taskCounts.Driving ?? 0)

  return (
    <div className="role-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">DISPATCHER</span>
          <h1>Kelola Penugasan</h1>
          <p>Buat penugasan, pantau tugas yang kamu buat, dan kelola ticketing maintenance.</p>
        </div>
        <div className="page-heading-actions">
          <Link className="secondary-button button-link" href="/dispatcher/riwayat-penugasan">Riwayat Penugasan</Link>
          <Link className="button-link" href="/dispatcher/extra-schedule">Extra Schedule</Link>
        </div>
      </div>

      <section className="section-block">
        <div className="metric-grid">
          <div className="metric-card"><span>Penugasan Aktif</span><strong>{active}</strong></div>
          <div className="metric-card"><span>Menunggu Diterima</span><strong>{data.taskCounts.Assigned ?? 0}</strong></div>
          <div className="metric-card"><span>Sedang Berangkat</span><strong>{data.taskCounts.Driving ?? 0}</strong></div>
          <div className="metric-card"><span>Tiket Maintenance</span><strong>{Object.values(data.ticketCounts).reduce((a,b)=>a+b,0)}</strong></div>
          <div className="metric-card alert-card"><span>Alert</span><strong>{data.taskAlerts.length + data.ticketAlertCount}</strong></div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><h2>Penugasan baru</h2><p>Pilih proses yang mau kamu jalankan.</p></div></div>
        <DispatcherCreateTask
          locations={(locations ?? []).map((item) => item.location)}
          schedules={schedules ?? []}
          executors={executors ?? []}
          fleets={fleets ?? []}
          products={(products ?? []).map((item) => item.product)}
        />
      </section>

      <section className="section-block">
        <div className="section-heading"><div><h2>Ticketing maintenance</h2><p>Buat tiket untuk armada yang membutuhkan maintenance.</p></div></div>
        <DispatcherMaintenanceForm
          maintenanceLists={(maintenanceLists ?? []).map((item) => item.maintenance_list)}
          locations={(locations ?? []).map((item) => item.location)}
          fleets={fleets ?? []}
          tickets={tickets ?? []}
        />
      </section>
    </div>
  )
}
