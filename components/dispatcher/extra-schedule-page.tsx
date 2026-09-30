"use client";

import { useEffect, useMemo, useState } from "react";
import SearchableMasterSelect from "@/components/shared/forms/searchable-master-select";
import {
  confirmExtraScheduleAssignmentAction,
  confirmExtraScheduleRequestAction,
  previewExtraScheduleAssignmentAction,
} from "@/app/dispatcher/extra-schedule/actions";

type Row = {
  transaction_id: string;
  start_point: string;
  destination: string;
  std: string | null;
  sta: string | null;
  created_at: string | null;
};
type Preview = {
  transactionId: string;
  executorNik: string;
  executorName: string;
  platNumber: string;
  fleetType: string;
};

export default function DispatcherExtraSchedulePage() {
  const [data, setData] = useState<{
    requests: Row[];
    confirmed: Row[];
    executors: Array<{ executor_nik: string; full_name: string }>;
    fleets: Array<{ plat_number: string; fleet_type: string }>;
  }>({ requests: [], confirmed: [], executors: [], fleets: [] });
  const [selectedExecutor, setSelectedExecutor] = useState<
    Record<string, string>
  >({});
  const [selectedFleet, setSelectedFleet] = useState<Record<string, string>>(
    {},
  );
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [activeTab, setActiveTab] = useState<"requests" | "confirmed">("requests");
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  const executorOptions = useMemo(
    () =>
      data.executors.map((item) => ({
        value: item.executor_nik,
        label: item.executor_nik + " - " + item.full_name,
        searchText: item.executor_nik + " " + item.full_name,
      })),
    [data.executors],
  );
  const fleetOptions = useMemo(
    () =>
      data.fleets.map((item) => ({
        value: item.plat_number,
        label: item.plat_number + " - " + item.fleet_type,
        searchText: item.plat_number + " " + item.fleet_type,
      })),
    [data.fleets],
  );

  async function reload() {
    const res = await fetch("/api/dispatcher/extra-schedule");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function confirm(transactionId: string) {
    setFeedback((current) => ({
      ...current,
      [transactionId]: "Lagi konfirmasi...",
    }));
    const formData = new FormData();
    formData.set("transactionId", transactionId);
    const result = await confirmExtraScheduleRequestAction(formData);
    setFeedback((current) => ({
      ...current,
      [transactionId]: result.success ?? result.error ?? "",
    }));
    if (result.success) reload();
  }

  async function previewAssignment(transactionId: string) {
    const executorNik = selectedExecutor[transactionId];
    const platNumber = selectedFleet[transactionId];
    if (!executorNik || !platNumber) {
      setFeedback((current) => ({
        ...current,
        [transactionId]: "Pilih executor dan armadanya dulu, ya.",
      }));
      return;
    }
    setFeedback((current) => ({
      ...current,
      [transactionId]: "Menyiapkan preview...",
    }));
    const formData = new FormData();
    formData.set("transactionId", transactionId);
    formData.set("executorNik", executorNik);
    formData.set("platNumber", platNumber);
    const result = await previewExtraScheduleAssignmentAction(formData);
    if (result.preview) {
      setPreview(result.preview);
      setFeedback((current) => ({ ...current, [transactionId]: "" }));
    } else {
      setFeedback((current) => ({
        ...current,
        [transactionId]: result.error ?? "",
      }));
    }
  }

  async function confirmAssignment() {
    if (!preview) return;
    const formData = new FormData();
    formData.set("transactionId", preview.transactionId);
    formData.set("executorNik", preview.executorNik);
    formData.set("platNumber", preview.platNumber);
    const result = await confirmExtraScheduleAssignmentAction(formData);
    setFeedback((current) => ({
      ...current,
      [preview.transactionId]: result.success ?? result.error ?? "",
    }));
    if (result.success) {
      setPreview(null);
      reload();
    }
  }

  function time(value: string | null) {
    return value
      ? new Date(value).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
        })
      : "-";
  }

  return (
    <div>
      <div className="page-heading">
        <h1>Jadwal Tambahan</h1>
        <p>Terima permintaannya dulu, lalu pilih executor dan armadanya, ya.</p>
      </div>

      {preview ? (
        <section className="metric-card section-block">
          <div className="card-title">Preview Penugasan</div>
          <div className="task-summary-grid">
            <div>
              <span>ID Aktivitas</span>
              <strong>{preview.transactionId}</strong>
            </div>
            <div>
              <span>Executor</span>
              <strong>
                {preview.executorNik} - {preview.executorName}
              </strong>
            </div>
            <div>
              <span>Armada</span>
              <strong>
                {preview.platNumber} - {preview.fleetType}
              </strong>
            </div>
          </div>
          <div className="inline-actions">
            <button type="button" onClick={confirmAssignment}>
              Konfirmasi Penugasan
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setPreview(null)}
            >
              Ubah Penugasan
            </button>
          </div>
        </section>
      ) : null}

      <div className="extra-schedule-tabs" role="tablist" aria-label="Status Jadwal Tambahan">
        <button type="button" role="tab" aria-selected={activeTab === "requests"} className={activeTab === "requests" ? "is-active" : ""} onClick={() => setActiveTab("requests")}><span>Terima Extra</span><small>{data.requests.length} request</small></button>
        <button type="button" role="tab" aria-selected={activeTab === "confirmed"} className={activeTab === "confirmed" ? "is-active" : ""} onClick={() => setActiveTab("confirmed")}><span>Siap Ditugaskan</span><small>{data.confirmed.length} aktivitas</small></button>
      </div>
      {activeTab === "requests" ? (
      <section className="data-table-card section-block extra-schedule-panel">
        <div className="section-heading">
          <div>
            <h2>Ada permintaan baru</h2>
            <p>Terima request dari Operation dulu, baru kita atur penugasannya.</p>
          </div>
        </div>
        {loading ? (
          <div className="empty-state">Lagi cek request...</div>
        ) : null}
        {!loading && data.requests.length === 0 ? (
          <div className="empty-state">Belum ada request baru di sini.</div>
        ) : null}
        {!loading && data.requests.length > 0 ? (
          <>
          <div className="extra-schedule-cards">
            {data.requests.map((row) => (
              <article key={row.transaction_id} className="extra-schedule-card" onClick={() => setSelectedRow(row)}>
                <div className="extra-schedule-card-route"><div><span>Start Point</span><strong>{row.start_point}</strong></div><b>→</b><div><span>Destination</span><strong>{row.destination}</strong></div></div>
                <div className="extra-schedule-card-meta"><span>STD <strong>{time(row.std)}</strong></span><span>STA <strong>{time(row.sta)}</strong></span><button type="button" onClick={(event) => { event.stopPropagation(); confirm(row.transaction_id); }}>Terima Extra</button></div>
              </article>
            ))}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Rute</th>
                  <th>STD</th>
                  <th>STA</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.requests.map((row) => (
                  <tr key={row.transaction_id}>
                    <td>
                      <strong>{row.transaction_id}</strong>
                    </td>
                    <td>
                      {row.start_point} → {row.destination}
                    </td>
                    <td>{time(row.std)}</td>
                    <td>{time(row.sta)}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => confirm(row.transaction_id)}
                      >
                        Terima permintaan
                      </button>
                      {feedback[row.transaction_id] ? (
                        <div className="inline-feedback">
                          {feedback[row.transaction_id]}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : null}
      </section>
      ) : null}

      {activeTab === "confirmed" ? (
      <section className="data-table-card section-block extra-schedule-panel">
        <div className="section-heading">
          <div>
            <h2>Siap ditugasin</h2>
            <p>
              Request yang udah diterima dan tinggal dipilihkan pelaksana
              serta armada.
            </p>
          </div>
        </div>
        {data.confirmed.length === 0 ? (
          <div className="empty-state">
            Belum ada request yang siap ditugasin.
          </div>
        ) : (
          <>
          <div className="extra-schedule-cards">
            {data.confirmed.map((row) => (
              <article key={row.transaction_id} className="extra-schedule-card" onClick={() => setSelectedRow(row)}>
                <div className="extra-schedule-card-route"><div><span>Start Point</span><strong>{row.start_point}</strong></div><b>→</b><div><span>Destination</span><strong>{row.destination}</strong></div></div>
                <div className="extra-schedule-card-meta"><span>STD <strong>{time(row.std)}</strong></span><span>STA <strong>{time(row.sta)}</strong></span><span className="extra-schedule-ready">Siap Ditugaskan</span></div>
              </article>
            ))}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Rute</th>
                  <th>STD</th>
                  <th>STA</th>
                  <th>Executor</th>
                  <th>Armada</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.confirmed.map((row) => (
                  <tr key={row.transaction_id}>
                    <td>
                      <strong>{row.transaction_id}</strong>
                    </td>
                    <td>
                      {row.start_point} → {row.destination}
                    </td>
                    <td>{time(row.std)}</td>
                    <td>{time(row.sta)}</td>
                    <td>
                      <SearchableMasterSelect
                        label="Executor"
                        name={"executor-" + row.transaction_id}
                        options={executorOptions}
                        placeholder="Pilih executor"
                        value={selectedExecutor[row.transaction_id] ?? ""}
                        onValueChange={(value) =>
                          setSelectedExecutor((current) => ({
                            ...current,
                            [row.transaction_id]: value,
                          }))
                        }
                      />
                    </td>
                    <td>
                      <SearchableMasterSelect
                        label="Armada"
                        name={"fleet-" + row.transaction_id}
                        options={fleetOptions}
                        placeholder="Pilih armada"
                        value={selectedFleet[row.transaction_id] ?? ""}
                        onValueChange={(value) =>
                          setSelectedFleet((current) => ({
                            ...current,
                            [row.transaction_id]: value,
                          }))
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => previewAssignment(row.transaction_id)}
                      >
                        Pratinjau Tugas
                      </button>
                      {feedback[row.transaction_id] ? (
                        <div className="inline-feedback">
                          {feedback[row.transaction_id]}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
      ) : null}

      {selectedRow ? (
        <div className="extra-schedule-modal-backdrop" onClick={() => setSelectedRow(null)}>
          <div className="extra-schedule-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="extra-schedule-modal-header"><div><span>Detail Jadwal Tambahan</span><h2>{selectedRow.transaction_id}</h2></div><button type="button" onClick={() => setSelectedRow(null)} aria-label="Tutup">×</button></div>
            <div className="extra-schedule-modal-grid">
              <div><span>Start Point</span><strong>{selectedRow.start_point}</strong></div><div><span>Destination</span><strong>{selectedRow.destination}</strong></div><div><span>STD</span><strong>{time(selectedRow.std)}</strong></div><div><span>STA</span><strong>{time(selectedRow.sta)}</strong></div><div><span>Status</span><strong>{activeTab === "requests" ? "Terima Extra" : "Siap Ditugaskan"}</strong></div><div><span>Dibuat</span><strong>{selectedRow.created_at ? new Date(selectedRow.created_at).toLocaleDateString("id-ID") : "-"}</strong></div>
            </div>
            {activeTab === "requests" ? <button type="button" className="extra-schedule-modal-primary" onClick={() => { confirm(selectedRow.transaction_id); setSelectedRow(null); }}>Terima Extra</button> : (
              <div className="extra-schedule-modal-assignment">
                <SearchableMasterSelect label="Executor" name={"modal-executor-" + selectedRow.transaction_id} options={executorOptions} placeholder="Pilih executor" value={selectedExecutor[selectedRow.transaction_id] ?? ""} onValueChange={(value) => setSelectedExecutor((current) => ({ ...current, [selectedRow.transaction_id]: value }))} />
                <SearchableMasterSelect label="Armada" name={"modal-fleet-" + selectedRow.transaction_id} options={fleetOptions} placeholder="Pilih armada" value={selectedFleet[selectedRow.transaction_id] ?? ""} onValueChange={(value) => setSelectedFleet((current) => ({ ...current, [selectedRow.transaction_id]: value }))} />
                <button type="button" className="extra-schedule-modal-primary" onClick={() => { previewAssignment(selectedRow.transaction_id); setSelectedRow(null); }}>Pratinjau Tugas</button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
