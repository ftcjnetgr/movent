import OperationCreationHub from "@/components/operation/creation-hub";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";

export default async function OperationBerandaPage() {
  const profile = await getCurrentProfile();
  const admin = createAdminClient();
  const [
    { data: locations },
    { data: products },
    { data: executors },
    { data: fleets },
    { data: tasks },
    { count: requested },
    { count: completed },
  ] = await Promise.all([
    admin
      .from("locations")
      .select("location")
      .eq("status", "Active")
      .order("location"),
    admin
      .from("products")
      .select("product")
      .eq("status", "Active")
      .order("product"),
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
      .from("tasks")
      .select(
        "transaction_id, status, start_point, destination, std, sta, external_executor, external_fleet, sj_number, sj_qty, sj_weight, product, sj_note",
      )
      .eq("task_type", "Supply")
      .eq("fleet_ownership", "TGR")
      .eq("created_by", profile.id)
      .eq("status", "Assigned")
      .order("created_at", { ascending: false }),
    admin
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("source_type", "Jadwal Tambahan")
      .eq("status", "Requested"),
    admin
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("source_type", "Jadwal Tambahan")
      .eq("status", "Completed"),
  ]);

  return (
    <div className="role-page">
      <div className="page-heading">
        <div>
          <h1>Operasional hari ini</h1>
          <p>
            Buat Supply TGR dan ajukan Jadwal Tambahan tanpa pindah-pindah
            halaman.
          </p>
        </div>
      </div>

      <OperationCreationHub
        locations={(locations ?? []).map((item) => item.location)}
        products={(products ?? []).map((item) => item.product)}
        executors={executors ?? []}
        fleets={fleets ?? []}
        tasks={tasks ?? []}
      />

      <section className="section-block">
        <div className="metric-grid">
          <div className="metric-card">
            <span>TGR masih nunggu</span>
            <strong>{tasks?.length ?? 0}</strong>
          </div>
          <div className="metric-card">
            <span>Jadwal tambahan udah diajuin</span>
            <strong>{requested ?? 0}</strong>
          </div>
          <div className="metric-card">
            <span>Jadwal tambahan udah selesai</span>
            <strong>{completed ?? 0}</strong>
          </div>
          <div className="metric-card">
            <span>Lagi Jalan</span>
            <strong>{(tasks?.length ?? 0) + (requested ?? 0)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
