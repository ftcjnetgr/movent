import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/server/fetch-all";
import { getCurrentProfile } from "@/lib/server/profile";

type ActivityRole = "Pickup" | "Delivery";

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export default async function PickupDeliveryActivityHistory({
  role,
}: {
  role: ActivityRole;
}) {
  const profile = await getCurrentProfile();
  if (profile.role !== role) notFound();

  const admin = createAdminClient();
  const activities = await fetchAllRows((from, to) =>
    admin
      .from("pickup_delivery_activities")
      .select(
        "id, transaction_id, activity_type, start_point, destination, started_at, completed_at, fleet_snapshot",
      )
      .eq("executor_nik", profile.username)
      .eq("status", "Completed")
      .order("completed_at", { ascending: false })
      .range(from, to),
  );

  const ids = activities.map((activity) => activity.id);
  const stops = ids.length
    ? await fetchAllRows((from, to) =>
        admin
          .from("pickup_delivery_stops")
          .select("activity_id, sequence_no, checkin_at")
          .in("activity_id", ids)
          .order("sequence_no")
          .range(from, to),
      )
    : [];

  const byActivity = new Map<string, typeof stops>();
  for (const stop of stops) {
    byActivity.set(stop.activity_id, [
      ...(byActivity.get(stop.activity_id) ?? []),
      stop,
    ]);
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Aktivitas yang udah selesai</h1>
          <p>Riwayat aktivitas {role} yang kamu jalankan.</p>
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
                  <td>
                    <strong>{activity.transaction_id}</strong>
                  </td>
                  <td>{activity.activity_type}</td>
                  <td>
                    {activity.start_point ?? "-"} →{" "}
                    {activity.destination ?? "-"}
                  </td>
                  <td>{activity.fleet_snapshot?.plat_number ?? "-"}</td>
                  <td>{formatDateTime(activity.started_at)}</td>
                  <td>
                    {(byActivity.get(activity.id) ?? []).map((stop) => (
                      <div key={stop.sequence_no}>
                        Titik {stop.sequence_no}:{" "}
                        {formatDateTime(stop.checkin_at)}
                      </div>
                    ))}
                  </td>
                  <td>{formatDateTime(activity.completed_at)}</td>
                </tr>
              ))}
              {!activities.length ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      Belum ada aktivitas yang selesai.
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
