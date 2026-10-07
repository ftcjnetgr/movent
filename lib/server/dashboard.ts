import { createAdminClient } from "@/lib/supabase/admin";
import type { AppProfile } from "@/lib/server/profile";

type TaskRow = {
  transaction_id: string;
  created_at: string;
  status: string;
  source_type: string;
  task_type: string;
  created_by: string;
  fleet_ownership: string | null;
  schedule_id: string | null;
  std: string | null;
  sta: string | null;
  start_point: string | null;
  destination: string | null;
  assigned_at: string | null;
  accepted_at: string | null;
  driving_at: string | null;
  completed_at: string | null;
  external_departure_at: string | null;
  external_arrival_at: string | null;
  canceled_at: string | null;
  executor_snapshot: { full_name?: string; executor_nik?: string } | null;
  fleet_snapshot: { plat_number?: string; fleet_type?: string } | null;
};

type TicketRow = {
  transaction_id: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  in_progress_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
  location: string | null;
  maintenance_list: string | null;
};

type TaskDurationRow = {
  transactionId: string;
  taskType: string;
  fleetOwnership: string | null;
  status: string;
  assignedAccepted: number | null;
  acceptedDriving: number | null;
  drivingCompleted: number | null;
  assignedDriving: number | null;
  totalCompleted: number | null;
  canceledFromPrevious: number | null;
  canceledCycle: number | null;
};

type TicketDurationRow = {
  transactionId: string;
  status: string;
  createdAccepted: number | null;
  acceptedInProgress: number | null;
  inProgressCompleted: number | null;
  totalCompleted: number | null;
  canceledFromCreated: number | null;
  canceledCycle: number | null;
};

type TaskAlert = {
  kind: "unassigned" | "assigned";
  trigger: "std" | "sta";
  scheduleId: string;
  transactionId?: string;
  status?: string;
  startPoint: string | null;
  destination: string | null;
  std: string | null;
  sta: string | null;
  targetAt: Date;
  driverName: string | null;
  fleetPlat: string | null;
  scheduleHubId: string | null;
};

function jakartaDate(value: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(value);
}

function scheduleTimestamp(date: string, time: string) {
  return new Date(date + "T" + time + "+07:00");
}

function minutesBetween(from: string | null, to: string | null) {
  if (!from || !to) return null;
  const value = (new Date(to).getTime() - new Date(from).getTime()) / 60000;
  return value >= 0 ? value : null;
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null);
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function canceledFromTimestamp(task: TaskRow) {
  if (task.task_type === "Supply" && task.fleet_ownership === "Non-TGR")
    return task.external_departure_at ?? task.assigned_at;
  return task.driving_at ?? task.accepted_at ?? task.assigned_at;
}

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: unknown;
  }>,
) {
  const pageSize = 1000;
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}


