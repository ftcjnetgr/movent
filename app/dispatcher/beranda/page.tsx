import DispatcherCreationHub from "@/components/dispatcher/creation-hub";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";

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
undefined  ]);
  return (
    <div className="role-page">
      <div className="page-heading">
        <div>
          <h1>Halo, Dispatcher!</h1>
          <p>Yuk, atur penugasan dan pastiin semua perjalanan jalan sesuai rencana.</p>
        </div>
      </div>

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

    </div>
  );
}
