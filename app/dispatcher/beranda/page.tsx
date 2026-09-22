import Link from 'next/link'
import DispatcherCreationHub from '@/components/dispatcher-creation-hub'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDashboardData } from '@/lib/server/dashboard'
import { getCurrentProfile } from '@/lib/server/profile'

function statusLabel(status: string) {
  return ({ Requested:'Diajukan', Confirmed:'Dikonfirmasi', Assigned:'Ditugaskan', Driving:'Berangkat', Completed:'Selesai', Dibatalkan:'Dibatalkan' } as Record<string,string>)[status] ?? status
}

export default async function DispatcherBerandaPage() {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()
  const [{ data: locations }, { data: schedules }, { data: executors }, { data: fleets }, { data: products }, { data: maintenanceLists }, { data: tickets }, { data: tasks }, { count: canceledCount }] = await Promise.all([
    admin.from('locations').select('location').eq('status', 'Active').order('location'),
    admin.from('schedules').select('schedule_id, route, category, start_point, destination, std, sta, trip').eq('status', 'Active').order('schedule_day').order('std'),
    admin.from('executors').select('executor_nik, full_name').eq('status', 'Active').order('full_name'),
    admin.from('fleets').select('plat_number, fleet_type').eq('status', 'Active').order('plat_number'),
    admin.from('products').select('product').eq('status', 'Active').order('product'),
    admin.from('maintenance_lists').select('maintenance_list').eq('status', 'Active').order('maintenance_list'),
    admin.from('ticketings').select('transaction_id, status, maintenance_list, location, fleet_plat_number, created_at, created_by, cancellation_note').eq('created_by', profile.id).order('created_at', { ascending: false }),
    admin.from('tasks').select('transaction_id, task_type, status, start_point, destination, executor_snapshot, fleet_snapshot').eq('created_by', profile.id).order('created_at', { ascending: false }).limit(6),
    admin.from('tasks').select('*', { count: 'exact', head: true }).eq('created_by', profile.id).eq('status', 'Dibatalkan'),
  ])
  const data = await getDashboardData(profile)
  const active = (data.taskCounts.Requested ?? 0) + (data.taskCounts.Assigned ?? 0) + (data.taskCounts.Confirmed ?? 0) + (data.taskCounts.Driving ?? 0)

  return (
    <div className="role-page">
      <div className="page-heading">
        <div><h1>Halo, Dispatcher!</h1><p>Atur penugasan dan pastikan semua perjalanan sesuai rencana.</p></div>
        <div className="page-heading-actions"><Link className="secondary-button button-link" href="/dispatcher/riwayat-penugasan">Lihat riwayat</Link><Link className="button-link" href="/dispatcher/extra-schedule">Jadwal Tambahan</Link></div>
      </div>

      <section className="metric-grid">
        <div className="metric-card"><span>Penugasan Dibuat</span><strong>{active}</strong></div>
        <div className="metric-card"><span>Sedang Berjalan</span><strong>{(data.taskCounts.Confirmed ?? 0)+(data.taskCounts.Driving ?? 0)}</strong></div>
        <div className="metric-card"><span>Selesai</span><strong>{data.taskCounts.Completed ?? 0}</strong></div>
        <div className="metric-card danger-metric"><span>Dibatalkan</span><strong>{canceledCount ?? 0}</strong></div>
      </section>

      <section className="section-block dashboard-main-grid">
        <div className="data-table-card">
          <div className="section-heading"><div><h2>Tugas Terbaru</h2><p>Penugasan yang kamu buat.</p></div><Link className="link-button" href="/dispatcher/riwayat-penugasan">Lihat semua</Link></div>
          <div className="table-wrap"><table><thead><tr><th>ID</th><th>Jenis</th><th>Rute</th><th>Armada</th><th>Executor</th><th>Status</th></tr></thead><tbody>
            {(tasks ?? []).map(task => <tr key={task.transaction_id}><td><strong>{task.transaction_id}</strong></td><td>{task.task_type}</td><td>{task.start_point ?? '-'} → {task.destination ?? '-'}</td><td>{task.fleet_snapshot?.plat_number ?? '-'}</td><td>{task.executor_snapshot?.full_name ?? '-'}</td><td><span className={'status-badge status-'+task.status.toLowerCase().replaceAll(' ','-')}>{statusLabel(task.status)}</span></td></tr>)}
            {!(tasks ?? []).length ? <tr><td colSpan={6}><div className="empty-state">Belum ada penugasan yang kamu buat.</div></td></tr> : null}
          </tbody></table></div>
        </div>
        <div className="data-table-card">
          <div className="section-heading"><div><h2>Ringkasan</h2><p>Per jenis proses.</p></div></div>
          {[
            ['Supply (TGR)', data.taskCounts.Assigned ?? 0],
            ['Supply (Non TGR)', data.taskCounts.Confirmed ?? 0],
            ['Distribusi', data.taskCounts.Driving ?? 0],
            ['Maintenance', Object.values(data.ticketCounts).reduce((a,b)=>a+b,0)],
            ['Jadwal Tambahan', 0],
          ].map(([label,count]) => <div className="summary-bar-row" key={String(label)}><span>{label}</span><strong>{count}</strong><i><b style={{width:String(Math.min(100,Number(count)*8))+'%'}} /></i></div>)}
        </div>
      </section>

      <DispatcherCreationHub
        locations={(locations ?? []).map(i => i.location)}
        schedules={schedules ?? []}
        executors={executors ?? []}
        fleets={fleets ?? []}
        products={(products ?? []).map(i => i.product)}
        maintenanceLists={(maintenanceLists ?? []).map(i => i.maintenance_list)}
        tickets={tickets ?? []}
      />

    </div>
  )
}
