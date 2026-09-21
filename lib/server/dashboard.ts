import { createAdminClient } from '@/lib/supabase/admin'
import type { AppProfile } from '@/lib/server/profile'

type TaskRow = {
  transaction_id: string
  status: string
  source_type: string
  task_type: string
  created_by: string
  fleet_ownership: string | null
  schedule_id: string | null
  std: string | null
  sta: string | null
  start_point: string | null
  destination: string | null
  assigned_at: string | null
  accepted_at: string | null
  driving_at: string | null
  completed_at: string | null
  canceled_at: string | null
}

type TicketRow = {
  transaction_id: string
  status: string
  created_at: string
  accepted_at: string | null
  in_progress_at: string | null
  completed_at: string | null
  canceled_at: string | null
}

type TaskDurationRow = {
  transactionId: string
  taskType: string
  fleetOwnership: string | null
  status: string
  assignedAccepted: number | null
  acceptedDriving: number | null
  drivingCompleted: number | null
  assignedDriving: number | null
  totalCompleted: number | null
  canceledFromPrevious: number | null
  canceledCycle: number | null
}

type TicketDurationRow = {
  transactionId: string
  status: string
  createdAccepted: number | null
  acceptedInProgress: number | null
  inProgressCompleted: number | null
  totalCompleted: number | null
  canceledFromCreated: number | null
  canceledCycle: number | null
}

type TaskAlert = {
  kind: 'unassigned' | 'assigned'
  scheduleId: string
  transactionId?: string
  status?: string
  startPoint: string | null
  destination: string | null
  std: string | null
  sta: string | null
  targetAt: Date
}

function jakartaDate(value: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(value)
}

function scheduleTimestamp(date: string, time: string) {
  return new Date(date + 'T' + time + '+07:00')
}

function minutesBetween(from: string | null, to: string | null) {
  if (!from || !to) return null
  const value = (new Date(to).getTime() - new Date(from).getTime()) / 60000
  return value >= 0 ? value : null
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null)
  if (!valid.length) return null
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function canceledFromTimestamp(task: TaskRow) {
  return task.driving_at ?? task.accepted_at ?? task.assigned_at
}

