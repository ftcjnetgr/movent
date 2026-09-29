"use client";

import { useEffect, useState } from "react";
import { STATUS_LABELS } from "@/components/shared/status-config";

type TaskRow = {
  transaction_id: string;
  task_type: string | null;
  source_type: string | null;
  status: string;
  fleet_ownership: string | null;
  start_point: string | null;
  destination: string | null;
  executor_snapshot:
    | { full_name?: string; executor_nik?: string }
    | null;
  fleet_snapshot:
    | { plat_number?: string; fleet_type?: string }
    | null;
  external_executor: string | null;
  external_fleet: string | null;
};

type TicketRow = {
  transaction_id: string;
  status: string;
  location: string | null;
  fleet_plat_number: string | null;
};

type Props = {
  tasks: TaskRow[];
  tickets: TicketRow[];
  statusCounts: {
    total: number;
    assigned: number;
    confirmed: number;
    driving: number;
    completed: number;
    canceled: number;
  };
  ticketCount: number;
};

type Preview =
  | { title: string; kind: "task"; rows: TaskRow[] }
  | { title: string; kind: "ticket"; rows: TicketRow[] };

const statusItems = [
  ["Semua Tugas", "all", "total"],
  ["Udah Ditugasin", "Assigned", "assigned"],
  ["Udah Diterima", "Confirmed", "confirmed"],
  ["Lagi Jalan", "Driving", "driving"],
  ["Udah Selesai", "Completed", "completed"],
  ["Dibatalin", "Canceled", "canceled"],
] as const;

export default function DispatcherSummaryInteractive({
  tasks,
  tickets,
  statusCounts,
  ticketCount,
}: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    if (!preview) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPreview(null);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [preview]);

  const supplyTgr = tasks.filter(
    (task) =>
      task.task_type === "Supply" && task.fleet_ownership === "TGR",
  );
  const supplyNonTgr = tasks.filter(
    (task) =>
      task.task_type === "Supply" && task.fleet_ownership === "Non-TGR",
  );
  const distribusi = tasks.filter(
    (task) => task.task_type === "Distribusi Mobil",
  );
  const extraSchedule = tasks.filter(
    (task) => task.source_type === "Extra Schedule",
  );

  function openTaskPreview(title: string, rows: TaskRow[]) {
    setPreview({ title, kind: "task", rows });
  }

  function openTicketPreview() {
    setPreview({
      title: "Perbaikan",
      kind: "ticket",
      rows: tickets,
    });
  }

  function taskStatusRows(status: string) {
    if (status === "all") return tasks;
    return tasks.filter((task) => task.status === status);
  }

  return (
    <>
      <section className="data-table-card dispatcher-status-card">
        <div className="section-heading">
          <div>
            <h2>Status Penugasan</h2>
            <p>Semua penugasan yang bisa kamu pantau.</p>
          </div>
        </div>

        {statusItems.map(([label, status, countKey]) => {
          const count = statusCounts[countKey];
          const rows = taskStatusRows(status);

          return (
            <div className="summary-bar-row" key={label}>
              <span>{label}</span>
              <button
                type="button"
                className="dispatcher-summary-count-button"
                onClick={() => openTaskPreview(label, rows)}
                aria-label={"Lihat preview " + label}
              >
                {count}
              </button>
              <i>
                <b
                  style={{
                    width:
                      statusCounts.total > 0
                        ? String(
                            Math.min(
                              100,
                              (Number(count) / statusCounts.total) * 100,
                            ),
                          ) + "%"
                        : "0%",
                  }}
                />
              </i>
            </div>
          );
        })}
      </section>

      <section className="data-table-card dispatcher-ringkasan-card">
        <div className="section-heading">
          <div>
            <h2>Ringkasan</h2>
            <p>Biar gampang lihat prosesnya.</p>
          </div>
        </div>

        {[
          ["Supply (TGR)", supplyTgr.length, supplyTgr, "task"],
          ["Supply (Non TGR)", supplyNonTgr.length, supplyNonTgr, "task"],
          ["Distribusi", distribusi.length, distribusi, "task"],
          ["Perbaikan", ticketCount, tickets, "ticket"],
          ["Jadwal Tambahan", extraSchedule.length, extraSchedule, "task"],
        ].map(([label, count, rows, kind]) => (
          <div className="summary-bar-row" key={String(label)}>
            <span>{String(label)}</span>
            <button
              type="button"
              className="dispatcher-summary-count-button"
              onClick={() =>
                kind === "ticket"
                  ? openTicketPreview()
                  : openTaskPreview(String(label), rows as TaskRow[])
              }
              aria-label={"Lihat preview " + String(label)}
            >
              {Number(count)}
            </button>
            <i>
              <b
                style={{
                  width:
                    String(
                      Math.min(
                        100,
                        Number(count) > 0
                          ? Math.max(8, Number(count) * 8)
                          : 0,
                      ),
                    ) + "%",
                }}
              />
            </i>
          </div>
        ))}
      </section>

      {preview ? (
        <div
          className="dispatcher-preview-backdrop"
          role="presentation"
          onClick={() => setPreview(null)}
        >
          <section
            className="dispatcher-preview-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dispatcher-preview-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dispatcher-preview-head">
              <div>
                <h3 id="dispatcher-preview-title">
                  Preview {preview.title}
                </h3>
                <p>
                  {preview.rows.length
                    ? String(preview.rows.length) + " data"
                    : "Belum ada data"}
                </p>
              </div>
              <button
                type="button"
                className="secondary-button dispatcher-preview-close"
                onClick={() => setPreview(null)}
                aria-label="Tutup preview"
              >
                Tutup
              </button>
            </div>

            {preview.kind === "task" ? (
              <div className="dispatcher-preview-list">
                {preview.rows.map((task, index) => (
                  <article
                    className="dispatcher-preview-item"
                    key={task.transaction_id ?? String(index)}
                  >
                    <div>
                      <span>Start Point</span>
                      <strong>{task.start_point ?? "-"}</strong>
                    </div>
                    <div>
                      <span>Destination</span>
                      <strong>{task.destination ?? "-"}</strong>
                    </div>
                    <div>
                      <span>Executor</span>
                      <strong>
                        {task.executor_snapshot?.full_name ??
                          task.external_executor ??
                          "-"}
                      </strong>
                    </div>
                    <div>
                      <span>Armada</span>
                      <strong>
                        {task.fleet_snapshot?.plat_number ??
                          task.external_fleet ??
                          task.fleet_ownership ??
                          "-"}
                      </strong>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dispatcher-preview-list">
                {preview.rows.map((ticket, index) => (
                  <article
                    className="dispatcher-preview-item"
                    key={ticket.transaction_id ?? String(index)}
                  >
                    <div>
                      <span>Plat Nomor</span>
                      <strong>{ticket.fleet_plat_number ?? "-"}</strong>
                    </div>
                    <div>
                      <span>Lokasi</span>
                      <strong>{ticket.location ?? "-"}</strong>
                    </div>
                    <div>
                      <span>Status</span>
                      <strong>
                        {STATUS_LABELS[ticket.status] ?? ticket.status}
                      </strong>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {!preview.rows.length ? (
              <div className="empty-state dispatcher-preview-empty">
                Belum ada data buat ditampilkan.
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