export async function getAlertCounts(profile: AppProfile) {
  const admin = createAdminClient();
  const now = new Date();
  const date = jakartaDate(now);
  const day = ((new Date(date + "T12:00:00+07:00").getUTCDay() + 6) % 7) + 1;
  const dayOfMonth = new Date(date + "T12:00:00+07:00").getUTCDate();
  const allowedCategory = dayOfMonth <= 3 ? "Campaign" : "Normal";

  const rangeStart = new Date(
    date + "T00:00:00+07:00",
  ).toISOString();
  const rangeEnd = new Date(
    new Date(date + "T00:00:00+07:00").getTime() + 86400000,
  ).toISOString();

  const [schedulesResult, tasks, ticketAlertsResult] = await Promise.all([
    admin
      .from("schedules")
      .select("schedule_id, schedule_hub_id, std, sta, start_point, destination")
      .eq("status", "Active")
      .eq("schedule_day", day)
      .eq("category", allowedCategory),
    fetchAllRows<TaskRow>((from, to) =>
      admin
        .from("tasks")
        .select(
          "transaction_id, created_at, status, source_type, task_type, created_by, fleet_ownership, schedule_id, start_point, destination, std, sta, assigned_at, accepted_at, driving_at, completed_at, external_departure_at, external_arrival_at, canceled_at, executor_snapshot, fleet_snapshot",
        )
        .gte("std", rangeStart)
        .lt("std", rangeEnd)
        .order("created_at", { ascending: false })
        .range(from, to),
    ),
    admin
      .from("ticketings")
      .select(
        "transaction_id, status, created_at, accepted_at, in_progress_at, location, maintenance_list",
      )
      .in("status", ["Requested", "Confirmed", "In Progress"])
      .order("created_at", { ascending: false }),
  ]);

  if (schedulesResult.error) throw schedulesResult.error;
  if (ticketAlertsResult.error) throw ticketAlertsResult.error;
  const alertSchedules = schedulesResult.data ?? [];
  const ticketAlerts = ticketAlertsResult.data ?? [];
  const scopedTasks =
    profile.role === "Dispatcher"
      ? tasks.filter(
          (task) =>
            task.created_by === profile.id ||
            task.fleet_ownership === "Non-TGR",
        )
      : tasks;

  const latestTaskByScheduleId = new Map<string, TaskRow>();
  for (const task of scopedTasks) {
    if (!task.schedule_id || latestTaskByScheduleId.has(task.schedule_id)) continue;
    latestTaskByScheduleId.set(task.schedule_id, task);
  }

  let taskCount = 0;

  for (const schedule of alertSchedules) {
    const task = latestTaskByScheduleId.get(schedule.schedule_id);
    const status = task?.status ?? "Unassigned";
    if (
      status !== "Unassigned" &&
      !["Assigned", "Confirmed", "Driving"].includes(status)
    ) {
      continue;
    }

    const targetAt =
      status === "Driving"
        ? new Date(date + "T" + schedule.sta + "+07:00")
        : new Date(date + "T" + schedule.std + "+07:00");
    const lead = status === "Driving" ? 10 * 60 * 1000 : 30 * 60 * 1000;

    if (now.getTime() >= targetAt.getTime() - lead) {
      taskCount += 1;
    }
  }

  const ticketCount = ticketAlerts.filter((ticket) => {
    const base =
      ticket.status === "Confirmed"
        ? ticket.accepted_at ?? ticket.created_at
        : ticket.status === "In Progress"
          ? ticket.in_progress_at ?? ticket.created_at
          : ticket.created_at;
    const elapsed = now.getTime() - new Date(base).getTime();
    if (ticket.status === "Requested") return elapsed >= 60 * 60 * 1000;
    return elapsed >= 24 * 60 * 60 * 1000;
  }).length;

  return {
    task: taskCount,
    maintenance: ticketCount,
  };
}

