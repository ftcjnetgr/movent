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
  if (!["Executor", "Delivery", "Pickup", "Super User"].includes(profile.role)) notFound();
  const admin = createAdminClient();
  const fetchTasksPage = (from: number, to: number) => {
    let query = admin
      .from("tasks")
      .select(
        "transaction_id, task_type, status, start_point, destination, assigned_at, accepted_at, driving_at, completed_at, executor_snapshot, fleet_snapshot",
      )
      .eq("status", "Completed")
      .order("completed_at", { ascending: false })
      .range(from, to);

    if (["Executor", "Delivery", "Pickup"].includes(profile.role)) {
      query = query.eq("executor_nik", profile.username);
    }

    return query;
  };

  const tasks = await fetchAllRows(fetchTasksPage);


  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Tugas yang udah selesai</h1>
          <p>Semua tugas yang udah selesai ada di sini.</p>
        </div>
      </div>

      <section className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID transaksi</th>
                <th>Jenis</th>
                <th>Rute</th>
                <th>Armada</th>
                <th>Selesai</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.transaction_id}>
                  <td>
                    <strong>{task.transaction_id}</strong>
                  </td>
                  <td>{task.task_type}</td>
                  <td>
                    {task.start_point} → {task.destination}
                  </td>
                  <td>{task.fleet_snapshot?.plat_number ?? "-"}</td>
                  <td>{formatDateTime(task.completed_at)}</td>
                </tr>
              ))}
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      Belum ada tugas yang selesai.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
