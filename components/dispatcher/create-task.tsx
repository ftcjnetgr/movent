"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { State as DispatcherTaskState } from "@/app/dispatcher/beranda/actions";
import SearchableMasterSelect from "@/components/shared/forms/searchable-master-select";
import {
  createDispatcherTaskAction,
  confirmDispatcherTaskAction,
} from "@/app/dispatcher/beranda/actions";

const initialState: DispatcherTaskState = {};

type Schedule = {
  schedule_id: string;
  route: string;
  category: string;
  schedule_hub_id: string | null;
  schedule_day: number;
  start_point: string;
  destination: string;
  std: string;
  sta: string;
  trip: number;
};

type Props = {

  schedules: Schedule[];
  executors: Array<{ executor_nik: string; full_name: string }>;
  fleets: Array<{ plat_number: string; fleet_type: string }>;
};

function timeLabel(value: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";

  const direct = raw.match(/^(\d{2}:\d{2})/);
  if (direct) return direct[1];

  const embedded = raw.match(/(?:T|\s)(\d{2}:\d{2})/);
  return embedded?.[1] ?? "-";
}

export default function DispatcherCreateTask({
  schedules,
  executors,
  fleets,
}: Props) {
  const [state, formAction, pending] = useActionState(
    createDispatcherTaskAction,
    initialState,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmDispatcherTaskAction,
    initialState,
  );
  const [scheduleId, setScheduleId] = useState("");
  const [route, setRoute] = useState("Interhub");
  const [chosenSchedule, setChosenSchedule] = useState<Schedule | null>(null);
  const [assignmentStep, setAssignmentStep] = useState(false);
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [showAssignmentResult, setShowAssignmentResult] = useState(false);

  const filteredSchedules = useMemo(() => {
    const now = new Date();
    const jakartaParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const weekdayMap: Record<string, number> = {
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
      Sun: 7,
    };
    const currentDay = weekdayMap[jakartaParts.find((item) => item.type === "weekday")?.value ?? ""];
    const currentHour = Number(jakartaParts.find((item) => item.type === "hour")?.value ?? 0);
    const currentMinute = Number(jakartaParts.find((item) => item.type === "minute")?.value ?? 0);
    const currentMinutes = currentHour * 60 + currentMinute;
    const nowYear = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
      }).format(now),
    );
    const nowMonth = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jakarta",
        month: "numeric",
      }).format(now),
    );
    const nowDate = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
      }).format(now),
    );
    const todayKey = Date.UTC(nowYear, nowMonth - 1, nowDate);
    const twindateStartKey = Date.UTC(nowYear, nowMonth - 1, nowMonth);
    const twindateEnd = new Date(twindateStartKey);
    twindateEnd.setUTCDate(twindateEnd.getUTCDate() + 2);
    const isTwindateWindow =
      todayKey >= twindateStartKey &&
      todayKey <= twindateEnd.getTime();
    const allowedCategory = isTwindateWindow ? "Campaign" : "Normal";

    const needle = query.trim().toLowerCase();
    const routeFiltered = (route
      ? schedules.filter((schedule) => schedule.route === route)
      : schedules
    ).filter((schedule) => {
      if (schedule.schedule_day !== currentDay) return false;
      if (schedule.category !== allowedCategory) return false;
      const [hour, minute] = schedule.std.slice(0, 5).split(":").map(Number);
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
      return hour * 60 + minute >= currentMinutes;
    });

    if (!needle) return routeFiltered;

    return routeFiltered.filter((schedule) =>
      [
        schedule.schedule_id,
        schedule.start_point,
        schedule.destination,
        schedule.std,
        schedule.sta,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, route, schedules]);

  const groupedSchedules = useMemo(() => {
    const groups = new Map<string, Schedule[]>();

    for (const schedule of filteredSchedules) {
      const group = schedule.schedule_hub_id?.trim() || "Lainnya";
      const rows = groups.get(group) ?? [];
      rows.push(schedule);
      groups.set(group, rows);
    }

    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "id"),
    );
  }, [filteredSchedules]);
  const routes = useMemo(() => {
    const unique = [...new Set(schedules.map((item) => item.route).filter(Boolean))];
    const order = ["Interhub", "Transit", "Direct"];
    return unique.sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [schedules]);


  useEffect(() => {
    if (!query.trim()) {
      setOpenGroups(new Set());
      return;
    }

    setOpenGroups(new Set(groupedSchedules.map(([group]) => group)));
  }, [groupedSchedules, query]);

  const executorOptions = executors.map((executor) => ({
    value: executor.executor_nik,
    label: executor.executor_nik + " - " + executor.full_name,
    searchText: executor.executor_nik + " " + executor.full_name,
  }));

  const fleetOptions = fleets.map((fleet) => ({
    value: fleet.plat_number,
    label: fleet.plat_number + " - " + fleet.fleet_type,
    searchText: fleet.plat_number + " " + fleet.fleet_type,
  }));

  function toggleGroup(group: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  function chooseSchedule(schedule: Schedule) {
    setChosenSchedule(schedule);
    setAssignmentStep(false);
  }

  function useChosenSchedule() {
    if (!chosenSchedule) return;
    setScheduleId(chosenSchedule.schedule_id);
    setAssignmentStep(true);
  }

  function chooseAnotherSchedule() {
    setChosenSchedule(null);
    setScheduleId("");
    setAssignmentStep(false);
  }

  useEffect(() => {
    if (confirmState.result) {
      setShowAssignmentResult(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [confirmState.result]);

  useEffect(() => {
    function handleDispatcherBack(event: Event) {
      if (!chosenSchedule && !assignmentStep) return;

      const customEvent = event as CustomEvent<{ handled?: boolean }>;
      if (customEvent.detail) {
        customEvent.detail.handled = true;
      }

      if (assignmentStep) {
        setAssignmentStep(false);
        return;
      }

      setChosenSchedule(null);
      setScheduleId("");
    }

    window.addEventListener("movent:dispatcher-back", handleDispatcherBack);
    return () =>
      window.removeEventListener("movent:dispatcher-back", handleDispatcherBack);
  }, [assignmentStep, chosenSchedule]);
  useEffect(() => {
    if (!chosenSchedule || assignmentStep) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") chooseAnotherSchedule();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [chosenSchedule, assignmentStep]);

  return (
    <section className="dispatcher-task-screen">
      <div className="section-heading dispatcher-task-screen-heading">
        <div>
          <h2>{assignmentStep ? "Pilih Executor & Armada" : "Buat tugas baru"}</h2>
          <p>
            {assignmentStep
              ? "Jadwalnya udah aman, sekarang tinggal tentuin yang jalan."
              : "Pilih jadwal dulu, baru lanjut tentuin Executor dan Armada TGR."}
          </p>
        </div>
      </div>

      {!state.preview ? (
        assignmentStep && chosenSchedule ? (
          <form action={formAction} className="data-form task-create-form">
            <input type="hidden" name="taskType" value="Supply" />
            <input type="hidden" name="fleetOwnership" value="TGR" />
            <input type="hidden" name="scheduleId" value={scheduleId} />

            <div className="dispatcher-selected-schedule-preview">
              <div className="dispatcher-selected-schedule-preview-head">
                <div>
                  <small>Jadwal yang dipilih</small>
                  <strong>{chosenSchedule.schedule_id}</strong>
                </div>
                <button
                  type="button"
                  className="dispatcher-schedule-change-button"
                  onClick={chooseAnotherSchedule}
                >
                  Cari jadwal lain
                </button>
              </div>

              <div className="dispatcher-selected-schedule-preview-grid">
                <div>
                  <small>Start Point</small>
                  <strong>{chosenSchedule.start_point}</strong>
                </div>
                <div>
                  <small>Destination</small>
                  <strong>{chosenSchedule.destination}</strong>
                </div>
                <div>
                  <small>STD</small>
                  <strong>{timeLabel(chosenSchedule.std)}</strong>
                </div>
                <div>
                  <small>STA</small>
                  <strong>{timeLabel(chosenSchedule.sta)}</strong>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-row">
                <SearchableMasterSelect
                  label="Executor"
                  name="executorNik"
                  options={executorOptions}
                  placeholder="Pilih executor"
                  required
                />
                <SearchableMasterSelect
                  label="Armada TGR"
                  name="platNumber"
                  options={fleetOptions}
                  placeholder="Pilih armada TGR"
                  required
                />
              </div>
            </div>

            {state.error ? (
              <p className="form-error" role="alert">
                {state.error}
              </p>
            ) : null}

            {state.success ? (
              <p className="form-success" role="status">
                {state.success}
              </p>
            ) : null}

            <div className="form-actions">
              <button type="submit" disabled={pending}>
                {pending ? "Lagi nyiapin..." : "Lanjut cek tugas"}
              </button>
            </div>
          </form>
        ) : (
          <div className="dispatcher-schedule-step">
            <div className="dispatcher-schedule-picker">
              <div className="dispatcher-route-tabs" role="tablist" aria-label="Rute">
                {routes.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={route === item ? "active" : ""}
                    onClick={() => {
                      setRoute(item);
                      setChosenSchedule(null);
                      setScheduleId("");
                      setAssignmentStep(false);
                    }}
                    role="tab"
                    aria-selected={route === item}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="dispatcher-schedule-toolbar">
                <div className="dispatcher-schedule-search">
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari ID, Start Point, Destination, STD, atau STA..."
                    aria-label="Cari schedule"
                  />
                </div>
              </div>

              <div className="dispatcher-schedule-card-groups">
                {!groupedSchedules.length ? (
                  <div className="empty-state">
                    Jadwal yang kamu cari belum ketemu.
                  </div>
                ) : null}

                {groupedSchedules.map(([group, rows]) => {
                  const open = openGroups.has(group);

                  return (
                    <section
                      className={
                        "dispatcher-schedule-group" + (open ? " is-open" : "")
                      }
                      key={group}
                    >
                      <button
                        type="button"
                        className="dispatcher-schedule-group-head"
                        onClick={() => toggleGroup(group)}
                        aria-expanded={open}
                      >
                        <span>{group}</span>
                        <span className="dispatcher-schedule-group-meta">
                          {rows.length} jadwal
                          <b aria-hidden="true">{open ? "⌃" : "⌄"}</b>
                        </span>
                      </button>

                      {open ? (
                        <div className="dispatcher-schedule-card-list">
                          {rows.map((schedule) => (
                            <div
                              className="dispatcher-schedule-card"
                              key={schedule.schedule_id}
                            >
                              <div className="dispatcher-schedule-card-cell schedule-id">
                                <small>Schedule ID</small>
                                <strong>{schedule.schedule_id}</strong>
                              </div>
                              <div className="dispatcher-schedule-card-cell">
                                <small>Start Point</small>
                                <strong>{schedule.start_point}</strong>
                              </div>
                              <div className="dispatcher-schedule-card-cell">
                                <small>Destination</small>
                                <strong>{schedule.destination}</strong>
                              </div>
                              <div className="dispatcher-schedule-card-cell time">
                                <small>STD</small>
                                <strong>{timeLabel(schedule.std)}</strong>
                              </div>
                              <div className="dispatcher-schedule-card-cell time">
                                <small>STA</small>
                                <strong>{timeLabel(schedule.sta)}</strong>
                              </div>
                              <div className="dispatcher-schedule-card-action">
                                <button
                                  type="button"
                                  onClick={() => chooseSchedule(schedule)}
                                >
                                  Pilih
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="metric-card dispatcher-task-preview">
          <div className="card-title">Cek tugas dulu</div>
              <span>Schedule ID</span>
              <strong>{state.preview.scheduleId ?? "-"}</strong>
            </div>
            <div>
              <span>Start Point</span>
              <strong>{state.preview.startPoint}</strong>
            </div>
            <div>
              <span>Destination</span>
              <strong>{state.preview.destination}</strong>
            </div>
            <div>
              <span>STD</span>
              <strong>{timeLabel(state.preview.std ?? "")}</strong>
            </div>
            <div>
              <span>STA</span>
              <strong>{timeLabel(state.preview.sta ?? "")}</strong>
            </div>
            <div>
              <span>Executor</span>
              <strong>{state.preview.externalExecutor}</strong>
            </div>
            <div>
              <span>Armada</span>
              <strong>{state.preview.externalFleet}</strong>
            </div>
          </div>

          <p className="muted">Udah pas? Tinggal konfirmasi aktivitasnya.</p>

          <form action={confirmAction} className="compact-form">
            <input type="hidden" name="flow" value={state.preview.flow} />
            <input
              type="hidden"
              name="startPoint"
              value={state.preview.startPoint}
            />
            <input
              type="hidden"
              name="destination"
              value={state.preview.destination}
            />
            <input
              type="hidden"
              name="executorNik"
              value={state.preview.executorNik ?? ""}
            />
            <input
              type="hidden"
              name="platNumber"
              value={state.preview.platNumber ?? ""}
            />
            <input
              type="hidden"
              name="scheduleId"
              value={state.preview.scheduleId ?? ""}
            />
            <input type="hidden" name="std" value={state.preview.std ?? ""} />
            <input type="hidden" name="sta" value={state.preview.sta ?? ""} />

            {confirmState.error ? (
              <p className="form-error" role="alert">
                {confirmState.error}
              </p>
            ) : null}

            {confirmState.success ? (
              <p className="form-success" role="status">
                {confirmState.success}
              </p>
            ) : null}

            <div className="form-actions">
              <button type="submit" disabled={confirmPending}>
                {confirmPending ? "Lagi konfirmasi..." : "Konfirmasi aktivitas"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => window.location.reload()}
              >
                Ubah tugas
              </button>
            </div>
          </form>
        </div>
      )}


      {showAssignmentResult && confirmState.result ? (
        <div
          className="dispatcher-task-result-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setShowAssignmentResult(false);
            }
          }}
        >
          <section
            className="dispatcher-task-result-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dispatcher-task-result-title"
          >
            <div className="dispatcher-task-result-head">
              <div>
                <small>Penugasan berhasil</small>
                <strong id="dispatcher-task-result-title">
                  {confirmState.result.transactionId}
                </strong>
              </div>
              <button
                type="button"
                className="dispatcher-task-result-close"
                aria-label="Tutup hasil penugasan"
                onClick={() => setShowAssignmentResult(false)}
              >
                ×
              </button>
            </div>

            <div className="task-summary-grid dispatcher-task-result-grid">
              <div>
                <span>ID Aktivitas</span>
                <strong>{confirmState.result.transactionId}</strong>
              </div>
              <div>
                <span>Schedule ID</span>
                <strong>{confirmState.result.scheduleId}</strong>
              </div>
              <div>
                <span>Start Point</span>
                <strong>{confirmState.result.startPoint}</strong>
              </div>
              <div>
                <span>Destination</span>
                <strong>{confirmState.result.destination}</strong>
              </div>
              <div>
                <span>STD</span>
                <strong>{timeLabel(confirmState.result.std)}</strong>
              </div>
              <div>
                <span>STA</span>
                <strong>{timeLabel(confirmState.result.sta)}</strong>
              </div>
              <div>
                <span>Executor</span>
                <strong>{confirmState.result.executorName}</strong>
              </div>
              <div>
                <span>Armada</span>
                <strong>{confirmState.result.fleetPlate}</strong>
              </div>
            </div>

            <button
              type="button"
              className="dispatcher-share-whatsapp-button"
              onClick={() => {
                const r = confirmState.result;
                if (!r) return;
                const message = [
                  "Penugasan Movent",
                  `ID Aktivitas: ${r.transactionId}`,
                  `Schedule ID: ${r.scheduleId}`,
                  `Start Point: ${r.startPoint}`,
                  `Destination: ${r.destination}`,
                  `STD: ${timeLabel(r.std)}`,
                  `STA: ${timeLabel(r.sta)}`,
                  `Executor: ${r.executorName}`,
                  `Armada: ${r.fleetPlate}`,
                ].join("\n");
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(message)}`,
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            >
              Share ke WhatsApp
            </button>
          </section>
        </div>
      ) : null}

      {!state.preview && chosenSchedule && !assignmentStep ? (
        <div
          className="dispatcher-schedule-preview-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) chooseAnotherSchedule();
          }}
        >
          <section
            className="dispatcher-schedule-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dispatcher-schedule-preview-title"
          >
            <div className="dispatcher-schedule-preview-head">
              <div>
                <small>Preview jadwal</small>
                <strong id="dispatcher-schedule-preview-title">
                  {chosenSchedule.schedule_id}
                </strong>
              </div>
              <button
                type="button"
                className="dispatcher-schedule-preview-close"
                onClick={chooseAnotherSchedule}
                aria-label="Tutup preview jadwal"
              >
                ×
              </button>
            </div>

            <div className="dispatcher-schedule-preview-grid">
              <div>
                <small>Start Point</small>
                <strong>{chosenSchedule.start_point}</strong>
              </div>
              <div>
                <small>Destination</small>
                <strong>{chosenSchedule.destination}</strong>
              </div>
              <div>
                <small>STD</small>
                <strong>{timeLabel(chosenSchedule.std)}</strong>
              </div>
              <div>
                <small>STA</small>
                <strong>{timeLabel(chosenSchedule.sta)}</strong>
              </div>
            </div>

            <div className="dispatcher-schedule-preview-actions">
              <button type="button" onClick={useChosenSchedule}>
                Pilih jadwal ini
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={chooseAnotherSchedule}
              >
                Cari jadwal lain
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
