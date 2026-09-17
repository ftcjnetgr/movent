import AppShell from '@/components/app-shell'
import TimetableView from '@/components/timetable-view'
import { getCurrentProfile } from '@/lib/server/profile'
import { getTimetableData } from '@/lib/server/timetable'

export default async function DispatcherTimetablePage() {
  const profile = await getCurrentProfile()
  const data = await getTimetableData(profile)

  return (
    <AppShell>
      <div className="page-heading"><div><span className="eyebrow">Dispatcher</span><h1>Timetable</h1><p>Plan schedule dan pantau transaksi yang berjalan.</p></div></div>
      <TimetableView date={data.date} schedules={data.schedules} tasks={data.tasks} taskBySchedule={data.taskBySchedule} />
    </AppShell>
  )
}
