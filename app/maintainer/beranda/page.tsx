import { createAdminClient } from "@/lib/supabase/admin";
import { getDashboardData } from "@/lib/server/dashboard";
import { getCurrentProfile } from "@/lib/server/profile";
import { compareStatus, STATUS_LABELS, STATUS_SUBCOPY, StatusIcon } from "@/components/shared/status-config";

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function statusClass(status: string) {
  return "status-" + status.toLowerCase().replaceAll(" ", "-");
}

function shortTime(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

export default async function MaintainerBerandaPage() {
  const profile = await getCurrentProfile();
  const admin = createAdminClient();

  const [data, ticketResult, activityResult] = await Promise.all([
    getDashboardData(profile),
    admin
      .from("ticketings")
      .select(
        "transaction_id, status, maintenance_list, location, fleet_plat_number, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(12),
    admin
      .from("ticketings")
      .select("status, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const tickets = [...(ticketResult.data ?? [])].sort((a, b) => compareStatus(a.status, b.status));
  const activities = activityResult.data ?? [];

  const totalMaintenance = Object.values(data.ticketCounts).reduce(
    (total, count) => total + (count ?? 0),
    0,
  );

  const byHour = Array.from({ length: 24 }, (_, hour) => {
    const rows = activities.filter((ticket) => {
      if (!ticket.created_at) return false;

      return (
        new Date(ticket.created_at)
          .toLocaleString("en-US", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            hour12: false,
          })
          .slice(0, 2) === String(hour).padStart(2, "0")
      );
    });

    return {
      hour,
      requested: rows.filter((ticket) => ticket.status === "Requested").length,
      confirmed: rows.filter((ticket) => ticket.status === "Confirmed").length,
      inProgress: rows.filter((ticket) => ticket.status === "In Progress")
        .length,
      completed: rows.filter((ticket) => ticket.status === "Completed").length,
      canceled: rows.filter((ticket) => ticket.status === "Canceled").length,
    };
  });

  const maxHour = Math.max(
    1,
    ...byHour.map(
      (item) =>
        item.requested +
        item.confirmed +
        item.inProgress +
        item.completed +
        item.canceled,
    ),
  );

  return (
    <div className="super-dashboard maintainer-dashboard">
      <div className="super-dashboard-heading dashboard-page-heading">
        <div>
          <h1>Beranda</h1>
          <p>
            Biar gampang, semua perbaikan yang perlu kamu kerjain ada di sini.
          </p>
        </div>
      </div>

      <section className="super-kpi-grid maintenance-kpi-grid">
        <div className="super-kpi-card kpi-purple status-kpi-card status-kpi-total-maintenance">
          <div className="super-kpi-icon">
            <StatusIcon status="" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Semua Perbaikan</span>
            <strong>{totalMaintenance}</strong>
            <small>Total perbaikan</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-blue status-kpi-card status-kpi-requested">
          <div className="super-kpi-icon">
            <StatusIcon status="Requested" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Udah Diajuin</span>
            <strong>{data.ticketCounts.Requested ?? 0}</strong>
            <small>{STATUS_SUBCOPY.Requested}</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-cyan status-kpi-card status-kpi-confirmed">
          <div className="super-kpi-icon">
            <StatusIcon status="Confirmed" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Udah Diterima</span>
            <strong>{data.ticketCounts.Confirmed ?? 0}</strong>
            <small>{STATUS_SUBCOPY.Confirmed}</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-orange status-kpi-card status-kpi-in-progress">
          <div className="super-kpi-icon">
            <StatusIcon status="In Progress" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Lagi Dikerjain</span>
            <strong>{data.ticketCounts["In Progress"] ?? 0}</strong>
            <small>{STATUS_SUBCOPY["In Progress"]}</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-purple status-kpi-card status-kpi-completed">
          <div className="super-kpi-icon">
            <StatusIcon status="Completed" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Udah Selesai</span>
            <strong>{data.ticketCounts.Completed ?? 0}</strong>
            <small>{STATUS_SUBCOPY.Completed}</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-red status-kpi-card status-kpi-canceled">
          <div className="super-kpi-icon">
            <StatusIcon status="Canceled" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Dibatalin</span>
            <strong>{data.ticketCounts.Canceled ?? 0}</strong>
            <small>{STATUS_SUBCOPY.Canceled}</small>
          </div>
        </div>
      </section>

      <section className="super-dashboard-main-grid maintenance-dashboard-main-grid">
        <div className="super-panel super-chart-panel">
          <div className="super-panel-heading">
            <div>
              <h2>Aktivitas Perbaikan</h2>
              <p>Biar gampang dipantau, perbaikan terbaru ada di sini.</p>
            </div>

            <div className="super-chart-legend">
              <span><i className="legend-requested" /> Udah Diajuin</span>
              <span><i className="legend-confirmed" /> Udah Diterima</span>
              <span><i className="legend-in-progress" /> Lagi Dikerjain</span>
              <span><i className="legend-completed" /> Udah Selesai</span>
            </div>
          </div>

          <div className="super-chart">
            <div className="super-chart-y">
              <span>{maxHour}</span>
              <span>{Math.ceil(maxHour / 2)}</span>
              <span>0</span>
            </div>

            <div className="super-chart-bars">
              {byHour.map((item) => (
                <div className="super-chart-column" key={item.hour}>
                  <div className="super-chart-stack">
                    {item.requested > 0 ? (
                      <span
                        className="bar-requested"
                        style={{
                          height: String((item.requested / maxHour) * 100) + "%",
                        }}
                      />
                    ) : null}
                    {item.confirmed > 0 ? (
                      <span
                        className="bar-confirmed"
                        style={{
                          height: String((item.confirmed / maxHour) * 100) + "%",
                        }}
                      />
                    ) : null}
                    {item.inProgress > 0 ? (
                      <span
                        className="bar-in-progress"
                        style={{
                          height:
                            String((item.inProgress / maxHour) * 100) + "%",
                        }}
                      />
                    ) : null}
                    {item.completed > 0 ? (
                      <span
                        className="bar-completed"
                        style={{
                          height: String((item.completed / maxHour) * 100) + "%",
                        }}
                      />
                    ) : null}
                  </div>

                  <small>{String(item.hour).padStart(2, "0")}</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="super-panel super-activity-panel">
          <div className="super-panel-heading">
            <div>
              <h2>Aktivitas Sistem</h2>
              <p>Aktivitas terbaru perbaikan.</p>
            </div>
          </div>

          <div className="super-activity-list">
            <div>
              <span className="activity-dot blue" />
              <span>{tickets.length} perbaikan terbaru</span>
              <time>{shortTime(new Date().toISOString())}</time>
            </div>

            <div>
              <span className="activity-dot orange" />
              <span>
                {(data.ticketCounts.Confirmed ?? 0) +
                  (data.ticketCounts["In Progress"] ?? 0)}{" "}
                perbaikan sedang berjalan
              </span>
              <time>{shortTime(new Date().toISOString())}</time>
            </div>

            <div>
              <span className="activity-dot purple" />
              <span>
                {data.ticketCounts.Completed ?? 0} perbaikan selesai
              </span>
              <time>{shortTime(new Date().toISOString())}</time>
            </div>
          </div>
        </div>
      </section>

      <section className="super-dashboard-table-grid controller-detail-tables controller-single-detail-table">
        <div className="super-panel super-table-panel">
          <div className="super-panel-heading">
            <div>
              <h2>Perbaikan Terbaru</h2>
              <p>Biar nggak perlu buka-buka lagi, detail singkatnya ada di sini.</p>
            </div>
          </div>

          <div className="super-table-wrap">
            <table className="controller-detail-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Perbaikan</th>
                  <th>Armada</th>
                  <th>Lokasi</th>
                  <th>Status</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.transaction_id}>
                    <td>
                      <strong>{ticket.transaction_id}</strong>
                    </td>
                    <td>{ticket.maintenance_list ?? "-"}</td>
                    <td>{ticket.fleet_plat_number ?? "-"}</td>
                    <td>{ticket.location ?? "-"}</td>
                    <td>
                      <span
                        className={`status-badge ${statusClass(ticket.status)}`}
                      >
                        {statusLabel(ticket.status)}
                      </span>
                    </td>
                    <td>
                      <strong>{shortTime(ticket.created_at)}</strong>
                    </td>
                  </tr>
                ))}

                {!tickets.length ? (
                  <tr>
                    <td colSpan={6} className="super-empty-cell">
                      Belum ada perbaikan di sini.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