export async function getDashboardData(profile: AppProfile) {
  const admin = createAdminClient()
  const [{ data: allTasks }, { data: schedules }, { data: ticketings }] = await Promise.all([
    admin
      .from('tasks')
      .select('transaction_id, status, source_type, task_type, created_by, fleet_ownership, schedule_id, start_point, destination, std, sta, assigned_at, accepted_at, driving_at, completed_at, canceled_at')
      .order('created_at', { ascending: false }),
    admin
      .from('schedules')
      .select('schedule_id, schedule_day, start_point, destination, std, sta, status')
      .eq('status', 'Active'),
    admin
      .from('ticketings')
      .select('transaction_id, status, created_at, accepted_at, in_progress_at, completed_at, canceled_at')
      .order('created_at', { ascending: false }),
  ])

  const all = (allTasks ?? []) as TaskRow[]
  const tasks = profile.role === 'Dispatcher'
    ? all.filter((task) => task.created_by === profile.id || task.fleet_ownership === 'Non-TGR')
    : all

  const date = jakartaDate(new Date())
  const day = ((new Date(date + 'T12:00:00+07:00').getUTCDay() + 6) % 7) + 1
  const now = new Date()

  const usedScheduleIds = new Set(
    all
      .map((task) => task.schedule_id)
      .filter((scheduleId): scheduleId is string => Boolean(scheduleId)),
  )

  const unassignedAlerts: TaskAlert[] = (schedules ?? [])
    .filter((schedule) => schedule.schedule_day === day && !usedScheduleIds.has(schedule.schedule_id))
    .map((schedule) => ({
      kind: 'unassigned' as const,
      scheduleId: schedule.schedule_id,
      startPoint: schedule.start_point,
      destination: schedule.destination,
      std: schedule.std,
      sta: schedule.sta,
      targetAt: scheduleTimestamp(date, schedule.std),
    }))
    .filter((alert) => now.getTime() >= alert.targetAt.getTime() - 30 * 60 * 1000)

  const assignedAlerts: TaskAlert[] = all
    .filter((task) => task.schedule_id && ['Assigned', 'Confirmed', 'Driving'].includes(task.status) && task.sta)
    .map((task) => ({
      kind: 'assigned' as const,
      transactionId: task.transaction_id,
      scheduleId: task.schedule_id as string,
      startPoint: task.start_point,
      destination: task.destination,
      std: task.std,
      sta: task.sta,
      targetAt: new Date(task.sta as string),
      status: task.status,
    }))
    .filter((alert) => now.getTime() >= alert.targetAt.getTime() - 10 * 60 * 1000)

  const taskAlerts = [...unassignedAlerts, ...assignedAlerts]
  const ticketRows = (ticketings ?? []) as TicketRow[]
  const ticketAlerts = ticketRows.filter((ticket) =>
    ['Requested', 'Confirmed', 'In Progress'].includes(ticket.status)
  )
  const ticketAlertCount = ticketRows.filter((ticket) => {
    const elapsed = now.getTime() - new Date(
      ticket.status === 'Confirmed'
        ? ticket.accepted_at ?? ticket.created_at
        : ticket.status === 'In Progress'
        ? ticket.in_progress_at ?? ticket.created_at
        : ticket.created_at,
    ).getTime()
    if (ticket.status === 'Requested') return elapsed >= 3 * 60 * 60 * 1000
    if (ticket.status === 'Confirmed') return elapsed >= 24 * 60 * 60 * 1000
    if (ticket.status === 'In Progress') return elapsed >= 3 * 24 * 60 * 60 * 1000
    return false
  }).length

  const taskDurations: TaskDurationRow[] = tasks.map((task) => ({
    transactionId: task.transaction_id,
    taskType: task.task_type,
    fleetOwnership: task.fleet_ownership,
    status: task.status,
    assignedAccepted: task.fleet_ownership === 'Non-TGR' ? null : minutesBetween(task.assigned_at, task.accepted_at),
    acceptedDriving: task.fleet_ownership === 'Non-TGR' ? null : minutesBetween(task.accepted_at, task.driving_at),
    drivingCompleted: minutesBetween(task.driving_at, task.completed_at),
    assignedDriving: task.fleet_ownership === 'Non-TGR' ? minutesBetween(task.assigned_at, task.driving_at) : null,
    totalCompleted: minutesBetween(task.assigned_at, task.completed_at),
    canceledFromPrevious: task.status === 'Canceled'
      ? minutesBetween(canceledFromTimestamp(task), task.canceled_at)
      : null,
    canceledCycle: task.status === 'Canceled' ? minutesBetween(task.assigned_at, task.canceled_at) : null,
  }))

  const ticketDurations: TicketDurationRow[] = ticketRows.map((ticket) => ({
    transactionId: ticket.transaction_id,
    status: ticket.status,
    createdAccepted: minutesBetween(ticket.created_at, ticket.accepted_at),
    acceptedInProgress: minutesBetween(ticket.accepted_at, ticket.in_progress_at),
    inProgressCompleted: minutesBetween(ticket.in_progress_at, ticket.completed_at),
    totalCompleted: minutesBetween(ticket.created_at, ticket.completed_at),
    canceledFromCreated: ticket.status === 'Canceled' ? minutesBetween(ticket.created_at, ticket.canceled_at) : null,
    canceledCycle: ticket.status === 'Canceled' ? minutesBetween(ticket.created_at, ticket.canceled_at) : null,
  }))

  return {
    taskDurations,
    ticketDurations,
    taskCounts: {
      Requested: tasks.filter((task) => task.status === 'Requested').length,
      Assigned: tasks.filter((task) => task.status === 'Assigned').length,
      Confirmed: tasks.filter((task) => task.status === 'Confirmed').length,
      Driving: tasks.filter((task) => task.status === 'Driving').length,
      Completed: tasks.filter((task) => task.status === 'Completed').length,
    },
    ticketCounts: {
      Requested: ticketRows.filter((ticket) => ticket.status === 'Requested').length,
      Confirmed: ticketRows.filter((ticket) => ticket.status === 'Confirmed').length,
      'In Progress': ticketRows.filter((ticket) => ticket.status === 'In Progress').length,
      Completed: ticketRows.filter((ticket) => ticket.status === 'Completed').length,
    },
    taskAlerts,
    ticketAlerts,
    ticketAlertCount,
    averages: {
      assignedAccepted: average(tasks.map((task) => minutesBetween(task.assigned_at, task.accepted_at))),
      acceptedDriving: average(tasks.map((task) => minutesBetween(task.accepted_at, task.driving_at))),
      drivingCompleted: average(tasks.map((task) => minutesBetween(task.driving_at, task.completed_at))),
      completedCycle: average(tasks.filter((task) => task.status === 'Completed').map((task) => minutesBetween(task.assigned_at, task.completed_at))),
      canceledCycle: average(tasks.filter((task) => task.status === 'Canceled').map((task) => minutesBetween(task.assigned_at ?? task.accepted_at ?? task.driving_at, task.canceled_at))),
    },
    taskAveragesNonTgr: {
      assignedDriving: average(tasks.filter((task) => task.fleet_ownership === 'Non-TGR').map((task) => minutesBetween(task.assigned_at, task.driving_at))),
      drivingCompleted: average(tasks.filter((task) => task.fleet_ownership === 'Non-TGR').map((task) => minutesBetween(task.driving_at, task.completed_at))),
      completedCycle: average(tasks.filter((task) => task.fleet_ownership === 'Non-TGR' && task.status === 'Completed').map((task) => minutesBetween(task.assigned_at, task.completed_at))),
      canceledCycle: average(tasks.filter((task) => task.fleet_ownership === 'Non-TGR' && task.status === 'Canceled').map((task) => minutesBetween(task.assigned_at, task.canceled_at))),
    },
    ticketAverages: {
      createdAccepted: average(ticketRows.map((ticket) => minutesBetween(ticket.created_at, ticket.accepted_at))),
      acceptedInProgress: average(ticketRows.map((ticket) => minutesBetween(ticket.accepted_at, ticket.in_progress_at))),
      inProgressCompleted: average(ticketRows.map((ticket) => minutesBetween(ticket.in_progress_at, ticket.completed_at))),
      completedCycle: average(ticketRows.filter((ticket) => ticket.status === 'Completed').map((ticket) => minutesBetween(ticket.created_at, ticket.completed_at))),
      canceledCycle: average(ticketRows.filter((ticket) => ticket.status === 'Canceled').map((ticket) => minutesBetween(ticket.created_at, ticket.canceled_at))),
    },
  }
}
