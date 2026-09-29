import MaintainerPerbaikanTable from "@/components/maintainer/perbaikan-table";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";

export default async function MaintainerTicketPerbaikanPage() {
  const profile = await getCurrentProfile();
  const admin = createAdminClient();
  const { data: tickets } = await admin
    .from("ticketings")
    .select(
      "transaction_id, status, perbaikan_list, location, fleet_plat_number, created_at, maintainer_user_id",
    )
    .order("created_at", { ascending: true });

  const visible =
    profile.role === "Maintainer"
      ? (tickets ?? []).filter(
          (ticket) =>
            ticket.status === "Requested" ||
            ticket.maintainer_user_id === profile.id,
        )
      : (tickets ?? []);

  return (
    <div className="role-page">
      <div className="page-heading">
        <div>
          <h1>Perbaikan</h1>
          <p>Tinggal lanjutin perbaikan sesuai tahapnya, ya.</p>
        </div>
      </div>

      <MaintainerPerbaikanTable tickets={visible} />
    </div>
  );
}
