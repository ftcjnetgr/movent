"use client";

import { useActionState, useState } from "react";
import { jsPDF } from "jspdf";
import SearchableMasterSelect from "@/components/shared/forms/searchable-master-select";
import StatusBadge from "@/components/shared/status-badge";
import { STATUS_LABELS } from "@/components/shared/status-config";
import {
  createTgrSupplyAction,
  confirmTgrDepartureByOperationAction,
  confirmTgrSupplyAction,
} from "@/app/operation/beranda/actions";

type Option = { value: string; label: string; searchText?: string };
type Preview = {
  transactionId: string;
  startPoint: string;
  destination: string;
  std: string;
  sta: string;
  externalExecutor: string;
  externalFleet: string;
  sjs: {
    sjNumber: string;
    sjQty: number;
    sjWeight: number;
    product: string;
    sjNote: string | null;
  }[];
};

type Task = {
  transaction_id: string;
  status: string;
  start_point: string | null;
  destination: string | null;
  std: string | null;
  sta: string | null;
  external_executor: string | null;
  external_fleet: string | null;
  sj_number: string | null;
  sj_qty: number | null;
  sj_weight: number | null;
  product: string | null;
  sj_note: string | null;
};

function timeValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
}

export default function OperationCreateTask({
  locations,
  products,
  tasks,
  executors,
  fleets,
}: {
  locations: string[];
  products: string[];
  tasks: Task[];
  executors: Array<{ executor_nik: string; full_name: string }>;
  fleets: Array<{ plat_number: string; fleet_type: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    createTgrSupplyAction,
    {},
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmTgrSupplyAction,
    {},
  );
  const [departureState, departureAction, departurePending] = useActionState(
    confirmTgrDepartureByOperationAction,
    {},
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [sjRows, setSjRows] = useState([0]);

  const locationOptions: Option[] = locations.map((value) => ({
    value,
    label: value,
    searchText: value,
  }));
  const executorOptions: Option[] = executors.map((item) => ({
    value: item.executor_nik,
    label: item.executor_nik + " - " + item.full_name,
    searchText: item.executor_nik + " " + item.full_name,
  }));
  const fleetOptions: Option[] = fleets.map((item) => ({
    value: item.plat_number,
    label: item.plat_number + " - " + item.fleet_type,
    searchText: item.plat_number + " " + item.fleet_type,
  }));
  function sharePreview() {
    if (!state.preview) return;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [210, 110],
    });
    doc.setFontSize(16);
    doc.text("SURAT JALAN", 10, 14);
    doc.setFontSize(10);
    doc.text("ID Transaksi: " + state.preview.transactionId, 10, 22);
    doc.text("Titik Mulai: " + state.preview.startPoint, 10, 30);
    doc.text("Destinasi: " + state.preview.destination, 10, 38);
    doc.text("STD: " + timeValue(state.preview.std), 10, 46);
    doc.text("STA: " + timeValue(state.preview.sta), 10, 54);
    doc.text("Executor: " + state.preview.externalExecutor, 10, 62);
    doc.text("Armada: " + state.preview.externalFleet, 10, 70);
    let y = 78;
    state.preview.sjs.forEach((sj, i) => {
      doc.text(
        "SJ " +
          (i + 1) +
          ": " +
          sj.sjNumber +
          " | Qty: " +
          sj.sjQty +
          " | Berat: " +
          sj.sjWeight +
          " | Produk: " +
          sj.product,
        10,
        y,
      );
      y += 7;
    });
    doc.save(state.preview.transactionId + "-SJ.pdf");

    const lines = [
      "MOVENT - Surat Jalan",
      "ID Transaksi: " + state.preview.transactionId,
      "Titik Mulai: " + state.preview.startPoint,
      "Destinasi: " + state.preview.destination,
      "STD: " + timeValue(state.preview.std),
      "STA: " + timeValue(state.preview.sta),
      "Executor: " + state.preview.externalExecutor,
      "Armada: " + state.preview.externalFleet,
      ...state.preview.sjs.flatMap((sj, i) => [
        "SJ " + (i + 1) + ": " + sj.sjNumber,
        "Qty: " + sj.sjQty,
        "Berat: " + sj.sjWeight,
        "Produk: " + sj.product,
        "Catatan: " + (sj.sjNote || "-"),
      ]),
    ];
    window.open(
      "https://wa.me/?text=" + encodeURIComponent(lines.join("\n")),
      "_blank",
      "noopener,noreferrer",
    );
  }

  const productOptions: Option[] = products.map((value) => ({
    value,
    label: value,
    searchText: value,
  }));

  return (
    <div className="section-grid two-column section-block">
      <section className="metric-card">
        <div className="card-title">Yuk, buat tugas baru</div>
        <p className="muted">
          Supply Armada TGR · isi data perjalanan dan Surat Jalan, lalu
          preview sebelum konfirmasi.
        </p>
        <form action={formAction} className="data-form compact-form">
          <div className="form-row">
            <SearchableMasterSelect
              label="Start Point"
              name="startPoint"
              options={locationOptions}
              placeholder="Pilih start point"
              required
            />
            <SearchableMasterSelect
              label="Destination"
              name="destination"
              options={locationOptions}
              placeholder="Pilih destination"
              required
            />
          </div>
          <div className="form-row">
            <label>
              STD
              <input type="time" name="std" required />
            </label>
            <label>
              STA
              <input type="time" name="sta" required />
            </label>
          </div>
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
          {sjRows.map((row) => (
            <div key={row} className="metric-card compact-form">
              <div className="card-title">SJ {row + 1}</div>
              <div className="form-row">
                <label>
                  Nomor SJ
                  <input name="sjNumber" required />
                </label>
                <label>
                  Qty SJ
                  <input
                    name="sjQty"
                    type="number"
                    min="0"
                    step="any"
                    required
                  />
                </label>
                <label>
                  Weight SJ
                  <input
                    name="sjWeight"
                    type="number"
                    min="0"
                    step="any"
                    required
                  />
                </label>
              </div>
              <SearchableMasterSelect
                label="Produk SJ"
                name="product"
                options={productOptions}
                placeholder="Pilih produk"
                required
              />
              <label>
                Catatan SJ
                <textarea name="sjNote" rows={3} />
              </label>
            </div>
          ))}
          <button
            type="button"
            className="secondary-button"
            onClick={() => setSjRows((rows) => [...rows, rows.length])}
          >
            Tambah SJ lagi
          </button>
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
          <button type="submit" disabled={pending}>
            {pending ? "Lagi siapin preview..." : "Siapkan SJ"}
          </button>
        </form>

        {state.preview ? (
          <div className="metric-card compact-form" style={{ marginTop: 16 }}>
            <div className="card-title">Cek penugasan & SJ</div>
            <div className="task-summary-grid">
              <div>
                <span>Rute</span>
                <strong>
                  {state.preview.startPoint} → {state.preview.destination}
                </strong>
              </div>
              <div>
                <span>STD</span>
                <strong>{timeValue(state.preview.std)}</strong>
              </div>
              <div>
                <span>STA</span>
                <strong>{timeValue(state.preview.sta)}</strong>
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
                <span>Jumlah SJ</span>
                <strong>{state.preview.sjs.length}</strong>
              </div>
            </div>
            <p className="muted">
              Cek data penugasan dan hasil SJ sebelum lanjut, ya.
            </p>
            <form action={confirmAction} className="compact-form">
              <input
                type="hidden"
                name="transactionId"
                value={state.preview.transactionId}
              />
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
                value={timeValue(state.preview.std)}
              />
              <input
                type="hidden"
                name="sta"
                value={timeValue(state.preview.sta)}
              />
              <input
                type="hidden"
                name="executorNik"
                value={state.preview.executorNik}
              />
              <input
                type="hidden"
                name="platNumber"
                value={state.preview.platNumber}
              />
              {state.preview.sjs.map((sj, index) => (
                <span key={index}>
                  <input type="hidden" name="sjNumber" value={sj.sjNumber} />
                  <input type="hidden" name="sjQty" value={sj.sjQty} />
                  <input type="hidden" name="sjWeight" value={sj.sjWeight} />
                  <input type="hidden" name="product" value={sj.product} />
                  <input type="hidden" name="sjNote" value={sj.sjNote ?? ""} />
                </span>
              ))}
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
              <div className="inline-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={sharePreview}
                >
                  Bagikan
                </button>
                <button type="submit" disabled={confirmPending}>
                  {confirmPending ? "Lagi konfirmasi..." : "Tugasnya udah oke?"}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </section>

      <section className="metric-card">
        <div className="card-title">Tugas siap jalan</div>
        <p className="muted">
          Pilih tugas yang siap jalan, lalu isi ATD-nya, ya.
        </p>
        {departureState.error ? (
          <p className="form-error" role="alert">
            {departureState.error}
          </p>
        ) : null}
        {departureState.success ? (
          <p className="form-success" role="status">
            {departureState.success}
          </p>
        ) : null}
        <div className="task-list">
          {tasks.map((task) => (
            <div className="task-card" key={task.transaction_id}>
              <div className="task-card-top">
                <div>
                  <span className="eyebrow">Supply TGR</span>
                  <h3>{task.transaction_id}</h3>
                </div>
                <StatusBadge status="Assigned" label={STATUS_LABELS.Assigned} />
              </div>
              <div className="task-summary-grid">
                <div>
                  <span>Rute Perjalanan</span>
                  <strong>
                    {task.start_point} → {task.destination}
                  </strong>
                </div>
                <div>
                  <span>STD</span>
                  <strong>{timeValue(task.std)}</strong>
                </div>
                <div>
                  <span>STA</span>
                  <strong>{timeValue(task.sta)}</strong>
                </div>
                <div>
                  <span>Executor</span>
                  <strong>{task.external_executor}</strong>
                </div>
                <div>
                  <span>Armada</span>
                  <strong>{task.external_fleet}</strong>
                </div>
                <div>
                  <span>Surat Jalan</span>
                  <strong>
                    {task.sj_number} · {task.product}
                  </strong>
                </div>
              </div>
              <form action={departureAction} className="data-form compact-form">
                <input
                  type="hidden"
                  name="transactionId"
                  value={task.transaction_id}
                />
                <label>
                  ATD
                  <input type="time" name="departure" required />
                </label>
                <button type="submit" disabled={departurePending}>
                  {departurePending ? "Lagi nyimpen..." : "Siap berangkat"}
                </button>
              </form>
            </div>
          ))}
          {tasks.length === 0 ? (
            <div className="empty-state">
              Belum ada Supply TGR yang nunggu berangkat.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
