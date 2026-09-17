import AppShell from '@/components/app-shell'
import TimetableView from '@/components/timetable-view'
import { getCurrentProfile } from '@/lib/server/profile'
import { getTimetableData } from '@/lib/server/timetable'

export default async function ControllerTimetablePage() {
  const profile = await getCurrentProfile()
  const data = await getTimetableData(profile)

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Controller</span>
          <h1>Timetable</h1>
          <p>Rencanakan jadwal dari database dan pantau kondisi live.</p>
        </div>
      </div>
      <TimetableView date={data.date} schedules={data.schedules} tasks={data.tasks} taskBySchedule={data.taskBySchedule} />
    </AppShell>
  )
}
