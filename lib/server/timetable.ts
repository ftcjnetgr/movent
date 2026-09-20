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
      .select('transaction_id, status, source_type, task_type, created_by, fleet_ownership, schedule_id, start_point, destination, std, sta, executor_nik, executor_snapshot, fleet_snapshot, sj_number')
      .gte('std', startIso)
      .lt('std', endIso)
      .order('std'),
  ])

  const visibleTasks = (allTasks ?? []).filter((task) =>
    task.source_type !== 'Extra Schedule' || task.status !== 'Requested'
  )

  const tasks = profile.role === 'Dispatcher'
    ? visibleTasks.filter((task) => task.created_by === profile.id || task.fleet_ownership === 'Non-TGR')
    : visibleTasks

  const taskBySchedule = new Map(
    tasks
      .filter((task) => task.schedule_id)
      .map((task) => [task.schedule_id as string, task])
  )

  return {
    date,
    todayDay: day,
    schedules: schedules ?? [],
    tasks,
    taskBySchedule: Object.fromEntries(taskBySchedule),
  }
}
