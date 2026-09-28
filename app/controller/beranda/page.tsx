import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";
import { getDashboardData } from "@/lib/server/dashboard";
import StatusBadge from "@/components/shared/status-badge";
import { compareStatus, STATUS_LABELS, StatusIcon } from "@/components/shared/status-config";

function statusLabel(status: string) {
  return (
    {
      Assigned: "Udah Ditugasin",
      Confirmed: "Udah Diterima",
      Ready: "Siap Jalan",
      Driving: "Lagi Jalan",
      Completed: "Udah Selesai",
      Canceled: "Dibatalin",
    }[status] ?? status
  );
}


function isReadyToGo(task: {
  status: string;
  task_type: string;
  fleet_ownership: string | null;
  sj_number: string | null;
  odometer_start: number | null;
}) {
  if (task.status !== "Confirmed" || task.odometer_start === null) return false;

  if (task.task_type === "Supply" && task.fleet_ownership === "TGR") {
    return Boolean(task.sj_number);
  }

  return true;
}

function displayTaskStatus(task: {
  status: string;
  task_type: string;
  fleet_ownership: string | null;
  sj_number: string | null;
  odometer_start: number | null;
}) {
  return isReadyToGo(task) ? "Ready" : task.status;
}

function sortByStatusAndTime<T extends {
  status: string;
  task_type: string;
  fleet_ownership: string | null;
  sj_number: string | null;
  odometer_start: number | null;
  std: string | null;
  created_at: string;
}>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const statusOrder = compareStatus(
      displayTaskStatus(a),
      displayTaskStatus(b),
    );

    if (statusOrder !== 0) return statusOrder;

    const aTime = a.std
      ? new Date(a.std).getTime()
      : new Date(a.created_at).getTime();
    const bTime = b.std
      ? new Date(b.std).getTime()
      : new Date(b.created_at).getTime();

    return aTime - bTime;
  });
}

