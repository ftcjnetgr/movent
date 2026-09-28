import { createAdminClient } from "@/lib/supabase/admin";
import { getDashboardData } from "@/lib/server/dashboard";
import { getCurrentProfile } from "@/lib/server/profile";
import StatusBadge from "@/components/shared/status-badge";

function SummaryIcon({
  name,
}: {
  name: "clipboard" | "wrench" | "check" | "play" | "clock";
}) {
  const common = {
    viewBox: "0 0 24 24",
    width: 20,
    height: 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "clipboard")
    return (
      <svg {...common}>
        <rect x="6" y="5" width="12" height="16" rx="2" />
        <path d="M9 5V3h6v2M9 10h6M9 14h6M9 18h4" />
      </svg>
    );
  if (name === "wrench")
    return (
      <svg {...common}>
        <path d="M14 6a4 4 0 0 1-5 5L4 16l4 4 5-5a4 4 0 0 1 5-5l-4-4Z" />
      </svg>
    );
  if (name === "check")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </svg>
    );
  if (name === "play")
    return (
      <svg {...common}>
        <path d="M8 5v14l11-7-11-7Z" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function statusLabel(status: string) {
  return (
    (
      {
        Requested: "Diajukan",
        Confirmed: "Dikonfirmasi",
        "In Progress": "Sedang dikerjakan",
        Completed: "Selesai",
        Canceled: "Dibatalkan",
      } as Record<string, string>
    )[status] ?? status
  );
}

function timeLabel(value: string | null) {
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
  const [data, ticketResult, allActiveResult] = await Promise.all([
    getDashboardData(profile),
    admin
      .from("ticketings")
      .select(
        "transaction_id, status, maintenance_list, location, fleet_plat_number, created_at",
      )
      .not("status", "in", "(Completed,Canceled)")
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("ticketings")
      .select("status, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const tickets = ticketResult.data ?? [];
  const activityRows = allActiveResult.data ?? [];
  const activeCount = activityRows.filter(
    (row) => !["Completed", "Canceled"].includes(row.status),
  ).length;
  const completedCount = data.ticketCounts.Completed ?? 0;

  const byHour = Array.from({ length: 24 }, (_, hour) => {
    const rows = activityRows.filter((ticket) => {
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
      total: rows.length,
      completed: rows.filter((row) => row.status === "Completed").length,
      progress: rows.filter((row) => row.status === "In Progress").length,
      requested: rows.filter(
        (row) => row.status === "Requested" || row.status === "Confirmed",
      ).length,
    };
  });

  const maxHour = Math.max(1, ...byHour.map((item) => item.total));

  return (
    <div className="super-dashboard maintainer-dashboard">
      <div className="super-dashboard-heading dashboard-page-heading">
        <div>
          <h1>Beranda</h1>
          <p>
            Ringkasan maintenance armada yang perlu dipantau dan diselesaikan.
          </p>
        </div>
      </div>

      <section className="super-kpi-grid assignment-kpi-grid">
        <div className="super-kpi-card kpi-blue">
          <div className="super-kpi-icon">
            <SummaryIcon name="clipboard" />
          </div>
          <div className="super-kpi-content">
            <span>Semua Maintenance</span>
            <strong>{activityRows.length}</strong>
            <small>Data maintenance</small>
          </div>
        </div>
        <div className="super-kpi-card kpi-orange">
          <div className="super-kpi-icon">
            <SummaryIcon name="clock" />
          </div>
          <div className="super-kpi-content">
            <span>Diajukan</span>
            <strong>{data.ticketCounts.Requested ?? 0}</strong>
            <small>Menunggu konfirmasi</small>
          </div>
        </div>
        <div className="super-kpi-card kpi-cyan">
          <div className="super-kpi-icon">
            <SummaryIcon name="check" />
          </div>
          <div className="super-kpi-content">
            <span>Dikonfirmasi</span>
            <strong>{data.ticketCounts.Confirmed ?? 0}</strong>
            <small>Siap dikerjakan</small>
          </div>
        </div>
        <div className="super-kpi-card kpi-green">
          <div className="super-kpi-icon">
            <SummaryIcon name="play" />
          </div>
          <div className="super-kpi-content">
            <span>Sedang Dikerjakan</span>
            <strong>{data.ticketCounts["In Progress"] ?? 0}</strong>
            <small>Maintenance aktif</small>
          </div>
        </div>
        <div className="super-kpi-card kpi-purple">
          <div className="super-kpi-icon">
            <SummaryIcon name="check" />
          </div>
          <div className="super-kpi-content">
            <span>Selesai</span>
            <strong>{completedCount}</strong>
            <small>Maintenance selesai</small>
          </div>
        </div>
      </section>

      <section className="super-dashboard-main-grid">
        <div className="super-panel super-chart-panel">
          <div className="super-panel-heading">
            <div>
              <h2>Aktivitas Maintenance</h2>
              <p>
                Distribusi pengajuan dan pengerjaan maintenance berdasarkan
                waktu dibuat.
              </p>
            </div>
            <div className="super-chart-legend">
              <span>
                <i className="legend-purple" /> Selesai
              </span>
              <span>
                <i className="legend-green" /> Sedang dikerjakan
              </span>
              <span>
                <i className="legend-orange" /> Diajukan / dikonfirmasi
              </span>
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
                    {item.completed > 0 ? (
                      <span
                        className="bar-completed"
                        style={{
                          height: `${(item.completed / maxHour) * 100}%`,
                        }}
                      />
                    ) : null}
                    {item.progress > 0 ? (
                      <span
                        className="bar-driving"
                        style={{
                          height: `${(item.progress / maxHour) * 100}%`,
                        }}
                      />
                    ) : null}
                    {item.requested > 0 ? (
                      <span
                        className="bar-unassigned"
                        style={{
                          height: `${(item.requested / maxHour) * 100}%`,
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
              <p>Ringkasan status maintenance.</p>
            </div>
          </div>
          <div className="super-activity-list">
            <div>
              <span className="activity-dot blue" />
              <span>{tickets.length} maintenance terbaru</span>
              <time>hari ini</time>
            </div>
            <div>
              <span className="activity-dot purple" />
              <span>{completedCount} maintenance selesai</span>
              <time>status</time>
            </div>
            <div>
              <span className="activity-dot orange" />
              <span>{activeCount} maintenance aktif</span>
              <time>status</time>
            </div>
          </div>
        </div>
      </section>

      <section className="super-dashboard-table-grid controller-detail-tables controller-single-detail-table">
        <div className="super-panel super-table-panel">
          <div className="super-panel-heading">
            <div>
              <h2>Maintenance Terbaru</h2>
              <p>Pengajuan maintenance terbaru yang perlu dipantau.</p>
            </div>
          </div>
          <div className="super-table-wrap">
            <table className="controller-detail-table">
              <thead>
                <tr>
                  <th>Maintenance</th>
                  <th>Lokasi</th>
                  <th>Armada</th>
                  <th>Dibuat</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.transaction_id}>
                    <td>
                      <strong>{ticket.transaction_id}</strong>
                      <small>{ticket.maintenance_list ?? "-"}</small>
                    </td>
                    <td>{ticket.location ?? "-"}</td>
                    <td>{ticket.fleet_plat_number ?? "-"}</td>
                    <td>
                      <strong>{timeLabel(ticket.created_at)}</strong>
                    </td>
                    <td>
                      <StatusBadge
                        status={ticket.status}
                        label={statusLabel(ticket.status)}
                      />
                    </td>
                  </tr>
                ))}
                {!tickets.length ? (
                  <tr>
                    <td colSpan={5} className="super-empty-cell">
                      Belum ada maintenance aktif.
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
