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

type TaskAlert = {
  kind: 'unassigned' | 'assigned'
  scheduleId: string
  transactionId?: string
  status?: string
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

export async function getDashboardData(profile: AppProfile) {
  const admin = createAdminClient()
  const [{ data: allTasks }, { data: schedules }, { data: ticketings }] = await Promise.all([
    admin
      .from('tasks')
      .select('transaction_id, status, source_type, task_type, created_by, fleet_ownership, schedule_id, std, sta, assigned_at, accepted_at, driving_at, completed_at, canceled_at')
      .order('created_at', { ascending: false }),
    admin
      .from('schedules')
      .select('schedule_id, schedule_day, std, status')
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

  const allTaskBySchedule = new Map(
    all
      .filter((task) => task.schedule_id && task.status !== 'Canceled')
      .map((task) => [task.schedule_id as string, task]),
  )

  const unassignedAlerts: TaskAlert[] = (schedules ?? [])
    .filter((schedule) => schedule.schedule_day === day && !allTaskBySchedule.has(schedule.schedule_id))
    .map((schedule) => ({
      kind: 'unassigned' as const,
      scheduleId: schedule.schedule_id,
      targetAt: scheduleTimestamp(date, schedule.std),
    }))
    .filter((alert) => now.getTime() >= alert.targetAt.getTime() - 30 * 60 * 1000)

  const assignedAlerts: TaskAlert[] = all
    .filter((task) => task.schedule_id && ['Assigned', 'Accepted', 'Driving'].includes(task.status) && task.sta)
    .map((task) => ({
      kind: 'assigned' as const,
      transactionId: task.transaction_id,
      scheduleId: task.schedule_id as string,
      targetAt: new Date(task.sta as string),
      status: task.status,
    }))
    .filter((alert) => now.getTime() >= alert.targetAt.getTime() - 10 * 60 * 1000)

  const taskAlerts = [...unassignedAlerts, ...assignedAlerts]
  const ticketRows = (ticketings ?? []) as TicketRow[]
  const ticketAlerts = ticketRows.filter((ticket) => {
    const nowMs = now.getTime()
    if (ticket.status === 'Created') return nowMs - new Date(ticket.created_at).getTime() >= 3 * 60 * 60 * 1000
    if (ticket.status === 'Accepted' && ticket.accepted_at) return nowMs - new Date(ticket.accepted_at).getTime() >= 24 * 60 * 60 * 1000
    if (ticket.status === 'In Progress' && ticket.in_progress_at) return nowMs - new Date(ticket.in_progress_at).getTime() >= 72 * 60 * 60 * 1000
    return false
  })

  return {
    taskCounts: {
      Assigned: tasks.filter((task) => task.status === 'Assigned').length,
      Accepted: tasks.filter((task) => task.status === 'Accepted').length,
      Driving: tasks.filter((task) => task.status === 'Driving').length,
      Completed: tasks.filter((task) => task.status === 'Completed').length,
    },
    ticketCounts: {
      Created: ticketRows.filter((ticket) => ticket.status === 'Created').length,
      Accepted: ticketRows.filter((ticket) => ticket.status === 'Accepted').length,
      'In Progress': ticketRows.filter((ticket) => ticket.status === 'In Progress').length,
      Completed: ticketRows.filter((ticket) => ticket.status === 'Completed').length,
    },
    taskAlerts,
    ticketAlerts,
    averages: {
      assignedAccepted: average(tasks.map((task) => minutesBetween(task.assigned_at, task.accepted_at))),
      acceptedDriving: average(tasks.map((task) => minutesBetween(task.accepted_at, task.driving_at))),
      drivingCompleted: average(tasks.map((task) => minutesBetween(task.driving_at, task.completed_at))),
      completedCycle: average(tasks.filter((task) => task.status === 'Completed').map((task) => minutesBetween(task.assigned_at, task.completed_at))),
      canceledCycle: average(tasks.filter((task) => task.status === 'Canceled').map((task) => minutesBetween(task.assigned_at ?? task.accepted_at ?? task.driving_at, task.canceled_at))),
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
