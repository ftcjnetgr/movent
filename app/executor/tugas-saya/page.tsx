import ExecutorTaskCard from "@/components/executor/task-card";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";

export default async function ExecutorTugasSayaPage() {
  const profile = await getCurrentProfile();
  const admin = createAdminClient();

  let taskQuery = admin
    .from("tasks")
    .select(
      "id, transaction_id, task_type, status, fleet_ownership, start_point, destination, std, sta, sj_number, sj_qty, sj_weight, product, sj_note, odometer_start, odometer_end, arrived_at, executor_snapshot, fleet_snapshot, executor_nik",
    )
    .not("status", "in", "(Completed,Canceled)")
    .order("created_at", { ascending: false });

  if (["Executor", "Delivery", "Pickup"].includes(profile.role)) {
    taskQuery = taskQuery.eq("executor_nik", profile.username);
  }

  const [{ data: tasks }, { data: products }] = await Promise.all([
    taskQuery,
    admin
      .from("products")
      .select("product")
      .eq("status", "Active")
      .order("product"),
  ]);

  const taskIds = (tasks ?? []).map((task) => task.id);
  const { data: sjItems } = taskIds.length
    ? await admin
        .from("task_sj_items")
        .select("task_id, sj_number, sj_qty, sj_weight, product, note")
        .in("task_id", taskIds)
        .order("created_at")
    : { data: [] as any[] };
  const sjByTask = new Map<string, any[]>();
  for (const item of sjItems ?? []) {
    const list = sjByTask.get(item.task_id) ?? [];
    list.push(item);
    sjByTask.set(item.task_id, list);
  }

  const activeCount = tasks?.length ?? 0;
  const waitingCount = (tasks ?? []).filter((task) => task.status === "Assigned").length;
  const drivingCount = (tasks ?? []).filter((task) => task.status === "Driving").length;

  return (
    <div className="role-page">
      <div className="page-heading">
        <div>
          <h1>Tugas kamu</h1>
          <p>Fokus ke tugas yang perlu kamu selesaikan. Semua langkah berikutnya ada di setiap kartu.</p>
        </div>
      </div>
      <section className="section-block">
        <div className="metric-grid">
          <div className="metric-card"><span>Tugas Aktif</span><strong>{activeCount}</strong></div>
          <div className="metric-card"><span>Tinggal diterima</span><strong>{waitingCount}</strong></div>
          <div className="metric-card"><span>Lagi jalan</span><strong>{drivingCount}</strong></div>
          <div className="metric-card"><span>Udah Selesai</span><strong>—</strong></div>
          <div className="metric-card"><span>Hari Ini</span><strong>{activeCount}</strong></div>
        </div>
      </section>
      <section className="section-block">
        <div className="section-heading">
          <div><h2>Yang perlu kamu kerjain</h2><p>Ikutin dari tahap awal sampai selesai, ya.</p></div>
        </div>
        <section className="task-list">
          {(tasks ?? []).map((task) => (
            <ExecutorTaskCard key={task.transaction_id} task={task} products={(products ?? []).map((item) => item.product)} sjItems={sjByTask.get(task.id) ?? []} />
          ))}
          {!tasks?.length ? (
            <div className="metric-card">
              <span>Aman, belum ada tugas</span>
              <strong>Belum ada tugas aktif di sini.</strong>
              <p>Belum ada penugasan yang perlu kamu kerjakan. Tugas yang selesai bisa kamu lihat di Riwayat Tugas.</p>
            </div>
          ) : null}
        </section>
      </section>
    </div>
  );
}
