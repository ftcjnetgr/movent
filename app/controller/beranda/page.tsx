import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";
import StatusBadge from "@/components/shared/status-badge";
import { compareStatus, STATUS_LABELS, STATUS_SUBCOPY, StatusIcon } from "@/components/shared/status-config";

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function displayTaskStatus(task: {
  status: string;
  accepted_at: string | null;
}) {
  if (task.status === "Confirmed" && !task.accepted_at) return "Assigned";
  return task.status;
}

function sortByStatusAndTime<T extends {
  status: string;
  accepted_at: string | null;
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
  await getCurrentProfile();
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

  const { data: dispatcherProfiles } = await admin
    .from("user_profiles")
    .select("id")
    .eq("role", "Dispatcher");

  const dispatcherIds = (dispatcherProfiles ?? []).map((item) => item.id);

  const [tasksResult, activityResult] = dispatcherIds.length
    ? await Promise.all([
        admin
          .from("tasks")
          .select(
            "id, transaction_id, task_type, status, fleet_ownership, start_point, destination, std, sta, executor_snapshot, fleet_snapshot, schedule_id, sj_number, odometer_start, accepted_at, created_at, assigned_by, executor_nik",
          )
          .in("assigned_by", dispatcherIds)
          .not("executor_nik", "is", null)
          .order("created_at", { ascending: false })
          .gte("created_at", rangeStart)
          .lt("created_at", rangeEnd)
          .limit(8),
        admin
          .from("tasks")
          .select(
            "status, task_type, fleet_ownership, sj_number, odometer_start, accepted_at, driving_at, arrived_at, std, sta, created_at, assigned_by, executor_nik",
          )
          .in("assigned_by", dispatcherIds)
          .not("executor_nik", "is", null)
          .gte("created_at", rangeStart)
          .lt("created_at", rangeEnd),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  const rawTasks = tasksResult.data ?? [];
  const activities = activityResult.data ?? [];
  const tasks = sortByStatusAndTime(rawTasks);

  const totalTasks = activities.length;

  const departureMetrics = activities.reduce(
    (acc, task) => {
      if (!task.std || !task.driving_at) return acc;

      acc.total += 1;
      if (new Date(task.driving_at).getTime() <= new Date(task.std).getTime()) {
        acc.onTime += 1;
      } else {
        acc.late += 1;
      }
      return acc;
    },
    { total: 0, onTime: 0, late: 0 },
  );

  const arrivalMetrics = activities.reduce(
    (acc, task) => {
      if (!task.sta || !task.arrived_at) return acc;

      acc.total += 1;
      if (new Date(task.arrived_at).getTime() <= new Date(task.sta).getTime()) {
        acc.onTime += 1;
      } else {
        acc.late += 1;
      }
      return acc;
    },
    { total: 0, onTime: 0, late: 0 },
  );

  const durationMetrics = activities.reduce(
    (acc, task) => {
      if (!task.driving_at || !task.arrived_at) return acc;

      const duration =
        new Date(task.arrived_at).getTime() -
        new Date(task.driving_at).getTime();

      if (duration < 0) return acc;

      acc.totalMs += duration;
      acc.count += 1;
      return acc;
    },
    { totalMs: 0, count: 0 },
  );

  const departurePerformance = percentage(
    departureMetrics.onTime,
    departureMetrics.total,
  );
  const arrivalPerformance = percentage(
    arrivalMetrics.onTime,
    arrivalMetrics.total,
  );
  const averageDurationMinutes =
    durationMetrics.count > 0
      ? Math.round(durationMetrics.totalMs / durationMetrics.count / 60000)
      : 0;

  function durationLabel(totalMinutes: number) {
    if (!totalMinutes) return "-";

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (!hours) return String(minutes) + "m";
    if (!minutes) return String(hours) + "j";
    return String(hours) + "j " + String(minutes) + "m";
  }

  const { count: totalMaintenance } = await admin
    .from("ticketings")
    .select("transaction_id", { count: "exact", head: true })
    .gte("created_at", rangeStart)
    .lt("created_at", rangeEnd);
  const totalAllActivities = totalTasks + (totalMaintenance ?? 0);

  const taskStatusCounts = {
    Assigned: activities.filter((task) => displayTaskStatus(task) === "Assigned")
      .length,
    Confirmed: activities.filter((task) => displayTaskStatus(task) === "Confirmed")
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
            Biar gampang dipantau, semua penugasan di periode ini ada di sini.
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
            Perbaikan
          </Link>
        </nav>
      </div>

      <section className="super-kpi-grid assignment-kpi-grid">
        <div className="super-kpi-card kpi-purple status-kpi-card status-kpi-total-tasks">
          <div className="super-kpi-icon">
            <StatusIcon status="" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Semua Penugasan</span>
            <strong>{totalTasks}</strong>
            <small>Total penugasan</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-blue status-kpi-card status-kpi-assigned">
          <div className="super-kpi-icon">
            <StatusIcon status="Assigned" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Udah Ditugasin</span>
            <strong>{taskStatusCounts.Assigned}</strong>
            <small>{percentage(taskStatusCounts.Assigned, totalAllActivities)}% dari semua aktivitas</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-cyan status-kpi-card status-kpi-confirmed">
          <div className="super-kpi-icon">
            <StatusIcon status="Confirmed" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Udah Diterima</span>
            <strong>{taskStatusCounts.Confirmed}</strong>
            <small>{percentage(taskStatusCounts.Confirmed, totalAllActivities)}% dari semua aktivitas</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-orange status-kpi-card status-kpi-driving">
          <div className="super-kpi-icon">
            <StatusIcon status="Driving" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Lagi Jalan</span>
            <strong>{taskStatusCounts.Driving}</strong>
            <small>{percentage(taskStatusCounts.Driving, totalAllActivities)}% dari semua aktivitas</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-purple status-kpi-card status-kpi-completed">
          <div className="super-kpi-icon">
            <StatusIcon status="Completed" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Udah Selesai</span>
            <strong>{taskStatusCounts.Completed}</strong>
            <small>{percentage(taskStatusCounts.Completed, totalAllActivities)}% dari semua aktivitas</small>
          </div>
        </div>

        <div className="super-kpi-card kpi-red status-kpi-card status-kpi-canceled">
          <div className="super-kpi-icon">
            <StatusIcon status="Canceled" size={20} />
          </div>
          <div className="super-kpi-content">
            <span>Dibatalin</span>
            <strong>{taskStatusCounts.Canceled}</strong>
            <small>{percentage(taskStatusCounts.Canceled, totalAllActivities)}% dari semua aktivitas</small>
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
              <h2>Ketepatan STD &amp; STA</h2>
              <p>Lihat berangkat, sampai, dan durasi dari semua tugas di periode ini.</p>
            </div>
          </div>
          <div className="super-activity-list">
            <div>
              <span className="activity-dot blue" />
              <span>Berangkatnya pas</span>
              <strong>{departureMetrics.onTime}</strong>
            </div>
            <div>
              <span className="activity-dot orange" />
              <span>Berangkatnya telat</span>
              <strong>{departureMetrics.late}</strong>
            </div>
            <div>
              <span className="activity-dot purple" />
              <span>Sampainya pas</span>
              <strong>{arrivalMetrics.onTime}</strong>
            </div>
            <div>
              <span className="activity-dot red" />
              <span>Sampainya telat</span>
              <strong>{arrivalMetrics.late}</strong>
            </div>
            <div>
              <span className="activity-dot blue" />
              <span>Yang berangkat pas</span>
              <strong>{departurePerformance}%</strong>
            </div>
            <div>
              <span className="activity-dot purple" />
              <span>Yang sampai pas</span>
              <strong>{arrivalPerformance}%</strong>
            </div>
            <div>
              <span className="activity-dot orange" />
              <span>Rata-rata perjalanan</span>
              <strong>{durationLabel(averageDurationMinutes)}</strong>
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
