import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/server/fetch-all";
import { getCurrentProfile } from "@/lib/server/profile";

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export default async function ActivityHistoryPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "Delivery") notFound();
  const admin = createAdminClient();
  const activities = await fetchAllRows((from, to) =>
    admin.from("pickup_delivery_activities")
      .select("id, transaction_id, activity_type, start_point, destination, started_at, completed_at, fleet_snapshot")
      .eq("executor_nik", profile.username).eq("status", "Completed")
      .order("completed_at", { ascending: false }).range(from, to)
  );
  const ids = activities.map((a) => a.id);
  const stops = ids.length ? await fetchAllRows((from, to) =>
    admin.from("pickup_delivery_stops").select("activity_id, sequence_no, checkin_at")
      .in("activity_id", ids).order("sequence_no").range(from, to)
  ) : [];
  const byActivity = new Map<string, typeof stops>();
  for (const stop of stops) byActivity.set(stop.activity_id, [...(byActivity.get(stop.activity_id) ?? []), stop]);

  return <>
    <div className="page-heading"><div><h1>Aktivitas yang udah selesai</h1><p>Riwayat aktivitas Delivery yang kamu jalankan.</p></div></div>
    <section className="data-table-card"><div className="table-wrap"><table>
      <thead><tr><th>ID Aktivitas</th><th>Jenis</th><th>Rute</th><th>Armada</th><th>Mulai</th><th>Check-in titik</th><th>Selesai</th></tr></thead>
      <tbody>
        {activities.map((a) => <tr key={a.transaction_id}>
          <td><strong>{a.transaction_id}</strong></td><td>{a.activity_type}</td>
          <td>{a.start_point ?? "-"} → {a.destination ?? "-"}</td><td>{a.fleet_snapshot?.plat_number ?? "-"}</td>
          <td>{formatDateTime(a.started_at)}</td><td>{(byActivity.get(a.id) ?? []).map((s) => <div key={s.sequence_no}>Titik {s.sequence_no}: {formatDateTime(s.checkin_at)}</div>)}</td>
          <td>{formatDateTime(a.completed_at)}</td>
        </tr>)}
        {!activities.length ? <tr><td colSpan={7}><div className="empty-state">Belum ada aktivitas yang selesai.</div></td></tr> : null}
      </tbody>
    </table></div></section>
  </>;
};