import TimetableView from '@/components/timetable-view'
import { getCurrentProfile } from '@/lib/server/profile'
import { getTimetableData } from '@/lib/server/timetable'

export default async function ControllerLiveTrackingPage() {
  const profile = await getCurrentProfile()
  const data = await getTimetableData(profile)
  return (
    <>
      <div className="page-heading"><div><span className="eyebrow">Controller</span><h1>Live Tracking</h1><p>Pantau assignment yang sudah dibuat melalui status dan waktu operasional.</p></div></div>
      <TimetableView date={data.date} schedules={data.schedules} tasks={data.tasks} taskBySchedule={data.taskBySchedule} initialView="live" />
    </>
  )
}
