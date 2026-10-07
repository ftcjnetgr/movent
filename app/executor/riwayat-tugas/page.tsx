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
  const activities = await fetchAllRows((from, to) => {
    let query = admin
      .from("pickup_delivery_activities")
      .select(
        "id, transaction_id, activity_type, status, start_point, destination, created_at, started_at, completed_at, executor_snapshot, fleet_snapshot",
      )
      .eq("status", "Completed")
      .order("completed_at", { ascending: false })
      .range(from, to);

    if (["Delivery", "Pickup"].includes(profile.role)) {
      query = query.eq("executor_nik", profile.username);
    }

    return query;
  });

  const activityIds = activities.map((activity) => activity.id);
  const stops = activityIds.length
    ? await fetchAllRows((from, to) =>
        admin
          .from("pickup_delivery_stops")
          .select("activity_id, sequence_no, checkin_at")
          .in("activity_id", activityIds)
          .order("sequence_no")
          .range(from, to),
      )
    : [];

  const stopsByActivity = new Map<string, typeof stops>();
  for (const stop of stops) {
    const list = stopsByActivity.get(stop.activity_id) ?? [];
    list.push(stop);
    stopsByActivity.set(stop.activity_id, list);
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Aktivitas yang udah selesai</h1>
          <p>Semua aktivitas Pickup & Delivery yang udah selesai ada di sini.</p>
        </div>
      </div>

      <section className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID Aktivitas</th>
                <th>Jenis</th>
                <th>Rute</th>
                <th>Armada</th>
                <th>Mulai</th>
                <th>Check-in titik</th>
                <th>Selesai</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.transaction_id}>
                  <td><strong>{activity.transaction_id}</strong></td>
                  <td>{activity.activity_type}</td>
                  <td>{activity.start_point ?? "-"} → {activity.destination ?? "-"}</td>
                  <td>{activity.fleet_snapshot?.plat_number ?? "-"}</td>
                  <td>{formatDateTime(activity.started_at)}</td>
                  <td>
                    {(stopsByActivity.get(activity.id) ?? []).length
                      ? (stopsByActivity.get(activity.id) ?? []).map((stop) => (
                          <div key={stop.sequence_no}>
                            Titik {stop.sequence_no}: {formatDateTime(stop.checkin_at)}
                          </div>
                        ))
                      : "-"}
                  </td>
                  <td>{formatDateTime(activity.completed_at)}</td>
                </tr>
              ))}
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">Belum ada aktivitas yang selesai.</div>
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
