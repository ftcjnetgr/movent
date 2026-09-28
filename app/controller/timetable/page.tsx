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
  const view = params.view === "live" ? "live" : "plan";

  return (
    <>
      <div className="page-heading schedule-page-heading">
        <div>
          <h1>Jadwal</h1>
          <p>
            {view === "live"
              ? "Pantau posisi penugasan hari ini secara langsung."
              : "Lihat jadwal sesuai hari yang kamu pilih."}
          </p>
        </div>
        <nav className="alert-view-tabs" aria-label="Jadwal">
          <Link
            href="/controller/timetable?view=plan"
            className={view === "plan" ? "active" : ""}
          >
            Rencana
          </Link>
          <Link
            href="/controller/timetable?view=live"
            className={view === "live" ? "active" : ""}
          >
            Pantau Langsung
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
        initialView={view === "live" ? "live" : "database"}
      />
    </>
  );
}
