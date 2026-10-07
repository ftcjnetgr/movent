import { notFound } from "next/navigation";
import Link from "next/link";
import DashboardAlertList from "@/components/shared/alerts/dashboard-alert-list";
import { getCurrentProfile } from "@/lib/server/profile";
import { getDashboardData } from "@/lib/server/dashboard";

export default async function AlertPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!["Controller", "Super User"].includes(profile.role)) notFound();

  const params = await searchParams;
  const view = params.view === "maintenance" ? "maintenance" : "penugasan";
  const data = await getDashboardData(profile);

  return (
    <div className="role-page alert-page">
      <div className="super-dashboard-heading alert-page-heading">
        <div>
          <h1>Notifikasi</h1>
          <p>Ada beberapa hal yang perlu kamu cek di sini.</p>
        </div>
        <nav className="alert-view-tabs" aria-label="Notifikasi">
          <Link
            href="/controller/alert"
            className={view === "penugasan" ? "active" : ""}
          >
            Penugasan
            {data.taskAlerts.length > 0 ? (
              <span className="alert-tab-badge">
                {data.taskAlerts.length > 99 ? "99+" : data.taskAlerts.length}
              </span>
            ) : null}
          </Link>
          <Link
            href="/controller/alert?view=maintenance"
            className={view === "maintenance" ? "active" : ""}
          >
            Perbaikan
            {data.ticketAlerts.length > 0 ? (
              <span className="alert-tab-badge">
                {data.ticketAlerts.length > 99
                  ? "99+"
                  : data.ticketAlerts.length}
              </span>
            ) : null}
          </Link>
        </nav>
      </div>

      <DashboardAlertList
        mode={view === "maintenance" ? "ticket" : "task"}
        taskAlerts={data.taskAlerts.map((alert) => ({
          ...alert,
          targetAt: alert.targetAt.toISOString(),
        }))}
        taskAlertHubs={data.taskAlertHubs}
        ticketAlerts={data.ticketAlerts}
        embedded
      />
    </div>
  );
}