function timeLabel(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

function shortTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

export default async function ControllerPenugasanDashboardPage({
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

  const [data, tasksResult, activityResult, totalTaskResult] =
    await Promise.all([
      getDashboardData(profile, from, to),
      admin
        .from("tasks")
        .select(
          "id, transaction_id, task_type, status, fleet_ownership, start_point, destination, std, sta, executor_snapshot, fleet_snapshot, schedule_id, sj_number, odometer_start, created_at",
        )
        .order("created_at", { ascending: false })
        .gte("created_at", rangeStart)
        .lt("created_at", rangeEnd)
        .limit(8),
      admin
        .from("tasks")
        .select("status, task_type, fleet_ownership, sj_number, odometer_start, std, created_at")
        .gte("std", rangeStart)
        .lt("std", rangeEnd),
      admin
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .gte("std", rangeStart)
        .lt("std", rangeEnd),
    ]);

  const rawTasks = tasksResult.data ?? [];
  const activities = activityResult.data ?? [];
  const tasks = sortByStatusAndTime(rawTasks);

  const taskStatusCounts = {
    Assigned: activities.filter((task) => displayTaskStatus(task) === "Assigned")
      .length,
    Confirmed: activities.filter((task) => displayTaskStatus(task) === "Confirmed")
      .length,
    Ready: activities.filter((task) => displayTaskStatus(task) === "Ready")
      .length,
    Driving: activities.filter((task) => displayTaskStatus(task) === "Driving")
      .length,
    Completed: activities.filter((task) => displayTaskStatus(task) === "Completed")
      .length,
    Canceled: activities.filter((task) => displayTaskStatus(task) === "Canceled")
      .length,
  };

  const activeTasks =
    taskStatusCounts.Assigned +
    taskStatusCounts.Confirmed +
    taskStatusCounts.Ready +
    taskStatusCounts.Driving;

  const completedTasks = taskStatusCounts.Completed;

  const byHour = Array.from({ length: 24 }, (_, hour) => {
    const rows = activities.filter((task) => {
      if (!task.created_at) return false;

      return (
        new Date(task.created_at)
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
      assigned: rows.filter((task) => displayTaskStatus(task) === "Assigned")
        .length,
      confirmed: rows.filter((task) => displayTaskStatus(task) === "Confirmed")
        .length,
      ready: rows.filter((task) => displayTaskStatus(task) === "Ready").length,
      driving: rows.filter((task) => displayTaskStatus(task) === "Driving").length,
      completed: rows.filter((task) => displayTaskStatus(task) === "Completed")
        .length,
      canceled: rows.filter((task) => displayTaskStatus(task) === "Canceled")
        .length,
    };
  });

  const maxHour = Math.max(
    1,
    ...byHour.map(
      (item) =>
        item.assigned +
        item.confirmed +
        item.ready +
        item.driving +
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
          <Link
            href={`/controller/beranda?from=${from}&to=${to}`}
            className="active"
          >
            Penugasan
          </Link>
          <Link href={`/controller/beranda/ticketing?from=${from}&to=${to}`}>
            Maintenance
          </Link>
        </nav>
      </div>

      <section className="super-kpi-grid assignment-kpi-grid">
        <div className="super-kpi-card kpi-orange status-kpi-card status-kpi-assigned">
          <div className="super-kpi-icon">
            <StatusIcon status="Assigned" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Udah Ditugasin</span>
            <strong>{taskStatusCounts.Assigned}</strong>
            <small>Tinggal diterima</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-cyan status-kpi-card status-kpi-confirmed">
          <div className="super-kpi-icon">
            <StatusIcon status="Confirmed" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Udah Diterima</span>
            <strong>{taskStatusCounts.Confirmed}</strong>
            <small>Tinggal siap jalan</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-blue status-kpi-card status-kpi-ready">
          <div className="super-kpi-icon">
            <StatusIcon status="Ready" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Siap Jalan</span>
            <strong>{taskStatusCounts.Ready}</strong>
            <small>Tinggal berangkat</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-green status-kpi-card status-kpi-driving">
          <div className="super-kpi-icon">
            <StatusIcon status="Driving" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Lagi Jalan</span>
            <strong>{taskStatusCounts.Driving}</strong>
            <small>Lagi di jalan</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-purple status-kpi-card status-kpi-completed">
          <div className="super-kpi-icon">
            <StatusIcon status="Completed" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Udah Selesai</span>
            <strong>{taskStatusCounts.Completed}</strong>
            <small>Udah beres</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-red status-kpi-card status-kpi-canceled">
          <div className="super-kpi-icon">
            <StatusIcon status="Canceled" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Dibatalin</span>
            <strong>{taskStatusCounts.Canceled}</strong>
            <small>Nggak lanjut</small>
          </div>
        </div>
      </section>

      <section className="super-dashboard-main-grid">
        <div className="super-panel super-chart-panel">
          <div className="super-panel-heading">
            <div>
              <h2>Aktivitas Tugas</h2>
              <p>
                Lihat aktivitas penugasan yang dibuat berdasarkan periode yang
                dipilih.
              </p>
            </div>
            <div className="super-chart-legend">
              <span>
                <i className="legend-assigned" /> Udah Ditugasin
              </span>
              <span>
                <i className="legend-confirmed" /> Udah Diterima
              </span>
              <span>
                <i className="legend-ready" /> Siap Jalan
              </span>
              <span>
                <i className="legend-driving" /> Lagi Jalan
              </span>
              <span>
                <i className="legend-completed" /> Udah Selesai
              </span>
              <span>
                <i className="legend-canceled" /> Dibatalin
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
                    {item.assigned > 0 ? (
                      <span
                        className="bar-assigned"
                        style={{
                          height: String((item.assigned / maxHour) * 100) + "%",
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
                    {item.ready > 0 ? (
                      <span
                        className="bar-ready"
                        style={{
                          height: String((item.ready / maxHour) * 100) + "%",
                        }}
                      />
                    ) : null}
                    {item.driving > 0 ? (
                      <span
                        className="bar-driving"
                        style={{
                          height: String((item.driving / maxHour) * 100) + "%",
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
              <h2>Aktivitas Sistem</h2>
              <p>Aktivitas terbaru di sistem.</p>
            </div>
          </div>
          <div className="super-activity-list">
            <div>
              <span className="activity-dot blue" />
              <span>{tasks.length} penugasan terbaru</span>
              <time>{shortTime(now.toISOString())}</time>
            </div>
            <div>
              <span className="activity-dot purple" />
              <span>{completedTasks} tugas selesai dalam periode</span>
              <time>{shortTime(now.toISOString())}</time>
            </div>
            <div>
              <span className="activity-dot orange" />
              <span>{activeTasks} tugas sedang berjalan</span>
              <time>{shortTime(now.toISOString())}</time>
            </div>
          </div>
        </div>
      </section>

      <section className="super-dashboard-table-grid controller-detail-tables controller-single-detail-table">
        <div className="super-panel super-table-panel">
          <div className="super-panel-heading">
            <div>
              <h2>Penugasan Terbaru</h2>
              <p>Biar nggak perlu buka-buka lagi, detail singkatnya ada di sini.</p>
            </div>
          </div>
          <div className="super-table-wrap">
            <table className="controller-detail-table">
              <thead>
                <tr>
                  <th>Penugasan</th>
                  <th>Rute</th>
                  <th>Pengemudi</th>
                  <th>Armada</th>
                  <th>Jadwal</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.transaction_id}>
                    <td>
                      <strong>{task.transaction_id}</strong>
                      <small>{task.task_type}</small>
                    </td>
                    <td>
                      <strong>
                        {task.start_point ?? "-"} → {task.destination ?? "-"}
                      </strong>
                    </td>
                    <td>{task.executor_snapshot?.full_name ?? "-"}</td>
                    <td>{task.fleet_snapshot?.plat_number ?? "-"}</td>
                    <td>
                      <strong>{timeLabel(task.std)}</strong>
                      <small>STA {timeLabel(task.sta)}</small>
                    </td>
                    <td>
                      <StatusBadge
                        status={displayTaskStatus(task)}
                        label={statusLabel(displayTaskStatus(task))}
                      />
                    </td>
                  </tr>
                ))}
                {!tasks.length ? (
                  <tr>
                    <td colSpan={6} className="super-empty-cell">
                      Belum ada penugasan di sini.
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
