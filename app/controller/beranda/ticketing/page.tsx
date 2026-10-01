import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";
import { getDashboardData } from "@/lib/server/dashboard";
import { compareStatus, STATUS_LABELS, STATUS_SUBCOPY, StatusIcon } from "@/components/shared/status-config";

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
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

export default async function ControllerTicketingDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const profile = await getCurrentProfile();
  const admin = createAdminClient();
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const params = await searchParams;
  const requestedFrom = params.from ?? today;
  const requestedTo = params.to ?? requestedFrom;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(requestedFrom)
    ? requestedFrom
    : today;
  const to =
    /^\d{4}-\d{2}-\d{2}$/.test(requestedTo) && requestedTo >= from
      ? requestedTo
      : from;
  const rangeStart = new Date(`${from}T00:00:00+07:00`).toISOString();
  const rangeEnd = new Date(
    new Date(`${to}T00:00:00+07:00`).getTime() + 86400000,
  ).toISOString();

  const [data, ticketResult, performanceResult, maintenanceListResult] = await Promise.all([
    getDashboardData(profile, from, to),
    admin
      .from("ticketings")
      .select(
        "transaction_id, status, maintenance_list, fleet_plat_number, fleet_location, created_at, completed_at",
      )
      .order("created_at", { ascending: false })
      .gte("created_at", rangeStart)
      .lt("created_at", rangeEnd)
      .limit(12),
    admin
      .from("ticketings")
      .select("status, maintenance_list, created_at, completed_at")
      .gte("created_at", rangeStart)
      .lt("created_at", rangeEnd),
    admin
      .from("maintenance_lists")
      .select("maintenance_list, aging")
      .eq("status", "Active"),
  ]);

  const tickets = [...(ticketResult.data ?? [])].sort((a, b) => compareStatus(a.status, b.status));
  const totalMaintenance = Object.values(data.ticketCounts).reduce(
    (total, count) => total + (count ?? 0),
    0,
  );

  const maintenanceAging = new Map(
    (maintenanceListResult.data ?? []).map((item) => [
      item.maintenance_list,
      item.aging,
    ]),
  );

  function jakartaDate(value: string) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  }

  function addDays(date: string, days: number) {
    const base = new Date(date + "T00:00:00+07:00");
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(base.getTime() + days * 86400000));
  }

  const performanceRows = performanceResult.data ?? [];
  const maintenancePerformance = performanceRows.reduce(
    (acc, ticket) => {
      const aging = maintenanceAging.get(ticket.maintenance_list ?? "");
      if (!aging || aging < 1 || ticket.status !== "Completed" || !ticket.completed_at) {
        return acc;
      }
      const createdDate = jakartaDate(ticket.created_at);
      const deadlineDate = addDays(createdDate, aging - 1);
      const completedDate = jakartaDate(ticket.completed_at);
      const completedOnTime = completedDate <= deadlineDate;
      acc.total += 1;
      if (completedOnTime) acc.onTime += 1;
      else acc.late += 1;
      const durationMs = new Date(ticket.completed_at).getTime() - new Date(ticket.created_at).getTime();
      if (Number.isFinite(durationMs) && durationMs >= 0) {
        acc.durationDays += durationMs / 86400000;
        acc.durationCount += 1;
      }
      return acc;
    },
    { total: 0, onTime: 0, late: 0, durationDays: 0, durationCount: 0 },
  );
  const maintenanceOnTimePercentage = maintenancePerformance.total > 0
    ? Math.round((maintenancePerformance.onTime / maintenancePerformance.total) * 100)
    : 0;
  const maintenanceLatePercentage = maintenancePerformance.total > 0
    ? Math.round((maintenancePerformance.late / maintenancePerformance.total) * 100)
    : 0;
  const { data: todayTickets } = await admin
    .from("ticketings")
    .select("status, created_at")
    .gte("created_at", rangeStart)
    .lt("created_at", rangeEnd);

  const todayActivities = todayTickets ?? [];
  const byHour = Array.from({ length: 24 }, (_, hour) => {
    const rows = todayActivities.filter(
      (ticket) =>
        new Date(ticket.created_at)
          .toLocaleString("en-US", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            hour12: false,
          })
          .slice(0, 2) === String(hour).padStart(2, "0"),
    );
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
    <div className="super-dashboard">
      <div className="super-dashboard-heading dashboard-page-heading">
        <div>
          <h1>Beranda</h1>
          <p>
            Ini ringkasan operasional sesuai periode yang dipilih. Biar gampang
            dipantau, semuanya kami rangkum di sini.
          </p>
        </div>
        <nav className="dashboard-view-tabs" aria-label="Dashboard">
          <Link href={`/controller/beranda?from=${from}&to=${to}`}>
            Penugasan
          </Link>
          <Link
            href={`/controller/beranda/ticketing?from=${from}&to=${to}`}
            className="active"
          >
            Perbaikan
          </Link>
        </nav>
      </div>

      <section className="super-kpi-grid maintenance-kpi-grid">
        <div className="super-kpi-card kpi-purple status-kpi-card status-kpi-total-maintenance">
          <div className="super-kpi-icon">
            <StatusIcon status="" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Total Perbaikan</span>
            <strong>{totalMaintenance}</strong>
            <small>Semua pengajuan</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-blue status-kpi-card status-kpi-requested">
          <div className="super-kpi-icon">
            <StatusIcon status="Requested" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Udah Diajuin</span>
            <strong>{data.ticketCounts.Requested ?? 0}</strong>
            <small>{percentage(data.ticketCounts.Requested ?? 0, totalMaintenance)}% dari total</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-cyan status-kpi-card status-kpi-confirmed">
          <div className="super-kpi-icon">
            <StatusIcon status="Confirmed" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Udah Diterima</span>
            <strong>{data.ticketCounts.Confirmed ?? 0}</strong>
            <small>{percentage(data.ticketCounts.Confirmed ?? 0, totalMaintenance)}% dari total</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-orange status-kpi-card status-kpi-in-progress">
          <div className="super-kpi-icon">
            <StatusIcon status="In Progress" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Lagi Dikerjain</span>
            <strong>{data.ticketCounts["In Progress"] ?? 0}</strong>
            <small>{percentage(data.ticketCounts["In Progress"] ?? 0, totalMaintenance)}% dari total</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-purple status-kpi-card status-kpi-completed">
          <div className="super-kpi-icon">
            <StatusIcon status="Completed" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Udah Selesai</span>
            <strong>{data.ticketCounts.Completed ?? 0}</strong>
            <small>{percentage(data.ticketCounts.Completed ?? 0, totalMaintenance)}% dari total</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-red status-kpi-card status-kpi-canceled">
          <div className="super-kpi-icon">
            <StatusIcon status="Canceled" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Dibatalin</span>
            <strong>{data.ticketCounts.Canceled ?? 0}</strong>
            <small>{percentage(data.ticketCounts.Canceled ?? 0, totalMaintenance)}% dari total</small>
          </div>
        </div>
      </section>

      <section className="super-dashboard-main-grid maintenance-dashboard-main-grid">
        <div className="super-panel super-chart-panel">
          <div className="super-panel-heading">
            <div>
              <h2>Aktivitas Perbaikan</h2>
              <p>Biar gampang dipantau, perbaikan di periode ini ada di sini.</p>
            </div>
            <div className="super-chart-legend">
              <span><i className="legend-requested" /> Udah Diajuin</span>
              <span><i className="legend-confirmed" /> Udah Diterima</span>
              <span><i className="legend-in-progress" /> Lagi Dikerjain</span>
              <span><i className="legend-completed" /> Udah Selesai</span>
              <span><i className="legend-canceled" /> Dibatalin</span>
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
                    {item.canceled > 0 ? (
                      <span
                        className="bar-canceled"
                        style={{
                          height: String((item.canceled / maxHour) * 100) + "%",
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
              <h2>Ketepatan Perbaikan</h2>
              <p>Sesuai batas waktu perbaikannya.</p>
            </div>
          </div>
          <div className="super-activity-list">
            <div>
              <span className="activity-dot blue" />
              <span>Perbaikannya pas</span>
              <strong>{maintenancePerformance.onTime}</strong>
              <time>{maintenanceOnTimePercentage}%</time>
            </div>
            <div>
              <span className="activity-dot orange" />
              <span>Perbaikannya telat</span>
              <strong>{maintenancePerformance.late}</strong>
              <time>{maintenanceLatePercentage}%</time>
            </div>
          </div>
        </div>      </section>

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
                    <td>{ticket.fleet_location ?? "-"}</td>
                    <td>
                      <span
                        className={"status-badge " + statusClass(ticket.status)}
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
