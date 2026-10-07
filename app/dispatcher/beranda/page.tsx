import DispatcherCreationHub from "@/components/dispatcher/creation-hub";
import { fetchAllRows } from "@/lib/server/fetch-all";
import DispatcherSummaryInteractive from "@/components/dispatcher/dispatcher-summary-interactive";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";
import { getDashboardData } from "@/lib/server/dashboard";

export default async function DispatcherBerandaPage() {
  const profile = await getCurrentProfile();
  const admin = createAdminClient();
  const [
    locations,
    schedules,
    executors,
    fleets,
    products,
    maintenanceLists,
    tickets,
    allTickets,
  ] = await Promise.all([
    fetchAllRows((from, to) =>
      admin
        .from("locations")
        .select("location")
        .eq("status", "Active")
        .order("location")
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      admin
        .from("schedules")
        .select(
          "schedule_id, route, category, schedule_hub_id, schedule_day, start_point, destination, std, sta, trip",
        )
        .eq("status", "Active")
        .order("schedule_day")
        .order("std")
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      admin
        .from("executors")
        .select("executor_nik, full_name")
        .eq("status", "Active")
        .order("full_name")
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      admin
        .from("fleets")
        .select("plat_number, fleet_type")
        .eq("status", "Active")
        .order("plat_number")
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      admin
        .from("products")
        .select("product")
        .eq("status", "Active")
        .order("product")
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      admin
        .from("maintenance_lists")
        .select("maintenance_list")
        .eq("status", "Active")
        .order("maintenance_list")
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      admin
        .from("ticketings")
        .select(
          "transaction_id, status, maintenance_list, location, fleet_plat_number, created_at, created_by, cancellation_note",
        )
        .eq("created_by", profile.id)
        .order("created_at", { ascending: false })
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      admin
        .from("ticketings")
        .select("transaction_id, status, location, fleet_plat_number, created_at")
        .order("created_at", { ascending: false })
        .range(from, to),
    ),
  ]);

  const dispatcherTasks = await fetchAllRows((from, to) =>
    admin
      .from("tasks")
      .select(
        "transaction_id, task_type, source_type, status, fleet_ownership, created_by, start_point, destination, executor_snapshot, fleet_snapshot, external_executor, external_fleet",
      )
      .or(`created_by.eq.${profile.id},fleet_ownership.eq.Non-TGR`)
      .range(from, to),
  );

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
        locations={locations.map((i) => i.location)}
        schedules={schedules}
        executors={executors}
        fleets={fleets}
        products={products.map((i) => i.product)}
        maintenanceLists={maintenanceLists.map(
          (i) => i.maintenance_list,
        )}
        tickets={tickets}
      />

      <DispatcherSummaryInteractive
        tasks={dispatcherTasks.map((task) => ({
          transaction_id: task.transaction_id,
          task_type: task.task_type,
          source_type: task.source_type,
          status: task.status,
          fleet_ownership: task.fleet_ownership,
          start_point: task.start_point,
          destination: task.destination,
          executor_snapshot: task.executor_snapshot,
          fleet_snapshot: task.fleet_snapshot,
          external_executor: task.external_executor,
          external_fleet: task.external_fleet,
        }))}
        tickets={allTickets
          .filter((ticket) => {
            const date = new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Jakarta",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date());
            const ticketDate = new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Jakarta",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date(ticket.created_at));
            return ticketDate === date;
          })
          .map((ticket) => ({
            transaction_id: ticket.transaction_id,
            status: ticket.status,
            location: ticket.location,
            fleet_plat_number: ticket.fleet_plat_number,
          }))}
        statusCounts={taskStatusCounts}
        ticketCount={Object.values(data.ticketCounts).reduce((a, b) => a + b, 0)}
      />
    </div>
  );
}
