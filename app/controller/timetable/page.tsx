import TimetableView from '@/components/timetable-view'
import { getCurrentProfile } from '@/lib/server/profile'
import { getTimetableData } from '@/lib/server/timetable'

export default async function ControllerTimetablePage() {
  const profile = await getCurrentProfile()
  const data = await getTimetableData(profile)

  return (
    <>
    <div className="page-heading">
        <div>
          <span className="eyebrow">Controller</span>
          <h1>Jadwal</h1>
          <p>Pantau jadwal dari database dan kondisi transaksi.</p>
        </div>
      </div>
      <TimetableView date={data.date} schedules={data.schedules} tasks={data.tasks} taskBySchedule={data.taskBySchedule} />
    </>
  )
}
