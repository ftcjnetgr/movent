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
  start_point: string;
  destination: string;
  std: string;
  sta: string;
  trip: number;
};

type Props = {
  locationGroups: Array<{ location: string; grouping: string | null }>;
  schedules: Schedule[];
  executors: Array<{ executor_nik: string; full_name: string }>;
  fleets: Array<{ plat_number: string; fleet_type: string }>;
};

type ViewMode = "start" | "destination";

function timeLabel(value: string) {
  const raw = value?.slice(0, 5);
  return raw || "-";
}

export default function DispatcherCreateTask({
  locationGroups,
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
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("start");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const selectedSchedule = schedules.find(
    (schedule) => schedule.schedule_id === scheduleId,
  );

  const locationGrouping = useMemo(
    () =>
      new Map(
        locationGroups.map((item) => [
          item.location,
          item.grouping?.trim() || "Lainnya",
        ]),
      ),
    [locationGroups],
  );

  const filteredSchedules = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return schedules;

    return schedules.filter((schedule) =>
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
  }, [query, schedules]);

  const groupedSchedules = useMemo(() => {
    const groups = new Map<string, Schedule[]>();

    for (const schedule of filteredSchedules) {
      const location =
        viewMode === "start" ? schedule.start_point : schedule.destination;
      const group = locationGrouping.get(location) ?? "Lainnya";
      const rows = groups.get(group) ?? [];
      rows.push(schedule);
      groups.set(group, rows);
    }

    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "id"),
    );
  }, [filteredSchedules, locationGrouping, viewMode]);

  useEffect(() => {
    if (!query.trim()) {
      setOpenGroups(new Set());
      return;
    }

    setOpenGroups(new Set(groupedSchedules.map(([group]) => group)));
  }, [groupedSchedules, query]);

  const scheduleOptions = schedules.map((schedule) => ({
    value: schedule.schedule_id,
    label:
      schedule.schedule_id +
      " • " +
      schedule.start_point +
      " → " +
      schedule.destination,
    searchText: [
      schedule.schedule_id,
      schedule.start_point,
      schedule.destination,
      schedule.std,
      schedule.sta,
    ].join(" "),
  }));

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

  function selectSchedule(schedule: Schedule) {
    setScheduleId(schedule.schedule_id);
  }

  useEffect(() => {
    if (confirmState.success) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [confirmState.success]);

  return (
    <section className="dispatcher-task-screen">
      <div className="section-heading dispatcher-task-screen-heading">
        <div>
          <h2>Buat tugas baru</h2>
          <p>Pilih schedule, lalu tentuin executor dan armada TGR.</p>
        </div>
      </div>

      {!state.preview ? (
        <form action={formAction} className="data-form task-create-form">
          <input type="hidden" name="taskType" value="Supply" />
          <input type="hidden" name="fleetOwnership" value="TGR" />
          <input type="hidden" name="scheduleId" value={scheduleId} />

          <div className="form-section dispatcher-schedule-picker">
            <div className="dispatcher-schedule-toolbar">
              <div className="dispatcher-schedule-search">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari ID, start point, destination, STD, atau STA..."
                  aria-label="Cari schedule"
                />
              </div>

              <div className="dispatcher-schedule-view-switch" role="tablist">
                <button
                  type="button"
                  className={viewMode === "start" ? "active" : ""}
                  onClick={() => setViewMode("start")}
                  role="tab"
                  aria-selected={viewMode === "start"}
                >
                  Start Point
                </button>
                <button
                  type="button"
                  className={viewMode === "destination" ? "active" : ""}
                  onClick={() => setViewMode("destination")}
                  role="tab"
                  aria-selected={viewMode === "destination"}
                >
                  Destination
                </button>
              </div>
            </div>

            <div className="dispatcher-schedule-table-wrap">
              <table className="dispatcher-schedule-table">
                <thead>
                  <tr>
                    <th>Schedule ID</th>
                    <th>Start Point</th>
                    <th>Destination</th>
                    <th>STD</th>
                    <th>STA</th>
                  </tr>
                </thead>
              </table>

              <div className="dispatcher-schedule-groups">
                {!groupedSchedules.length ? (
                  <div className="empty-state">
                    Schedule yang kamu cari belum ketemu.
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
                        <div className="dispatcher-schedule-group-table">
                          <table className="dispatcher-schedule-table">
                            <tbody>
                              {rows.map((schedule) => (
                                <tr
                                  key={schedule.schedule_id}
                                  className={
                                    schedule.schedule_id === scheduleId
                                      ? "selected"
                                      : ""
                                  }
                                  onClick={() => selectSchedule(schedule)}
                                  onKeyDown={(event) => {
                                    if (
                                      event.key === "Enter" ||
                                      event.key === " "
                                    ) {
                                      event.preventDefault();
                                      selectSchedule(schedule);
                                    }
                                  }}
                                  tabIndex={0}
                                  aria-selected={schedule.schedule_id === scheduleId}
                                  title="Pilih schedule ini"
                                >
                                  <td>{schedule.schedule_id}</td>
                                  <td>{schedule.start_point}</td>
                                  <td>{schedule.destination}</td>
                                  <td>{timeLabel(schedule.std)}</td>
                                  <td>{timeLabel(schedule.sta)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            </div>
          </div>

          {selectedSchedule ? (
            <>
              <div className="selected-schedule-summary">
                <div>
                  <span>Schedule</span>
                  <strong>{selectedSchedule.schedule_id}</strong>
                </div>
                <div>
                  <span>Start Point</span>
                  <strong>{selectedSchedule.start_point}</strong>
                </div>
                <div>
                  <span>Destination</span>
                  <strong>{selectedSchedule.destination}</strong>
                </div>
                <div>
                  <span>STD</span>
                  <strong>{timeLabel(selectedSchedule.std)}</strong>
                </div>
                <div>
                  <span>STA</span>
                  <strong>{timeLabel(selectedSchedule.sta)}</strong>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title">Penugasan</div>
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
            </>
          ) : (
            <p className="form-helper">
              Buka grup schedule, lalu pilih satu baris buat lanjut.
            </p>
          )}
        </form>
      ) : (
        <div className="metric-card dispatcher-task-preview">
          <div className="card-title">Cek tugas dulu</div>
          <div className="task-summary-grid">
            <div>
              <span>ID Transaksi</span>
              <strong>{state.preview.transactionId}</strong>
            </div>
            <div>
              <span>Rute</span>
              <strong>
                {state.preview.startPoint} → {state.preview.destination}
              </strong>
            </div>
            <div>
              <span>Executor</span>
              <strong>{state.preview.externalExecutor}</strong>
            </div>
            <div>
              <span>Armada</span>
              <strong>{state.preview.externalFleet}</strong>
            </div>
            <div>
              <span>Schedule</span>
              <strong>{state.preview.scheduleId ?? "-"}</strong>
            </div>
          </div>

          <p className="muted">Udah pas? Tinggal konfirmasi tugasnya.</p>

          <form action={confirmAction} className="compact-form">
            <input
              type="hidden"
              name="transactionId"
              value={state.preview.transactionId}
            />
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
                {confirmPending ? "Lagi konfirmasi..." : "Konfirmasi tugas"}
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
    </section>
  );
}
