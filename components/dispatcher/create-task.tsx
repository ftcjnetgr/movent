"use client";

import { useActionState, useEffect, useState } from "react";
import type { State as DispatcherTaskState } from "@/app/dispatcher/beranda/actions";
import SearchableMasterSelect from "@/components/shared/forms/searchable-master-select";
import {
  createDispatcherTaskAction,
  confirmDispatcherTaskAction,
} from "@/app/dispatcher/beranda/actions";

const initialState: DispatcherTaskState = {};

type Props = {
  schedules: Array<{
    schedule_id: string;
    route: string;
    category: string;
    start_point: string;
    destination: string;
    std: string;
    sta: string;
    trip: number;
  }>;
  executors: Array<{ executor_nik: string; full_name: string }>;
  fleets: Array<{ plat_number: string; fleet_type: string }>;
};

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

  const selectedSchedule = schedules.find(
    (schedule) => schedule.schedule_id === scheduleId,
  );

  const scheduleOptions = schedules.map((schedule) => ({
    value: schedule.schedule_id,
    label:
      schedule.schedule_id +
      " • Trip " +
      schedule.trip +
      " • " +
      schedule.start_point +
      " → " +
      schedule.destination +
      " • " +
      schedule.std.slice(0, 5),
    searchText: [
      schedule.schedule_id,
      schedule.route,
      schedule.category,
      schedule.start_point,
      schedule.destination,
      String(schedule.trip),
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

  useEffect(() => {
    if (confirmState.success) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [confirmState.success]);

  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Yuk, atur tugas baru</h2>
          <p>Pilih schedule, executor, dan armada TGR-nya langsung di sini.</p>
        </div>
      </div>

      {!state.preview ? (
        <form action={formAction} className="data-form task-create-form">
          <input type="hidden" name="taskType" value="Supply" />
          <input type="hidden" name="fleetOwnership" value="TGR" />

          <div className="form-section">
            <div className="form-section-title">Jadwal</div>
            <SearchableMasterSelect
              label="Schedule"
              name="scheduleId"
              options={scheduleOptions}
              placeholder="Pilih schedule"
              value={scheduleId}
              onValueChange={setScheduleId}
              required
            />
          </div>

          {selectedSchedule ? (
            <>
              <div className="selected-schedule-summary">
                <div>
                  <span>Jadwal</span>
                  <strong>{selectedSchedule.schedule_id}</strong>
                </div>
                <div>
                  <span>Trip</span>
                  <strong>{selectedSchedule.trip}</strong>
                </div>
                <div>
                  <span>Rute</span>
                  <strong>
                    {selectedSchedule.start_point} → {selectedSchedule.destination}
                  </strong>
                </div>
                <div>
                  <span>STD</span>
                  <strong>{selectedSchedule.std.slice(0, 5)}</strong>
                </div>
                <div>
                  <span>STA</span>
                  <strong>{selectedSchedule.sta.slice(0, 5)}</strong>
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

              {state.error ? <p className="form-error">{state.error}</p> : null}
              {state.success ? (
                <p className="form-success">{state.success}</p>
              ) : null}

              <div className="form-actions">
                <button type="submit" disabled={pending}>
                  {pending ? "Lagi nyiapin..." : "Lanjut cek tugas"}
                </button>
              </div>
            </>
          ) : (
            <p className="form-helper">
              Pilih schedule dulu, nanti detail rute dan waktunya langsung muncul.
            </p>
          )}
        </form>
      ) : (
        <div className="metric-card">
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
            <input type="hidden" name="startPoint" value={state.preview.startPoint} />
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
              <p className="form-error">{confirmState.error}</p>
            ) : null}
            {confirmState.success ? (
              <p className="form-success">{confirmState.success}</p>
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
