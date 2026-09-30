"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createExtraScheduleAction,
  confirmExtraScheduleAction,
} from "@/app/operation/request-extra-schedule/actions";

type State = {
  error?: string;
  success?: string;
  preview?: {
    startPoint: string;
    destination: string;
    std: string;
    sta: string;
  };
  result?: {
    transactionId: string;
    startPoint: string;
    destination: string;
    std: string;
    sta: string;
  };
};

export default function OperationRequestExtraScheduleForm({
  locations,
}: {
  locations: string[];
}) {
  const [state, formAction, pending] = useActionState(
    createExtraScheduleAction,
    {} as State,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmExtraScheduleAction,
    {} as State,
  );
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (confirmState.result) setShowResult(true);
  }, [confirmState.result]);
  return (
    <div>
      <form action={formAction} className="data-form">
        <label>
          Titik Mulai
          <select name="startPoint" defaultValue="" required>
            <option value="">Pilih titik mulai</option>
            {locations.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Destinasi
          <select name="destination" defaultValue="" required>
            <option value="">Pilih destinasi</option>
            {locations.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <div className="form-row">
          <label>
            STD
            <input name="std" type="time" required />
          </label>
          <label>
            STA
            <input name="sta" type="time" required />
          </label>
        </div>
        {state.error ? (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        ) : null}
        <button type="submit" disabled={pending}>
          {pending ? "Lagi siapin preview..." : "Ajukan permintaan"}
        </button>
      </form>
      {state.preview ? (
        <div className="metric-card" style={{ marginTop: 16 }}>
          <h3>Cek permintaan dulu</h3>
          <div className="task-summary-grid">
            <div>
              <span>ID Tugas</span>
              <strong>Belum dibuat</strong>
            </div>
            <div>
              <span>Rute</span>
              <strong>
                {state.preview.startPoint} → {state.preview.destination}
              </strong>
            </div>
            <div>
              <span>STD</span>
              <strong>{state.preview.std.slice(11, 16)}</strong>
            </div>
            <div>
              <span>STA</span>
              <strong>{state.preview.sta.slice(11, 16)}</strong>
            </div>
          </div>
          <p className="muted">Cek dulu datanya sebelum kita kirim, ya.</p>
          <form action={confirmAction} className="compact-form">
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
              name="std"
              value={state.preview.std.slice(11, 16)}
            />
            <input
              type="hidden"
              name="sta"
              value={state.preview.sta.slice(11, 16)}
            />
            <div className="form-actions">
              <button type="submit" disabled={confirmPending}>
                {confirmPending ? "Lagi konfirmasi..." : "Kirim permintaan"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => window.location.reload()}
              >
                Mau ubah permintaan?
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {showResult && confirmState.result ? (
        <div className="operation-extra-result-backdrop" role="presentation">
          <section className="operation-extra-result-modal" role="dialog" aria-modal="true">
            <div className="operation-extra-result-head">
              <div>
                <small>Permintaan berhasil diajuin</small>
                <strong>{confirmState.result.transactionId}</strong>
              </div>
              <button type="button" onClick={() => setShowResult(false)} aria-label="Tutup">
                ×
              </button>
            </div>
            <div className="task-summary-grid operation-extra-result-grid">
              <div><span>ID Tugas</span><strong>{confirmState.result.transactionId}</strong></div>
              <div><span>Start Point</span><strong>{confirmState.result.startPoint}</strong></div>
              <div><span>Destination</span><strong>{confirmState.result.destination}</strong></div>
              <div><span>STD</span><strong>{confirmState.result.std.slice(11,16)}</strong></div>
              <div><span>STA</span><strong>{confirmState.result.sta.slice(11,16)}</strong></div>
            </div>
            <button
              type="button"
              className="operation-extra-share-button"
              onClick={() => {
                const r = confirmState.result;
                if (!r) return;
                const message = [
                  "MOVENT - Jadwal Tambahan",
                  "ID Tugas: " + r.transactionId,
                  "Start Point: " + r.startPoint,
                  "Destination: " + r.destination,
                  "STD: " + r.std.slice(11,16),
                  "STA: " + r.sta.slice(11,16),
                ].join("\n");
                window.open(
                  "https://wa.me/?text=" + encodeURIComponent(message),
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

    </div>
  );
}
