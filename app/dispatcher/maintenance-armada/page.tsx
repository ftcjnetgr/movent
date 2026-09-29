import DispatcherPerbaikanForm from "@/components/dispatcher/perbaikan-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";

export default async function DispatcherPerbaikanArmadaPage() {
  const profile = await getCurrentProfile();
  const admin = createAdminClient();
  const [
    { data: perbaikanLists },
    { data: locations },
    { data: fleets },
    { data: tickets },
  ] = await Promise.all([
    admin
      .from("perbaikan_lists")
      .select("perbaikan_list")
      .eq("status", "Active")
      .order("perbaikan_list"),
    admin
      .from("locations")
      .select("location")
      .eq("status", "Active")
      .order("location"),
    admin
      .from("fleets")
      .select("plat_number, fleet_type")
      .eq("status", "Active")
      .order("plat_number"),
    (() => {
      let query = admin
        .from("ticketings")
        .select(
          "transaction_id, status, perbaikan_list, location, fleet_plat_number, created_at, created_by, cancellation_note",
        )
        .order("created_at", { ascending: false })
        .limit(20);
      if (profile.role !== "Super User")
        query = query.eq("created_by", profile.id);
      return query;
    })(),
  ]);

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Perbaikan armada</h1>
          <p>Mau bikin perbaikan? Mulai dari sini, ya.</p>
        </div>
      </div>
      <DispatcherPerbaikanForm
        perbaikanLists={(perbaikanLists ?? []).map(
          (item) => item.perbaikan_list,
        )}
        locations={(locations ?? []).map((item) => item.location)}
        fleets={fleets ?? []}
        tickets={tickets ?? []}
      />
    </>
  );
}
