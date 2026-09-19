import Link from 'next/link'
import DashboardAlertList from '@/components/dashboard-alert-list'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
import { getDashboardData } from '@/lib/server/dashboard'

function statusLabel(status: string) {
  return ({ Requested:'Diajukan', Confirmed:'Dikonfirmasi', Assigned:'Ditugaskan', Driving:'Berangkat', Completed:'Selesai', Canceled:'Dibatalkan' } as Record<string,string>)[status] ?? status
}

function typeLabel(type: string) {
  return type === 'Supply' ? 'Supply' : 'Distribusi'
}

export default async function ControllerBerandaPage() {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()
  const [data, taskResult, ticketResult] = await Promise.all([
    getDashboardData(profile),
    admin.from('tasks').select('transaction_id, task_type, status, start_point, destination, std, sta, executor_snapshot, fleet_snapshot').order('created_at', { ascending: false }).limit(8),
    admin.from('ticketings').select('transaction_id, status, maintenance_list, fleet_plat_number').order('created_at', { ascending: false }).limit(6),
  ])
  const tasks = taskResult.data ?? []
  const tickets = ticketResult.data ?? []

  return (
    <div className="role-page">
      <div className="page-heading">
        <div><h1>Halo, Controller!</h1><p>Pantau seluruh pergerakan operasional hari ini.</p></div>
        <div className="page-heading-actions"><Link className="secondary-button button-link" href="/controller/timetable/by-plan">Lihat Schedule</Link><Link className="button-link" href="/controller/penarikan-report">Tarik Report</Link></div>
      </div>

      <section className="metric-grid">
        <div className="metric-card"><span>Assigned</span><strong>{data.taskCounts.Assigned ?? 0}</strong></div>
        <div className="metric-card"><span>Confirmed</span><strong>{data.taskCounts.Confirmed ?? 0}</strong></div>
        <div className="metric-card"><span>Driving</span><strong>{data.taskCounts.Driving ?? 0}</strong></div>
        <div className="metric-card"><span>Completed</span><strong>{data.taskCounts.Completed ?? 0}</strong></div>
        <div className="metric-card alert-card"><span>Alert</span><strong>{data.taskAlerts.length + data.ticketAlertCount}</strong></div>
      </section>

      <DashboardAlertList taskAlerts={data.taskAlerts.map((alert) => ({ ...alert, targetAt: alert.targetAt.toISOString() }))} ticketAlerts={data.ticketAlerts} />

      <section className="section-block dashboard-main-grid">
        <div className="data-table-card">
          <div className="section-heading"><div><h2>Penugasan Hari Ini</h2><p>Assignment terbaru yang sedang dipantau.</p></div></div>
          <div className="table-wrap"><table>
            <thead><tr><th>Waktu</th><th>ID</th><th>Jenis</th><th>Rute</th><th>Armada</th><th>Executor</th><th>Status</th></tr></thead>
            <tbody>{tasks.map(task => (
              <tr key={task.transaction_id}>
                <td>{task.std ? new Date(task.std).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'}) : '-'}</td>
                <td><strong>{task.transaction_id}</strong></td>
                <td>{typeLabel(task.task_type)}</td>
                <td>{task.start_point ?? '-'} → {task.destination ?? '-'}</td>
                <td>{task.fleet_snapshot?.plat_number ?? '-'}</td>
                <td>{task.executor_snapshot?.full_name ?? '-'}</td>
                <td><span className={'status-badge status-'+task.status.toLowerCase().replaceAll(' ','-')}>{statusLabel(task.status)}</span></td>
              </tr>
            ))}{!tasks.length ? <tr><td colSpan={7}><div className="empty-state">Belum ada penugasan hari ini.</div></td></tr> : null}</tbody>
          </table></div>
        </div>

        <div className="data-table-card dashboard-summary-card">
          <div className="section-heading"><div><h2>Ringkasan</h2><p>Per jenis tugas.</p></div></div>
          {[
            ['Supply (TGR)', data.taskCounts.Assigned ?? 0],
            ['Supply (Non TGR)', data.taskCounts.Confirmed ?? 0],
            ['Distribusi', data.taskCounts.Driving ?? 0],
            ['Maintenance', Object.values(data.ticketCounts).reduce((a,b)=>a+b,0)],
            ['Extra Schedule', 0],
          ].map(([label,count]) => <div className="summary-bar-row" key={String(label)}><span>{label}</span><strong>{count}</strong><i><b style={{width: String(Math.min(100, Number(count)*8))+'%'}} /></i></div>)}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><h2>Ticketing Terbaru</h2><p>Tiket maintenance yang masuk dan sedang berjalan.</p></div></div>
        <div className="data-table-card"><div className="table-wrap"><table><thead><tr><th>ID</th><th>Maintenance</th><th>Armada</th><th>Status</th></tr></thead><tbody>
          {tickets.map(ticket => <tr key={ticket.transaction_id}><td><strong>{ticket.transaction_id}</strong></td><td>{ticket.maintenance_list ?? '-'}</td><td>{ticket.fleet_plat_number ?? '-'}</td><td><span className={'status-badge status-'+ticket.status.toLowerCase().replaceAll(' ','-')}>{statusLabel(ticket.status)}</span></td></tr>)}
          {!tickets.length ? <tr><td colSpan={4}><div className="empty-state">Belum ada ticketing.</div></td></tr> : null}
        </tbody></table></div></div>
      </section>
    </div>
  )
}
