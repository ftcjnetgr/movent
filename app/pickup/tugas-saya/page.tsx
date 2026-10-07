import PickupDeliveryTaskFlow from "@/components/pickup-delivery/task-flow";
import { fetchAllRows } from "@/lib/server/fetch-all";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";

export default async function PickupTugasSayaPage() {
  const profile = await getCurrentProfile();
  const admin = createAdminClient();

  const { data: activeTask } = await admin
    .from("tasks")
    .select("id, transaction_id, status, fleet_snapshot")
    .eq("executor_nik", profile.username)
    .in("status", ["Confirmed", "Driving"])
    .order("created_at", { ascending: false })
    .maybeSingle();

  const stops = activeTask
    ? await fetchAllRows((from, to) =>
        admin
          .from("task_stops")
          .select("id, sequence_no, location, status, checkin_at")
          .eq("task_id", activeTask.id)
          .order("sequence_no")
          .range(from, to),
      )
    : [];

  return <PickupDeliveryTaskFlow role="Pickup" activeTask={activeTask} stops={stops} />;
}
