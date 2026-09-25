import TimetableView from '@/components/timetable-view'
import { getCurrentProfile } from '@/lib/server/profile'
import { getTimetableData } from '@/lib/server/timetable'

export default async function ControllerTimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const profile = await getCurrentProfile()
  const data = await getTimetableData(profile)
  const params = await searchParams
  const view = params.view === 'live' ? 'live' : 'plan'

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Schedule</h1>
          <p>{view === 'live' ? 'Pantau posisi penugasan hari ini secara real-time.' : 'Lihat rencana schedule berdasarkan hari yang kamu pilih.'}</p>
        </div>
      </div>
      <TimetableView
        date={data.date}
        todayDay={data.todayDay}
        schedules={data.schedules}
        tasks={data.tasks}
        todayTasks={data.todayTasks}
        liveTasks={data.liveTasks}
        taskBySchedule={data.taskBySchedule}
        initialView={view === 'live' ? 'live' : 'database'}
      />
    </>
  )
}
