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
          <span className="eyebrow">Controller</span>
          <h1>Schedule</h1>
          <p>Pantau jadwal dalam satu tampilan.</p>
        </div>
      </div>
      <TimetableView
        date={data.date}
        schedules={data.schedules}
        tasks={data.tasks}
        taskBySchedule={data.taskBySchedule}
        initialView={view === 'live' ? 'live' : 'database'}
      />
    </>
  )
}
