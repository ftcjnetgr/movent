import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";
import StatusBadge from "@/components/shared/status-badge";
import { compareStatus, STATUS_LABELS, STATUS_SUBCOPY, StatusIcon } from "@/components/shared/status-config";
import DashboardPreviewButton, { type DashboardPreviewItem } from "@/components/controller/dashboard-preview";

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

  const todayParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(now);
  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  const todayDay =
    weekdayMap[todayParts.find((part) => part.type === "weekday")?.value ?? ""] ??
    1;
  const todayMonth = Number(
    todayParts.find((part) => part.type === "month")?.value ?? 1,
  );
  const todayDate = Number(
    todayParts.find((part) => part.type === "day")?.value ?? 1,
  );
  const todayYear = Number(
    todayParts.find((part) => part.type === "year")?.value ?? now.getFullYear(),
  );

  const twinDateStart = Date.UTC(todayYear, todayMonth - 1, todayMonth);
  const twinDateEnd = new Date(twinDateStart);
  twinDateEnd.setUTCDate(twinDateEnd.getUTCDate() + 2);
  const todayKey = Date.UTC(todayYear, todayMonth - 1, todayDate);
  const isTwinDateWindow =
    todayKey >= twinDateStart && todayKey <= twinDateEnd.getTime();
  const todayScheduleCategory = isTwinDateWindow ? "Campaign" : "Normal";

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
            "status, task_type, fleet_ownership, sj_number, odometer_start, odometer_end, accepted_at, driving_at, arrived_at, std, sta, created_at, assigned_by, executor_nik, schedule_id, start_point, destination, executor_snapshot, fleet_snapshot",
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

  const departurePerformance = percentage(
    departureMetrics.onTime,
    departureMetrics.total,
  );
  const arrivalPerformance = percentage(
    arrivalMetrics.onTime,
    arrivalMetrics.total,
  );
  const [{ count: totalMaintenance }, { data: todaySchedules }] =
    await Promise.all([
      admin
        .from("ticketings")
        .select("transaction_id", { count: "exact", head: true })
        .gte("created_at", rangeStart)
        .lt("created_at", rangeEnd),
      admin
        .from("schedules")
        .select("schedule_id, start_point, destination, std, sta")
        .eq("status", "Active")
        .eq("schedule_day", todayDay)
        .eq("category", todayScheduleCategory),
    ]);

  const todayScheduleIds = (todaySchedules ?? []).map(
    (schedule) => schedule.schedule_id,
  );

  const { data: todayScheduleTasks } = todayScheduleIds.length
    ? await admin
        .from("tasks")
        .select("schedule_id, status, accepted_at, created_at, start_point, destination, driving_at, arrived_at, odometer_start, odometer_end, executor_snapshot, fleet_snapshot")
        .in("schedule_id", todayScheduleIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const latestTaskBySchedule = new Map<
    string,
    {
      status: string;
      accepted_at: string | null;
      created_at: string;
      start_point: string | null;
      destination: string | null;
      driving_at: string | null;
      arrived_at: string | null;
      odometer_start: number | null;
      odometer_end: number | null;
      executor_snapshot: Record<string, any> | null;
      fleet_snapshot: Record<string, any> | null;
    }
  >();

  for (const task of todayScheduleTasks ?? []) {
    if (!task.schedule_id || latestTaskBySchedule.has(task.schedule_id)) continue;
    latestTaskBySchedule.set(task.schedule_id, task);
  }

  const totalSchedulesToday = todayScheduleIds.length;

  const taskStatusCounts = {
    Unassigned: todayScheduleIds.filter(
      (scheduleId) => !latestTaskBySchedule.has(scheduleId),
    ).length,
    Assigned: 0,
    Confirmed: 0,
    Driving: 0,
    Completed: 0,
    Canceled: 0,
  };

  for (const task of latestTaskBySchedule.values()) {
    const status = displayTaskStatus(task);
    if (status in taskStatusCounts) {
      taskStatusCounts[status as keyof typeof taskStatusCounts] += 1;
    } else {
      taskStatusCounts.Unassigned += 1;
    }
  }


  function buildPreviewItem(
    schedule: {
      schedule_id: string;
      start_point?: string | null;
      destination?: string | null;
      std?: string | null;
      sta?: string | null;
    },
    task?: {
      status?: string | null;
      accepted_at?: string | null;
      start_point?: string | null;
      destination?: string | null;
      driving_at?: string | null;
      arrived_at?: string | null;
      std?: string | null;
      sta?: string | null;
      odometer_start?: number | null;
      odometer_end?: number | null;
      executor_snapshot?: Record<string, any> | null;
      fleet_snapshot?: Record<string, any> | null;
    },
    fallbackStatus = "Unassigned",
  ): DashboardPreviewItem {
    const atd = task?.driving_at ?? null;
    const ata = task?.arrived_at ?? null;
    const startOdo = task?.odometer_start;
    const endOdo = task?.odometer_end;
    const distance =
      typeof startOdo === "number" &&
      typeof endOdo === "number" &&
      endOdo >= startOdo
        ? endOdo - startOdo
        : null;
    const drivingDurationMs =
      atd && ata
        ? Math.max(0, new Date(ata).getTime() - new Date(atd).getTime())
        : null;

    return {
      scheduleId: schedule.schedule_id,
      status: task?.status
        ? displayTaskStatus({
            status: task.status,
            accepted_at: task.accepted_at ?? null,
          })
        : fallbackStatus,
      startPoint: task?.start_point ?? schedule.start_point ?? null,
      destination: task?.destination ?? schedule.destination ?? null,
      executor:
        task?.executor_snapshot?.full_name ??
        task?.executor_snapshot?.executor_nik ??
        task?.executor_snapshot?.username ??
        null,
      fleet:
        task?.fleet_snapshot?.plat_number ??
        task?.fleet_snapshot?.plate_number ??
        null,
      fleetType:
        task?.fleet_snapshot?.fleet_type ??
        task?.fleet_snapshot?.type ??
        task?.fleet_snapshot?.vehicle_type ??
        null,
      fleetStatus:
        task?.fleet_snapshot?.fleet_status ??
        task?.fleet_snapshot?.status ??
        null,
      atd,
      ata,
      std: schedule.std ?? null,
      sta: schedule.sta ?? null,
      distance,
      drivingDurationMs,
    };
  }

  const scheduleRows = (todaySchedules ?? []).map((schedule) => ({
    schedule_id: schedule.schedule_id,
    start_point: schedule.start_point,
    destination: schedule.destination,
    std: schedule.std,
    sta: schedule.sta,
  }));

  const schedulePreviewItems = scheduleRows.map((schedule) =>
    buildPreviewItem(schedule, latestTaskBySchedule.get(schedule.schedule_id)),
  );

  const statusPreviewItems = {
    Unassigned: schedulePreviewItems.filter((item) => item.status === "Unassigned"),
    Assigned: schedulePreviewItems.filter((item) => item.status === "Assigned"),
    Confirmed: schedulePreviewItems.filter((item) => item.status === "Confirmed"),
    Driving: schedulePreviewItems.filter((item) => item.status === "Driving"),
    Completed: schedulePreviewItems.filter((item) => item.status === "Completed"),
    Canceled: schedulePreviewItems.filter((item) => item.status === "Canceled"),
  };

  const performancePreviewItems = activities.map((task) =>
    buildPreviewItem(
      {
        schedule_id: task.schedule_id ?? "-",
        start_point: task.start_point,
        destination: task.destination,
      },
      task,
      task.status ?? "-",
    ),
  );

  const departureOnTimePreview = performancePreviewItems.filter((item, index) => {
    const task = activities[index];
    return (
      !!task.std &&
      !!task.driving_at &&
      new Date(task.driving_at).getTime() <= new Date(task.std).getTime()
    );
  });
  const departureLatePreview = performancePreviewItems.filter((item, index) => {
    const task = activities[index];
    return (
      !!task.std &&
      !!task.driving_at &&
      new Date(task.driving_at).getTime() > new Date(task.std).getTime()
    );
  });
  const arrivalOnTimePreview = performancePreviewItems.filter((item, index) => {
    const task = activities[index];
    return (
      !!task.sta &&
      !!task.arrived_at &&
      new Date(task.arrived_at).getTime() <= new Date(task.sta).getTime()
    );
  });
  const arrivalLatePreview = performancePreviewItems.filter((item, index) => {
    const task = activities[index];
    return (
      !!task.sta &&
      !!task.arrived_at &&
      new Date(task.arrived_at).getTime() > new Date(task.sta).getTime()
    );
  });

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

    const unassigned = (todaySchedules ?? []).filter((schedule) => {
      if (latestTaskBySchedule.has(schedule.schedule_id)) return false;
      if (!schedule.std) return false;
      return (
        new Date(schedule.std)
          .toLocaleString("en-US", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            hour12: false,
          })
          .slice(0, 2) === String(hour).padStart(2, "0")
      );
    }).length;

    return {
      hour,
      unassigned,
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
        item.unassigned +
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
        <DashboardPreviewButton
          title="Pratinjau Schedule Hari Ini"
          items={schedulePreviewItems}
          className="super-kpi-card kpi-purple status-kpi-card status-kpi-total-tasks"
          iconStatus="Requested"
          label="Schedule Hari Ini"
          value={totalSchedulesToday ?? 0}
          subtitle={`Category ${todayScheduleCategory}`}
          timeMode="planned"
          compactSchedulePreview
        />
        <DashboardPreviewButton
          title="Pratinjau Schedule — Belum Ditugasin"
          items={statusPreviewItems.Unassigned}
          className="super-kpi-card kpi-gray status-kpi-card status-kpi-unassigned"
          iconStatus="Unassigned"
          label="Belum Ditugasin"
          value={taskStatusCounts.Unassigned}
          subtitle={`${percentage(taskStatusCounts.Unassigned, totalSchedulesToday)}% dari total`}
          timeMode="planned"
          compactSchedulePreview
          displayStatus="Belum Ditugasin"
        />
        <DashboardPreviewButton
          title="Pratinjau Schedule — Udah Ditugasin"
          items={statusPreviewItems.Assigned}
          className="super-kpi-card kpi-blue status-kpi-card status-kpi-assigned kpi-yellow"
          iconStatus="Assigned"
          label="Udah Ditugasin"
          value={taskStatusCounts.Assigned}
          subtitle={`${percentage(taskStatusCounts.Assigned, totalSchedulesToday)}% dari total`}
          timeMode="planned"
          displayStatus="Udah Ditugasin"
        />
        <DashboardPreviewButton
          title="Pratinjau Schedule — Udah Diterima"
          items={statusPreviewItems.Confirmed}
          className="super-kpi-card kpi-cyan status-kpi-card status-kpi-confirmed kpi-orange"
          iconStatus="Confirmed"
          label="Udah Diterima"
          value={taskStatusCounts.Confirmed}
          subtitle={`${percentage(taskStatusCounts.Confirmed, totalSchedulesToday)}% dari total`}
          displayStatus="Udah Diterima"
        />
        <DashboardPreviewButton
          title="Pratinjau Schedule — Lagi Jalan"
          items={statusPreviewItems.Driving}
          className="super-kpi-card kpi-orange status-kpi-card status-kpi-driving kpi-blue"
          iconStatus="Driving"
          label="Lagi Jalan"
          value={taskStatusCounts.Driving}
          subtitle={`${percentage(taskStatusCounts.Driving, totalSchedulesToday)}% dari total`}
          displayStatus="Lagi Jalan"
        />
        <DashboardPreviewButton
          title="Pratinjau Schedule — Udah Selesai"
          items={statusPreviewItems.Completed}
          className="super-kpi-card kpi-purple status-kpi-card status-kpi-completed kpi-green"
          iconStatus="Completed"
          label="Udah Selesai"
          value={taskStatusCounts.Completed}
          subtitle={`${percentage(taskStatusCounts.Completed, totalSchedulesToday)}% dari total`}
          displayStatus="Udah Selesai"
        />
        <DashboardPreviewButton
          title="Pratinjau Schedule — Dibatalin"
          items={statusPreviewItems.Canceled}
          className="super-kpi-card kpi-red status-kpi-card status-kpi-canceled"
          iconStatus="Canceled"
          label="Dibatalin"
          value={taskStatusCounts.Canceled}
          subtitle={`${percentage(taskStatusCounts.Canceled, totalSchedulesToday)}% dari total`}
          timeMode="planned"
          displayStatus="Dibatalin"
        />
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
                <i className="legend-unassigned" /> Belum Ditugasin
              </span>
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
                    <strong
                      className="super-chart-value-label"
                      style={{
                        bottom:
                          String(
                            ((item.unassigned +
                              item.assigned +
                              item.confirmed +
                              item.driving +
                              item.completed +
                              item.canceled) /
                              maxHour) *
                              100,
                          ) + "%",
                      }}
                    >
                      {new Intl.NumberFormat("id-ID").format(
                        item.unassigned +
                          item.assigned +
                          item.confirmed +
                          item.driving +
                          item.completed +
                          item.canceled,
                      )}
                    </strong>
                    {item.unassigned > 0 ? (
                      <span
                        className="bar-unassigned"
                        style={{
                          height: String((item.unassigned / maxHour) * 100) + "%",
                        }}
                      />
                    ) : null}
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
              <p>Lihat ketepatan berangkat dan sampai dari semua tugas di periode ini.</p>
            </div>
          </div>
          <div className="super-activity-list">
            <DashboardPreviewButton
              title="Pratinjau — Tugas yang berangkatnya tepat waktu"
              items={departureOnTimePreview}
              variant="activity"
              dotClass="green"
              label="tugas yang berangkatnya tepat waktu"
              value={departureMetrics.onTime}
              subtitle={`${departurePerformance}%`}
            />
            <DashboardPreviewButton
              title="Pratinjau — Tugas yang berangkatnya telat"
              items={departureLatePreview}
              variant="activity"
              dotClass="red"
              label="tugas yang berangkatnya telat"
              value={departureMetrics.late}
              subtitle={`${percentage(departureMetrics.late, departureMetrics.total)}%`}
            />
            <DashboardPreviewButton
              title="Pratinjau — Tugas yang sampainya tepat waktu"
              items={arrivalOnTimePreview}
              variant="activity"
              dotClass="green"
              label="tugas yang sampainya tepat waktu"
              value={arrivalMetrics.onTime}
              subtitle={`${arrivalPerformance}%`}
            />
            <DashboardPreviewButton
              title="Pratinjau — Tugas yang sampainya telat"
              items={arrivalLatePreview}
              variant="activity"
              dotClass="red"
              label="tugas yang sampainya telat"
              value={arrivalMetrics.late}
              subtitle={`${percentage(arrivalMetrics.late, arrivalMetrics.total)}%`}
            />
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
