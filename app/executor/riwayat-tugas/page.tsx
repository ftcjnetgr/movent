import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/server/fetch-all";
import { getCurrentProfile } from "@/lib/server/profile";

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export default async function ExecutorHistoryPage() {
  const profile = await getCurrentProfile();
  if (!["Executor", "Super User"].includes(profile.role)) notFound();

  const admin = createAdminClient();
  const tasks = await fetchAllRows((from, to) => {
    let query = admin
      .from("tasks")
      .select("id, transaction_id, task_type, status, start_point, destination, created_at, driving_at, completed_at, executor_snapshot, fleet_snapshot, executor_nik")
      .eq("status", "Completed")
      .order("completed_at", { ascending: false })
      .range(from, to);

    if (profile.role === "Executor") query = query.eq("executor_nik", profile.username);
    return query;
  });

  const taskIds = tasks.map((task) => task.id);
  const stops = taskIds.length
    ? await fetchAllRows((from, to) =>
        admin
          .from("task_stops")
          .select("task_id, sequence_no, checkin_at")
          .in("task_id", taskIds)
          .order("sequence_no")
          .range(from, to),
      )
    : [];

  const stopsByTask = new Map<string, typeof stops>();
  for (const stop of stops) {
    const list = stopsByTask.get(stop.task_id) ?? [];
    list.push(stop);
    stopsByTask.set(stop.task_id, list);
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Tugas yang udah selesai</h1>
          <p>Semua tugas penugasan yang udah selesai ada di sini.</p>
        </div>
      </div>
      <section className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>ID transaksi</th><th>Jenis</th><th>Rute</th><th>Armada</th><th>Mulai</th><th>Check-in titik</th><th>Selesai</th>
            </tr></thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.transaction_id}>
                  <td><strong>{task.transaction_id}</strong></td>
                  <td>{task.task_type}</td>
                  <td>{task.start_point ?? "-"} → {task.destination ?? "-"}</td>
                  <td>{task.fleet_snapshot?.plat_number ?? "-"}</td>
                  <td>{formatDateTime(task.driving_at)}</td>
                  <td>{(stopsByTask.get(task.id) ?? []).map((stop) => <div key={stop.sequence_no}>Titik {stop.sequence_no}: {formatDateTime(stop.checkin_at)}</div>) || "-"}</td>
                  <td>{formatDateTime(task.completed_at)}</td>
                </tr>
              ))}
              {!tasks.length ? <tr><td colSpan={7}><div className="empty-state">Belum ada tugas yang selesai.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