export async function getDashboardData(
  profile: AppProfile,
  dateFrom?: string,
  dateTo?: string,
) {
  const admin = createAdminClient();
  const [allTasks, schedules, ticketings] = await Promise.all([
    fetchAllRows<TaskRow>((from, to) =>
      admin
        .from("tasks")
        .select(
          "transaction_id, created_at, status, source_type, task_type, created_by, fleet_ownership, schedule_id, start_point, destination, std, sta, assigned_at, accepted_at, driving_at, completed_at, external_departure_at, external_arrival_at, canceled_at, executor_snapshot, fleet_snapshot",
        )
        .order("created_at", { ascending: false })
        .range(from, to),
    ),
    fetchAllRows<{
      schedule_id: string;
      schedule_day: number;
      category: string;
      schedule_hub_id: string | null;
      start_point: string | null;
      destination: string | null;
      std: string;
      sta: string;
      status: string;
    }>((from, to) =>
      admin
        .from("schedules")
        .select(
          "schedule_id, schedule_day, category, schedule_hub_id, start_point, destination, std, sta, status",
        )
        .eq("status", "Active")
        .range(from, to),
    ),
    fetchAllRows<TicketRow>((from, to) =>
      admin
        .from("ticketings")
        .select(
          "transaction_id, status, created_at, accepted_at, in_progress_at, completed_at, canceled_at, location, maintenance_list",
        )
        .order("created_at", { ascending: false })
        .range(from, to),
    ),
  ]);

  const all = (allTasks ?? []) as TaskRow[];
  const scopedTasks =
    profile.role === "Dispatcher"
      ? all.filter(
          (task) =>
            task.created_by === profile.id ||
            task.fleet_ownership === "Non-TGR",
        )
      : all;

  const date = jakartaDate(new Date());
  const rangeFrom = dateFrom ?? date;
  const rangeTo = dateTo ?? rangeFrom;
  const rangeStart = new Date(`${rangeFrom}T00:00:00+07:00`).getTime();
  const rangeEndExclusive =
    new Date(`${rangeTo}T00:00:00+07:00`).getTime() + 86400000;
  const inRange = (value: string | null) => {
    if (!value) return false;
    const time = new Date(value).getTime();
    return time >= rangeStart && time < rangeEndExclusive;
  };
  const tasks = scopedTasks.filter((task) => inRange(task.created_at));
  const day = ((new Date(date + "T12:00:00+07:00").getUTCDay() + 6) % 7) + 1;
  const now = new Date();

  // Keep alert schedule filtering identical to the Dispatcher assignment picker:
  // current schedule day + Normal/Campaign category for the current Twindate window.
  const calendarParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const calendarYear = Number(
    calendarParts.find((item) => item.type === "year")?.value ?? 0,
  );
  const calendarMonth = Number(
    calendarParts.find((item) => item.type === "month")?.value ?? 0,
  );
  const calendarDay = Number(
    calendarParts.find((item) => item.type === "day")?.value ?? 0,
  );
  const todayKey = Date.UTC(
    calendarYear,
    calendarMonth - 1,
    calendarDay,
  );
  const twindateStartKey = Date.UTC(
    calendarYear,
    calendarMonth - 1,
    1,
  );
  const twindateEnd = new Date(twindateStartKey);
  twindateEnd.setUTCDate(twindateEnd.getUTCDate() + 2);
  const isTwindateWindow =
    todayKey >= twindateStartKey &&
    todayKey <= twindateEnd.getTime();
  const allowedCategory = isTwindateWindow ? "Campaign" : "Normal";

  const alertSchedules = (schedules ?? []).filter(
    (schedule) =>
      schedule.schedule_day === day &&
      schedule.category === allowedCategory,
  );

  const scheduleHubById = new Map(
    (schedules ?? []).map((schedule) => [
      schedule.schedule_id,
      schedule.schedule_hub_id as string | null,
    ]),
  );

  // Resolve today's latest task per schedule so historical transactions do not
  // suppress today's unassigned schedule alerts. Canceled tasks still reserve the
  // schedule for today, so they do not fall through as "unassigned".
  const todaysScheduleTasks = scopedTasks.filter(
    (task) =>
      Boolean(task.schedule_id) &&
      Boolean(task.std) &&
      jakartaDate(new Date(task.std as string)) === date,
  );
  const latestTaskByScheduleId = new Map<string, TaskRow>();
  for (const task of todaysScheduleTasks) {
    if (!latestTaskByScheduleId.has(task.schedule_id as string)) {
      latestTaskByScheduleId.set(task.schedule_id as string, task);
    }
  }

  const unassignedAlerts: TaskAlert[] = alertSchedules
    .filter((schedule) => !latestTaskByScheduleId.has(schedule.schedule_id))
    .map((schedule) => ({
      kind: "unassigned" as const,
      trigger: "std" as const,
      scheduleId: schedule.schedule_id,
      startPoint: schedule.start_point,
      destination: schedule.destination,
      std: schedule.std,
      sta: schedule.sta,
      targetAt: scheduleTimestamp(date, schedule.std),
      status: "Unassigned",
      driverName: null,
      fleetPlat: null,
      scheduleHubId: schedule.schedule_hub_id as string | null,
    }))
    .filter(
      (alert) =>
        now.getTime() >= alert.targetAt.getTime() - 30 * 60 * 1000,
    );

  const assignedAlerts: TaskAlert[] = [...latestTaskByScheduleId.values()]
    .filter(
      (task) =>
        task.schedule_id &&
        ["Assigned", "Confirmed", "Driving"].includes(task.status) &&
        alertSchedules.some(
          (schedule) => schedule.schedule_id === task.schedule_id,
        ) &&
        ((task.status === "Driving" && task.sta) ||
          (["Assigned", "Confirmed"].includes(task.status) && task.std)),
    )
    .map((task) => {
      const trigger: TaskAlert["trigger"] =
        task.status === "Driving" ? "sta" : "std";
      const targetAt =
        trigger === "sta"
          ? new Date(task.sta as string)
          : new Date(task.std as string);
      return {
        kind: "assigned" as const,
        trigger,
        transactionId: task.transaction_id,
        scheduleId: task.schedule_id as string,
        startPoint: task.start_point,
        destination: task.destination,
        std: task.std,
        sta: task.sta,
        targetAt,
        status: task.status,
        driverName: task.executor_snapshot?.full_name ?? null,
        fleetPlat: task.fleet_snapshot?.plat_number ?? null,
        scheduleHubId:
          scheduleHubById.get(task.schedule_id as string) ?? null,
      };
    })
    .filter((alert) => {
      const threshold =
        alert.trigger === "std" ? 30 * 60 * 1000 : 10 * 60 * 1000;
      return now.getTime() >= alert.targetAt.getTime() - threshold;
    });

  const taskAlerts = [...unassignedAlerts, ...assignedAlerts];
  const taskAlertHubs = [
    ...new Set(
      taskAlerts
        .map((alert) => alert.scheduleHubId)
        .filter((hub): hub is string => Boolean(hub)),
    ),
  ];
  const allTicketRows = (ticketings ?? []) as TicketRow[];
  const ticketRows = allTicketRows.filter((ticket) =>
    inRange(ticket.created_at),
  );

  // Alerts are operational and must stay independent from the Dashboard date filter.
  const ticketAlerts = allTicketRows.filter((ticket) =>
    ["Requested", "Confirmed", "In Progress"].includes(ticket.status),
  );
  const ticketAlertCount = ticketAlerts.filter((ticket) => {
    const elapsed =
      now.getTime() -
      new Date(
        ticket.status === "Confirmed"
          ? (ticket.accepted_at ?? ticket.created_at)
          : ticket.status === "In Progress"
            ? (ticket.in_progress_at ?? ticket.created_at)
            : ticket.created_at,
      ).getTime();
    if (ticket.status === "Requested") return elapsed >= 1 * 60 * 60 * 1000;
    if (ticket.status === "Confirmed") return elapsed >= 24 * 60 * 60 * 1000;
    if (ticket.status === "In Progress")
      return elapsed >= 1 * 24 * 60 * 60 * 1000;
    return false;
  }).length;

  const taskDurations: TaskDurationRow[] = tasks.map((task) => ({
    transactionId: task.transaction_id,
    taskType: task.task_type,
    fleetOwnership: task.fleet_ownership,
    status: task.status,
    assignedAccepted:
      task.task_type === "Supply" && task.fleet_ownership === "Non-TGR"
        ? null
        : minutesBetween(task.assigned_at, task.accepted_at),
    acceptedDriving:
      task.task_type === "Supply" && task.fleet_ownership === "Non-TGR"
        ? null
        : minutesBetween(task.accepted_at, task.driving_at),
    drivingCompleted:
      task.task_type === "Supply" && task.fleet_ownership === "Non-TGR"
        ? minutesBetween(task.external_departure_at, task.external_arrival_at)
        : minutesBetween(task.driving_at, task.completed_at),
    assignedDriving:
      task.task_type === "Supply" && task.fleet_ownership === "Non-TGR"
        ? minutesBetween(task.assigned_at, task.external_departure_at)
        : null,
    totalCompleted:
      task.task_type === "Supply" && task.fleet_ownership === "Non-TGR"
        ? minutesBetween(task.assigned_at, task.external_arrival_at)
        : minutesBetween(task.assigned_at, task.completed_at),
    canceledFromPrevious:
      task.status === "Canceled"
        ? minutesBetween(canceledFromTimestamp(task), task.canceled_at)
        : null,
    canceledCycle:
      task.status === "Canceled"
        ? minutesBetween(task.assigned_at, task.canceled_at)
        : null,
  }));

  const ticketDurations: TicketDurationRow[] = ticketRows.map((ticket) => ({
    transactionId: ticket.transaction_id,
    status: ticket.status,
    createdAccepted: minutesBetween(ticket.created_at, ticket.accepted_at),
    acceptedInProgress: minutesBetween(
      ticket.accepted_at,
      ticket.in_progress_at,
    ),
    inProgressCompleted: minutesBetween(
      ticket.in_progress_at,
      ticket.completed_at,
    ),
    totalCompleted: minutesBetween(ticket.created_at, ticket.completed_at),
    canceledFromCreated:
      ticket.status === "Canceled"
        ? minutesBetween(ticket.created_at, ticket.canceled_at)
        : null,
    canceledCycle:
      ticket.status === "Canceled"
        ? minutesBetween(ticket.created_at, ticket.canceled_at)
        : null,
  }));

  return {
    taskDurations,
    ticketDurations,
    taskCounts: {
      Requested: tasks.filter((task) => task.status === "Requested").length,
      Assigned: tasks.filter((task) => task.status === "Assigned").length,
      Confirmed: tasks.filter((task) => task.status === "Confirmed").length,
      Driving: tasks.filter((task) => task.status === "Driving").length,
      Completed: tasks.filter((task) => task.status === "Completed").length,
    },
    ticketCounts: {
      Requested: ticketRows.filter((ticket) => ticket.status === "Requested")
        .length,
      Confirmed: ticketRows.filter((ticket) => ticket.status === "Confirmed")
        .length,
      "In Progress": ticketRows.filter(
        (ticket) => ticket.status === "In Progress",
      ).length,
      Completed: ticketRows.filter((ticket) => ticket.status === "Completed")
        .length,
      Canceled: ticketRows.filter((ticket) => ticket.status === "Canceled")
        .length,
    },
    taskAlerts,
    taskAlertHubs,
    ticketAlerts,
    ticketAlertCount,
    averages: {
      assignedAccepted: average(
        tasks.map((task) => minutesBetween(task.assigned_at, task.accepted_at)),
      ),
      acceptedDriving: average(
        tasks.map((task) => minutesBetween(task.accepted_at, task.driving_at)),
      ),
      drivingCompleted: average(
        tasks.map((task) => minutesBetween(task.driving_at, task.completed_at)),
      ),
      completedCycle: average(
        tasks
          .filter((task) => task.status === "Completed")
          .map((task) =>
            task.task_type === "Supply" && task.fleet_ownership === "Non-TGR"
              ? minutesBetween(task.assigned_at, task.external_arrival_at)
              : minutesBetween(task.assigned_at, task.completed_at),
          ),
      ),
      canceledCycle: average(
        tasks
          .filter((task) => task.status === "Canceled")
          .map((task) =>
            minutesBetween(
              task.assigned_at ?? task.accepted_at ?? task.driving_at,
              task.canceled_at,
            ),
          ),
      ),
    },
    taskAveragesNonTgr: {
      assignedDriving: average(
        tasks
          .filter(
            (task) =>
              task.task_type === "Supply" && task.fleet_ownership === "Non-TGR",
          )
          .map((task) =>
            minutesBetween(task.assigned_at, task.external_departure_at),
          ),
      ),
      drivingCompleted: average(
        tasks
          .filter(
            (task) =>
              task.task_type === "Supply" && task.fleet_ownership === "Non-TGR",
          )
          .map((task) =>
            minutesBetween(
              task.external_departure_at,
              task.external_arrival_at,
            ),
          ),
      ),
      completedCycle: average(
        tasks
          .filter(
            (task) =>
              task.task_type === "Supply" &&
              task.fleet_ownership === "Non-TGR" &&
              task.status === "Completed",
          )
          .map((task) =>
            minutesBetween(task.assigned_at, task.external_arrival_at),
          ),
      ),
      canceledCycle: average(
        tasks
          .filter(
            (task) =>
              task.task_type === "Supply" &&
              task.fleet_ownership === "Non-TGR" &&
              task.status === "Canceled",
          )
          .map((task) => minutesBetween(task.assigned_at, task.canceled_at)),
      ),
    },
    ticketAverages: {
      createdAccepted: average(
        ticketRows.map((ticket) =>
          minutesBetween(ticket.created_at, ticket.accepted_at),
        ),
      ),
      acceptedInProgress: average(
        ticketRows.map((ticket) =>
          minutesBetween(ticket.accepted_at, ticket.in_progress_at),
        ),
      ),
      inProgressCompleted: average(
        ticketRows.map((ticket) =>
          minutesBetween(ticket.in_progress_at, ticket.completed_at),
        ),
      ),
      completedCycle: average(
        ticketRows
          .filter((ticket) => ticket.status === "Completed")
          .map((ticket) =>
            minutesBetween(ticket.created_at, ticket.completed_at),
          ),
      ),
      canceledCycle: average(
        ticketRows
          .filter((ticket) => ticket.status === "Canceled")
          .map((ticket) =>
            minutesBetween(ticket.created_at, ticket.canceled_at),
          ),
      ),
    },
  };
}
