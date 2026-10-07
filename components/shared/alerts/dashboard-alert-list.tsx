"use client";

import { useEffect, useMemo, useState } from "react";
import StatusBadge from "@/components/shared/status-badge";
import { STATUS_LABELS } from "@/components/shared/status-config";

type TaskAlert = {
  kind: "unassigned" | "assigned";
  trigger: "std" | "sta";
  scheduleId: string;
  transactionId?: string;
  status?: string;
  startPoint: string | null;
  destination: string | null;
  std: string | null;
  sta: string | null;
  targetAt: string;
  driverName: string | null;
  fleetPlat: string | null;
  scheduleHubId: string | null;
};

type TicketAlert = {
  transaction_id: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  in_progress_at: string | null;
  location: string | null;
  maintenance_list: string | null;
};

function formatDuration(totalSeconds: number) {
  const totalMinutes = Math.max(0, Math.floor(totalSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatScheduleTime(value: string | null) {
  if (!value || value === "-") return "-";
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function maintenanceBaseAt(maintenance: TicketAlert) {
  if (maintenance.status === "Confirmed")
    return maintenance.accepted_at
      ? new Date(maintenance.accepted_at).getTime()
      : null;
  if (maintenance.status === "In Progress")
    return maintenance.in_progress_at
      ? new Date(maintenance.in_progress_at).getTime()
      : null;
  return new Date(maintenance.created_at).getTime();
}

function maintenanceThresholdSeconds(status: string) {
  if (status === "Confirmed") return 24 * 60 * 60;
  if (status === "In Progress") return 24 * 60 * 60;
  return 60 * 60;
}

function maintenanceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    Requested: STATUS_LABELS.Requested,
    Confirmed: STATUS_LABELS.Confirmed,
    "In Progress": STATUS_LABELS["In Progress"],
  };
  return labels[status] ?? status;
}

function taskStatusLabel(status: string | undefined) {
  if (status === "Unassigned") return "Belum ditugasin";
  return STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status ?? "-";
}

function taskContextLabel(status: string | undefined) {
  if (status === "Unassigned") return "Schedule ini belum punya penugasan";
  if (status === "Driving") return "Mendekati atau melewati STA";
  return "Mendekati atau melewati STD";
}

function taskDetail(alert: TaskAlert, now: number) {
  const target = new Date(alert.targetAt).getTime();
  const threshold =
    alert.trigger === "std" ? 30 * 60 * 1000 : 10 * 60 * 1000;
  const countdown = target - now;
  return {
    ...alert,
    startPoint: alert.startPoint ?? "-",
    destination: alert.destination ?? "-",
    std: formatScheduleTime(alert.std),
    sta: formatScheduleTime(alert.sta),
    statusLabel: taskStatusLabel(alert.status),
    contextLabel: taskContextLabel(alert.status),
    label: countdown > 0 ? "Sisa waktu" : "Lewat",
    time: formatDuration(Math.abs(countdown) / 1000),
    late: countdown <= 0,
    inWindow: now >= target - threshold,
  };
}

export default function DashboardAlertList({
  taskAlerts,
  taskAlertHubs = [],
  ticketAlerts,
  mode = "all",
  embedded = false,
}: {
  taskAlerts?: TaskAlert[];
  taskAlertHubs?: string[];
  ticketAlerts?: TicketAlert[];
  mode?: "all" | "task" | "ticket";
  embedded?: boolean;
}) {
  const taskAlertRows = taskAlerts ?? [];
  const ticketAlertRows = ticketAlerts ?? [];
  const [now, setNow] = useState(() => Date.now());
  const [activeTaskHub, setActiveTaskHub] = useState("");
  const [activeTicketLocation, setActiveTicketLocation] = useState("");
  const [selectedTask, setSelectedTask] = useState<(ReturnType<typeof taskDetail> & { scheduleHubId: string | null }) | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const taskItems = useMemo(
    () =>
      taskAlertRows
        .map((alert) => taskDetail(alert, now))
        .filter((item) => item.inWindow),
    [taskAlertRows, now],
  );

  const ticketItems = useMemo(
    () =>
      ticketAlertRows
        .map((ticket) => {
          const base = maintenanceBaseAt(ticket);
          if (base === null) return null;
          const thresholdSeconds = maintenanceThresholdSeconds(ticket.status);
          const elapsed = (now - base) / 1000;
          return {
            transactionId: ticket.transaction_id,
            status: maintenanceStatusLabel(ticket.status),
            label: elapsed < thresholdSeconds ? "Sisa waktu" : "Lewat",
            indicator: formatDuration(Math.abs(thresholdSeconds - elapsed)),
            late: elapsed >= thresholdSeconds,
            threshold:
              ticket.status === "Requested"
                ? "1 jam"
                : ticket.status === "Confirmed"
                  ? "1 hari"
                  : "1 hari",
            location: ticket.location ?? "Lokasi tidak tersedia",
            maintenance:
              ticket.maintenance_list ?? "Perbaikan tidak tersedia",
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [ticketAlertRows, now],
  );

  const lateTaskCount = taskItems.filter((item) => item.late).length;
  const lateTicketCount = ticketItems.filter((item) => item.late).length;
  const showTasks = mode !== "ticket";
  const showTickets = mode !== "task";
  const totalAlerts =
    (showTasks ? taskItems.length : 0) + (showTickets ? ticketItems.length : 0);
  const lateCount =
    (showTasks ? lateTaskCount : 0) + (showTickets ? lateTicketCount : 0);
  const heroTitle =
    mode === "task"
      ? "Ada yang perlu dicek"
      : mode === "ticket"
        ? "Ada perbaikan yang perlu dicek"
        : "Ada yang perlu dicek";
  const heroDescription =
    mode === "task"
      ? "Ada schedule yang waktunya mulai mepet atau udah lewat."
      : mode === "ticket"
        ? "Ada perbaikan yang masih perlu dicek."
        : "Ada beberapa hal yang perlu kamu cek di sini.";

  const taskGroups = useMemo(() => {
    const groups = new Map<string, typeof taskItems>();
    for (const hub of taskAlertHubs) {
      groups.set(hub, []);
    }
    for (const item of taskItems) {
      const hub = item.scheduleHubId || "Hub-nya belum ada";
      groups.set(hub, [...(groups.get(hub) ?? []), item]);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [taskAlertHubs, taskItems]);

  const ticketGroups = useMemo(() => {
    const groups = new Map<string, typeof ticketItems>();
    for (const item of ticketItems) {
      groups.set(item.location, [...(groups.get(item.location) ?? []), item]);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [ticketItems]);

  return (
    <div className="alert-dashboard">
      {!embedded ? (
        <div className="super-dashboard-heading alert-content-heading">
          <div>
            <h1>{heroTitle}</h1>
            <p>
              {heroDescription} {totalAlerts} hal aktif
              {lateCount ? ` · ${lateCount} udah lewat batas` : ""}.
            </p>
          </div>
        </div>
      ) : null}

      {showTasks ? (
        <section className="alert-content-section">
          {taskGroups.length ? (
            (() => {
              const activeHub = taskGroups.some(
                ([hub]) => hub === activeTaskHub,
              )
                ? activeTaskHub
                : taskGroups[0][0];
              const activeItems =
                taskGroups.find(([hub]) => hub === activeHub)?.[1] ?? [];
              const late = activeItems.filter((item) => item.late).length;
              const approaching = activeItems.length - late;
              return (
                <div className="alert-hub-tabs">
                  <div
                    className="alert-hub-tabs-list"
                    role="tablist"
                    aria-label="Schedule Hub"
                  >
                    {taskGroups.map(([hub, items]) => {
                      const tabId = `task-hub-${hub.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()}`;
                      const active = hub === activeHub;
                      return (
                        <button
                          key={hub}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          aria-controls={tabId}
                          className={`alert-hub-tab${active ? " is-active" : ""}`}
                          onClick={() => setActiveTaskHub(hub)}
                        >
                          <span>{hub}</span>
                          <small>{items.length} schedule</small>
                        </button>
                      );
                    })}
                  </div>

                  <div className="alert-hub-summary">
                    <div>
                      <span>Hub Jadwal</span>
                      <h2>{activeHub}</h2>
                    </div>
                    <div className="alert-hub-summary-stat">
                      <strong>{activeItems.length}</strong>
                      <span>schedule</span>
                    </div>
                    <div className="alert-hub-summary-stat">
                      <strong>{approaching}</strong>
                      <span>mendekati batas</span>
                    </div>
                    <div className="alert-hub-summary-stat">
                      <strong>{late}</strong>
                      <span>udah lewat batas</span>
                    </div>
                  </div>

                  <div className="alert-mobile-cards" role="list" aria-label="Daftar alert schedule">
                    {activeItems.map((item) => (
                      <button
                        key={`mobile-${item.scheduleId}-${item.transactionId ?? "schedule"}`}
                        type="button"
                        className={`alert-mobile-card${item.late ? " is-alert-late" : ""}`}
                        onClick={() => setSelectedTask(item)}
                      >
                        <div className="alert-mobile-route">
                          <div>
                            <span>Start Point</span>
                            <strong>{item.startPoint}</strong>
                          </div>
                          <span className="alert-mobile-arrow" aria-hidden="true">→</span>
                          <div>
                            <span>Destination</span>
                            <strong>{item.destination}</strong>
                          </div>
                        </div>
                        <div className="alert-mobile-time">
                          <span>{item.label}</span>
                          <strong>{item.time}</strong>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div
                    id={`task-hub-${activeHub.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()}`}
                    role="tabpanel"
                    className="alert-table-scroll"
                  >
                    <table className="alert-table alert-group-table task-alert-group-table">
                      <thead>
                        <tr>
                          <th>Jadwal</th>
                          <th>Status</th>
                          <th>Pengemudi</th>
                          <th>Armada</th>
                          <th>Rute</th>
                          <th>STD</th>
                          <th>STA</th>
                          <th>Keterangan</th>
                          <th>Waktu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeItems.map((item) => (
                          <tr
                            key={`${item.scheduleId}-${item.transactionId ?? "schedule"}`}
                            className={item.late ? "is-alert-late" : ""}
                          >
                            <td>
                              <strong>{item.scheduleId}</strong>
                              {item.transactionId ? (
                                <small>{item.transactionId}</small>
                              ) : null}
                            </td>
                            <td>
                              <StatusBadge
                                status={
                                  item.status === "Unassigned"
                                    ? "Requested"
                                    : (item.status as
                                        | "Assigned"
                                        | "Confirmed"
                                        | "Driving")
                                }
                                label={item.statusLabel}
                              />
                              <small className="alert-context">
                                {item.contextLabel}
                              </small>
                            </td>
                            <td>{item.driverName ?? "Belum ada driver di sini"}</td>
                            <td>{item.fleetPlat ?? "-"}</td>
                            <td>
                              {item.startPoint} → {item.destination}
                            </td>
                            <td>{item.std}</td>
                            <td>{item.sta}</td>
                            <td>{item.label}</td>
                            <td>
                              <b className={item.late ? "is-late" : ""}>
                                {item.time}
                              </b>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="alert-hub-tabs task-alert-empty">
              <div
                className="alert-hub-tabs-list"
                role="tablist"
                aria-label="Schedule Hub"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected="true"
                  className="alert-hub-tab is-active"
                  disabled
                >
                  <span>Belum ada schedule hub</span>
                  <small>0 jadwal</small>
                </button>
              </div>

              <div className="alert-hub-summary">
                <div>
                  <span>Hub Jadwal</span>
                  <h2>Belum ada hub jadwal</h2>
                </div>
                <div className="alert-hub-summary-stat">
                  <strong>0</strong>
                  <span>schedule</span>
                </div>
                <div className="alert-hub-summary-stat">
                  <strong>0</strong>
                  <span>mendekati batas</span>
                </div>
                <div className="alert-hub-summary-stat">
                  <strong>0</strong>
                  <span>udah lewat batas</span>
                </div>
              </div>

              <div className="alert-table-scroll">
                <table className="alert-table alert-group-table task-alert-group-table">
                  <thead>
                    <tr>
                      <th>Jadwal</th>
                      <th>Status</th>
                      <th>Pengemudi</th>
                      <th>Armada</th>
                      <th>Rute</th>
                      <th>STD</th>
                      <th>STA</th>
                      <th>Keterangan</th>
                      <th>Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="alert-empty-row">
                      <td colSpan={9}>
                        Belum ada notifikasi penugasan di sini.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {showTickets ? (
        <section className="alert-content-section maintenance-alert-section">
          {(() => {
            const hasGroups = ticketGroups.length > 0;
            const activeLocation = hasGroups
              ? ticketGroups.some(
                  ([location]) => location === activeTicketLocation,
                )
                ? activeTicketLocation
                : ticketGroups[0][0]
              : "Belum ada lokasi di sini";
            const activeItems = hasGroups
              ? (ticketGroups.find(
                  ([location]) => location === activeLocation,
                )?.[1] ?? [])
              : [];
            const late = activeItems.filter((item) => item.late).length;
            const approaching = activeItems.length - late;
            return (
              <div
                className={
                  "alert-hub-tabs" +
                  (!hasGroups ? " maintenance-alert-empty" : "")
                }
              >
                <div
                  className="alert-hub-tabs-list"
                  role="tablist"
                  aria-label="Lokasi Perbaikan"
                >
                  {hasGroups ? (
                    ticketGroups.map(([location, items]) => {
                      const tabId = `maintenance-location-${location.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()}`;
                      const active = location === activeLocation;
                      return (
                        <button
                          key={location}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          aria-controls={tabId}
                          className={`alert-hub-tab${active ? " is-active" : ""}`}
                          onClick={() => setActiveTicketLocation(location)}
                        >
                          <span>{location}</span>
                          <small>{items.length} perbaikan</small>
                        </button>
                      );
                    })
                  ) : (
                    <button
                      type="button"
                      role="tab"
                      aria-selected="true"
                      className="alert-hub-tab is-active"
                      disabled
                    >
                      <span>Belum ada lokasi</span>
                      <small>0 perbaikan</small>
                    </button>
                  )}
                </div>

                <div className="alert-hub-summary">
                  <div>
                    <span>Lokasi</span>
                    <h2>{activeLocation}</h2>
                  </div>
                  <div className="alert-hub-summary-stat">
                    <strong>{activeItems.length}</strong>
                    <span>perbaikan</span>
                  </div>
                  <div className="alert-hub-summary-stat">
                    <strong>{approaching}</strong>
                    <span>mendekati batas</span>
                  </div>
                  <div className="alert-hub-summary-stat">
                    <strong>{late}</strong>
                    <span>udah lewat batas</span>
                  </div>
                </div>

                <div
                  id={`maintenance-location-${activeLocation.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()}`}
                  role="tabpanel"
                  className="alert-table-scroll"
                >
                  <table className="alert-table alert-group-table maintenance-alert-group-table">
                    <thead>
                      <tr>
                        <th>ID transaksi</th>
                        <th>Perbaikan</th>
                        <th>Status</th>
                        <th>Keterangan</th>
                        <th>Waktu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeItems.length ? (
                        activeItems.map((item) => (
                          <tr
                            key={item.transactionId}
                            className={item.late ? "is-alert-late" : ""}
                          >
                            <td>
                              <strong>{item.transactionId}</strong>
                            </td>
                            <td>{item.maintenance}</td>
                            <td>
                              <StatusBadge
                                status={
                                  item.status === "Dibuat"
                                    ? "Requested"
                                    : item.status === "Dikonfirmasi"
                                      ? "Confirmed"
                                      : "In Progress"
                                }
                                label={
                                  STATUS_LABELS[item.status === "Dibuat"
                                    ? "Requested"
                                    : item.status === "Dikonfirmasi"
                                      ? "Confirmed"
                                      : "In Progress"] ?? item.status
                                }
                              />
                            </td>
                            <td>{item.threshold}</td>
                            <td>
                              <b className={item.late ? "is-late" : ""}>
                                {item.label} · {item.indicator}
                              </b>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr className="alert-empty-row">
                          <td colSpan={5}>
                            Belum ada perbaikan yang masuk notifikasi.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </section>
      ) : null}
    {selectedTask ? (
      <div className="alert-mobile-modal-backdrop" role="presentation" onClick={() => setSelectedTask(null)}>
        <div
          className="alert-mobile-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Detail aktivitas"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="alert-mobile-modal-header">
            <div>
              <span>Detail aktivitas</span>
              <h2>{selectedTask.scheduleId}</h2>
            </div>
            <button type="button" onClick={() => setSelectedTask(null)} aria-label="Tutup">
              ×
            </button>
          </div>

          <div className="alert-mobile-modal-grid">
            <div><span>Start Point</span><strong>{selectedTask.startPoint}</strong></div>
            <div><span>Destination</span><strong>{selectedTask.destination}</strong></div>
            <div><span>STD</span><strong>{selectedTask.std}</strong></div>
            <div><span>STA</span><strong>{selectedTask.sta}</strong></div>
            <div><span>Pengemudi</span><strong>{selectedTask.driverName ?? "-"}</strong></div>
            <div><span>Armada</span><strong>{selectedTask.fleetPlat ?? "-"}</strong></div>
            <div><span>Schedule Hub</span><strong>{selectedTask.scheduleHubId ?? "-"}</strong></div>
            <div><span>Status</span><strong>{selectedTask.statusLabel}</strong></div>
          </div>

          <div className={`alert-mobile-modal-time${selectedTask.late ? " is-late" : ""}`}>
            <span>{selectedTask.label}</span>
            <strong>{selectedTask.time}</strong>
          </div>
        </div>
      </div>
    ) : null}
  </div>
  );
}
