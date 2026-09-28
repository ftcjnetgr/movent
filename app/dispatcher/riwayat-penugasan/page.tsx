import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";
import { cancelDispatcherTaskAction } from "@/app/dispatcher/beranda/actions";
import StatusBadge from "@/components/shared/status-badge";
import { STATUS_LABELS } from "@/components/shared/status-config";
async function cancelDispatcherTaskFormAction(formData: FormData) {
  "use server";
  await cancelDispatcherTaskAction(formData);
}

export default async function DispatcherAssignmentHistoryPage() {
  const profile = await getCurrentProfile();
  if (!["Dispatcher", "Super User"].includes(profile.role)) notFound();
  const admin = createAdminClient();
  const { data: tasks } = await admin
    .from("tasks")
    .select(
      "transaction_id, task_type, status, fleet_ownership, created_by, start_point, destination, std, sta, created_at, executor_snapshot, fleet_snapshot, external_executor, external_fleet",
    )
    .order("created_at", { ascending: false });

  const visible =
    profile.role === "Dispatcher"
      ? (tasks ?? []).filter(
          (task) =>
            task.created_by === profile.id ||
            task.fleet_ownership === "Non-TGR",
        )
      : (tasks ?? []);

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Penugasan kamu</h1>
          <p>Semua penugasan yang kamu buat ada di sini, lengkap sama statusnya.</p>
        </div>
      </div>
      <section className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID transaksi</th>
                <th>Jenis penugasan</th>
                <th>Rute</th>
                <th>Executor</th>
                <th>Armada</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((task) => (
                <tr key={task.transaction_id}>
                  <td>
                    <strong>{task.transaction_id}</strong>
                  </td>
                  <td>{task.task_type}</td>
                  <td>
                    {task.start_point ?? "-"} → {task.destination ?? "-"}
                  </td>
                  <td>
                    {task.executor_snapshot?.full_name ??
                      task.external_executor ??
                      "-"}
                  </td>
                  <td>
                    {task.fleet_snapshot?.plat_number ??
                      task.external_fleet ??
                      task.fleet_ownership ??
                      "-"}
                  </td>
                  <td>
                    <StatusBadge
                      status={task.status}
                      label={STATUS_LABELS[task.status] ?? task.status}
                    />
                  </td>
                  <td>
                    {task.fleet_ownership === "Non-TGR" ? (
                      profile.role === "Super User" &&
                      task.status !== "Completed" &&
                      task.status !== "Canceled" ? (
                        <details>
                          <summary className="link-button">
                            Batalin penugasan
                          </summary>
                          <form
                            action={cancelDispatcherTaskFormAction}
                            className="compact-form"
                            style={{ marginTop: 12 }}
                          >
                            <input
                              type="hidden"
                              name="transactionId"
                              value={task.transaction_id}
                            />
                            <input
                              name="note"
                              placeholder="Kenapa mau dibatalin?"
                              required
                            />
                            <button type="submit">Batalin penugasan</button>
                          </form>
                        </details>
                      ) : (
                        <span className="muted">-</span>
                      )
                    ) : task.status === "Assigned" &&
                      (profile.role === "Super User" ||
                        task.created_by === profile.id) ? (
                      <details>
                        <summary className="link-button">
                          Batalin penugasan
                        </summary>
                        <form
                          action={cancelDispatcherTaskFormAction}
                          className="compact-form"
                          style={{ marginTop: 12 }}
                        >
                          <input
                            type="hidden"
                            name="transactionId"
                            value={task.transaction_id}
                          />
                          <input
                            name="note"
                            placeholder="Kenapa mau dibatalin?"
                            required
                          />
                          <button type="submit">Batalin penugasan</button>
                        </form>
                      </details>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {!visible.length ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      Belum ada penugasan untuk ditampilkan.
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
