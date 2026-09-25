import { createAdminClient } from '@/lib/supabase/admin'
import type { AppProfile } from '@/lib/server/profile'

function jakartaNow() {
  const now = new Date()
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const day = ((new Date(`${date}T12:00:00+07:00`).getUTCDay() + 6) % 7) + 1
  const start = new Date(`${date}T00:00:00+07:00`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { date, day, startIso: start.toISOString(), endIso: end.toISOString() }
}

export async function getTimetableData(profile: AppProfile) {
  const admin = createAdminClient()
  const { date, day, startIso, endIso } = jakartaNow()

  const [{ data: schedules }, { data: allTasks }] = await Promise.all([
    admin
      .from('schedules')
      .select('schedule_id, trip, schedule_hub_id, route, category, start_point, start_point_type, destination, destination_type, schedule_day, schedule_day_name, std, sta, status')
      .eq('status', 'Active')
      .order('schedule_day')
      .order('std'),
    admin
      .from('tasks')
      .select('transaction_id, status, source_type, task_type, created_by, fleet_ownership, schedule_id, start_point, destination, std, sta, executor_nik, executor_snapshot, fleet_snapshot, sj_number, driving_at, arrived_at')
      .order('std'),
  ])

  const visibleTasks = (allTasks ?? []).filter((task) =>
    task.source_type !== 'Extra Schedule' || task.status !== 'Requested'
  )

  const tasks = profile.role === 'Dispatcher'
    ? visibleTasks.filter((task) => task.created_by === profile.id || task.fleet_ownership === 'Non-TGR')
    : visibleTasks

  const todayTasks = tasks.filter((task) => {
    if (!task.std) return false
    const value = new Date(task.std).getTime()
    return value >= new Date(startIso).getTime() && value < new Date(endIso).getTime()
  })

  const liveTasks = tasks.filter((task) => {
    if (!['Driving', 'Completed'].includes(task.status)) return false
    const actualTime = task.status === 'Completed' ? task.arrived_at : task.driving_at
    if (!actualTime) return false
    const value = new Date(actualTime).getTime()
    return value >= new Date(startIso).getTime() && value < new Date(endIso).getTime()
  })

  // A schedule can be reused before STD, including after cancellation.
  // Keep a non-canceled assignment when several transactions reference the same schedule,
  // so a later canceled transaction cannot hide an earlier active assignment in the plan view.
  const taskBySchedule = new Map<string, (typeof tasks)[number]>()
  for (const task of tasks) {
    if (!task.schedule_id) continue
    const current = taskBySchedule.get(task.schedule_id)
    if (!current) {
      taskBySchedule.set(task.schedule_id, task)
      continue
    }

    const currentIsCanceled = current.status === 'Canceled'
    const taskIsCanceled = task.status === 'Canceled'
    if (currentIsCanceled && !taskIsCanceled) {
      taskBySchedule.set(task.schedule_id, task)
      continue
    }

    if (currentIsCanceled === taskIsCanceled) {
      const currentTime = current.std ? new Date(current.std).getTime() : 0
      const taskTime = task.std ? new Date(task.std).getTime() : 0
      if (taskTime >= currentTime) taskBySchedule.set(task.schedule_id, task)
    }
  }

  return {
    date,
    todayDay: day,
    schedules: schedules ?? [],
    tasks,
    todayTasks,
    liveTasks,
    taskBySchedule: Object.fromEntries(taskBySchedule),
  }
}
