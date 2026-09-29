import OperationCreationHub from "@/components/operation/creation-hub";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function OperationBerandaPage() {
  const admin = createAdminClient();
  const [
    { data: locations },
    { data: products },
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
      .from("tasks")
      .select(
        "transaction_id, status, start_point, destination, std, sta, external_executor, external_fleet, sj_number, sj_qty, sj_weight, product, sj_note",
      )
      .eq("task_type", "Supply")
      .eq("fleet_ownership", "Non-TGR")
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
            Buat Supply Non-TGR dan ajukan Jadwal Tambahan tanpa pindah-pindah
            halaman.
          </p>
        </div>
      </div>

      <OperationCreationHub
        locations={(locations ?? []).map((item) => item.location)}
        products={(products ?? []).map((item) => item.product)}
        tasks={tasks ?? []}
      />

      <section className="section-block">
        <div className="metric-grid">
          <div className="metric-card">
            <span>Non-TGR masih nunggu</span>
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
