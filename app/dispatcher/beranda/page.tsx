import DispatcherCreationHub from "@/components/dispatcher/creation-hub";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";
import { getDashboardData } from "@/lib/server/dashboard";

export default async function DispatcherBerandaPage() {
  const profile = await getCurrentProfile();
  const admin = createAdminClient();
  const [
    { data: locations },
    { data: schedules },
    { data: executors },
    { data: fleets },
    { data: products },
    { data: maintenanceLists },
    { data: tickets },
  ] = await Promise.all([
    admin
      .from("locations")
      .select("location")
      .eq("status", "Active")
      .order("location"),
    admin
      .from("schedules")
      .select(
        "schedule_id, route, category, start_point, destination, std, sta, trip",
      )
      .eq("status", "Active")
      .order("schedule_day")
      .order("std"),
    admin
      .from("executors")
      .select("executor_nik, full_name")
      .eq("status", "Active")
      .order("full_name"),
    admin
      .from("fleets")
      .select("plat_number, fleet_type")
      .eq("status", "Active")
      .order("plat_number"),
    admin
      .from("products")
      .select("product")
      .eq("status", "Active")
      .order("product"),
    admin
      .from("maintenance_lists")
      .select("maintenance_list")
      .eq("status", "Active")
      .order("maintenance_list"),
    admin
      .from("ticketings")
      .select(
        "transaction_id, status, maintenance_list, location, fleet_plat_number, created_at, created_by, cancellation_note",
      )
      .eq("created_by", profile.id)
      .order("created_at", { ascending: false }),
  ]);
  const { data: dispatcherTasks } = await admin
    .from("tasks")
    .select("status, fleet_ownership, created_by")
    .or(`created_by.eq.${profile.id},fleet_ownership.eq.Non-TGR`);

  const taskStatusCounts = {
    total: dispatcherTasks?.length ?? 0,
    assigned:
      dispatcherTasks?.filter((task) => task.status === "Assigned").length ?? 0,
    confirmed:
      dispatcherTasks?.filter((task) => task.status === "Confirmed").length ?? 0,
    driving:
      dispatcherTasks?.filter((task) => task.status === "Driving").length ?? 0,
    completed:
      dispatcherTasks?.filter((task) => task.status === "Completed").length ?? 0,
    canceled:
      dispatcherTasks?.filter((task) => task.status === "Canceled").length ?? 0,
  };

  const data = await getDashboardData(profile);

  return (
    <div className="role-page">
      <DispatcherCreationHub
        locations={(locations ?? []).map((i) => i.location)}
        schedules={schedules ?? []}
        executors={executors ?? []}
        fleets={fleets ?? []}
        products={(products ?? []).map((i) => i.product)}
        maintenanceLists={(maintenanceLists ?? []).map(
          (i) => i.maintenance_list,
        )}
        tickets={tickets ?? []}
      />

      <section className="data-table-card dispatcher-status-card">
        <div className="section-heading">
          <div>
            <h2>Status Penugasan</h2>
            <p>Semua penugasan yang bisa kamu pantau.</p>
          </div>
        </div>
        {[
          ["Semua Tugas", taskStatusCounts.total],
          ["Udah Ditugasin", taskStatusCounts.assigned],
          ["Udah Diterima", taskStatusCounts.confirmed],
          ["Lagi Jalan", taskStatusCounts.driving],
          ["Udah Selesai", taskStatusCounts.completed],
          ["Dibatalin", taskStatusCounts.canceled],
        ].map(([label, count]) => (
          <div className="summary-bar-row" key={String(label)}>
            <span>{label}</span>
            <strong>{count}</strong>
            <i>
              <b
                style={{
                  width:
                    taskStatusCounts.total > 0
                      ? String(
                          Math.min(
                            100,
                            (Number(count) / taskStatusCounts.total) * 100,
                          ),
                        ) + "%"
                      : "0%",
                }}
              />
            </i>
          </div>
        ))}
      </section>

      <section className="data-table-card dispatcher-ringkasan-card">
        <div className="section-heading">
          <div>
            <h2>Ringkasan</h2>
            <p>Biar gampang lihat prosesnya.</p>
          </div>
        </div>
        {[
          ["Supply (TGR)", data.taskCounts.Assigned ?? 0],
          ["Supply (Non TGR)", data.taskCounts.Confirmed ?? 0],
          ["Distribusi", data.taskCounts.Driving ?? 0],
          [
            "Perbaikan",
            Object.values(data.ticketCounts).reduce((a, b) => a + b, 0),
          ],
          ["Jadwal Tambahan", 0],
        ].map(([label, count]) => (
          <div className="summary-bar-row" key={String(label)}>
            <span>{label}</span>
            <strong>{count}</strong>
            <i>
              <b
                style={{
                  width: String(Math.min(100, Number(count) * 8)) + "%",
                }}
              />
            </i>
          </div>
        ))}
      </section>
    </div>
  );
}
