import MaintainerMaintenanceTable from "@/components/maintainer/maintenance-table";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";
import { fetchAllRows } from "@/lib/server/fetch-all";

export default async function MaintainerTicketMaintenancePage() {
  const profile = await getCurrentProfile();
  const admin = createAdminClient();
  const tickets = await fetchAllRows((from, to) =>
    admin
      .from("ticketings")
      .select(
        "transaction_id, status, maintenance_list, location, fleet_plat_number, created_at, maintainer_user_id",
      )
      .order("created_at", { ascending: true })
      .range(from, to),
  );

  const visible =
    profile.role === "Maintainer"
      ? tickets.filter(
          (ticket) =>
            ticket.status === "Requested" ||
            ticket.maintainer_user_id === profile.id,
        )
      : tickets;

  return (
    <div className="role-page">
      <div className="page-heading">
        <div>
          <h1>Perbaikan</h1>
          <p>Tinggal lanjutin perbaikan sesuai tahapnya, ya.</p>
        </div>
      </div>

      <MaintainerMaintenanceTable tickets={visible} />
    </div>
  );
}
