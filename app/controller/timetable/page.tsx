import Link from "next/link";
import TimetableView from "@/components/shared/timetable-view";
import { getCurrentProfile } from "@/lib/server/profile";
import { getTimetableData } from "@/lib/server/timetable";

export default async function ControllerTimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const profile = await getCurrentProfile();
  const data = await getTimetableData(profile);
  const params = await searchParams;
  const view = params.view === "realized" ? "realized" : "plan";

  return (
    <>
      <div className="page-heading schedule-page-heading">
        <div>
          <h1>Jadwal</h1>
          <p>
            {view === "realized"
              ? "Lihat jadwal dan progres realisasinya di sini."
              : "Pilih harinya, terus lihat jadwalnya di sini."}
          </p>
        </div>
        <nav className="alert-view-tabs" aria-label="Jadwal">
          <Link
            href="/controller/timetable?view=plan"
            className={view === "plan" ? "active" : ""}
          >
            Terjadwal
          </Link>
          <Link
            href="/controller/timetable?view=realized"
            className={view === "realized" ? "active" : ""}
          >
            Terealisasi
          </Link>
        </nav>
      </div>
      <TimetableView
        date={data.date}
        todayDay={data.todayDay}
        schedules={data.schedules}
        tasks={data.tasks}
        todayTasks={data.todayTasks}
        liveTasks={data.liveTasks}
        taskBySchedule={data.taskBySchedule}
        initialView={view === "realized" ? "realized" : "database"}
      />
    </>
  );
}
