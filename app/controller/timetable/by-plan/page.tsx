import TimetableView from '@/components/timetable-view'
import { getCurrentProfile } from '@/lib/server/profile'
import { getTimetableData } from '@/lib/server/timetable'

export default async function ControllerByPlanPage() {
  const profile = await getCurrentProfile()
  const data = await getTimetableData(profile)
  return (
    <>
      <div className="page-heading"><div><span className="eyebrow">Controller</span><h1>By Plan</h1><p>Lihat timetable berdasarkan database schedule dan pantau realisasinya.</p></div></div>
      <TimetableView date={data.date} schedules={data.schedules} tasks={data.tasks} taskBySchedule={data.taskBySchedule} initialView="database" />
    </>
  )
}
