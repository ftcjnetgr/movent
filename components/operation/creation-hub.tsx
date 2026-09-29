"use client";

import { useState } from "react";
import OperationCreateTask from "@/components/operation/create-task";
import OperationRequestExtraScheduleForm from "@/components/operation/request-extra-schedule-form";

export default function OperationCreationHub({
  locations,
  products,
  tasks,
}: {
  locations: string[];
  products: string[];
  tasks: Array<{
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
  }>;
}) {
  const [choice, setChoice] = useState<"supply" | "schedule" | null>(null);

  if (!choice) {
    return (
      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Yuk, mulai proses baru</h2>
            <p>
              Pilih dulu proses yang mau dibuat. Setelah itu baru isi detailnya.
            </p>
          </div>
        </div>
        <div className="creation-choice-grid">
          <button
            type="button"
            className="creation-choice-card"
            onClick={() => setChoice("supply")}
          >
            <span className="creation-choice-icon">SP</span>
            <span>
              <strong>Buat Supply Non-TGR</strong>
              <small>Lengkapi detail perjalanan dan surat jalan, ya.</small>
            </span>
            <b>→</b>
          </button>
          <button
            type="button"
            className="creation-choice-card"
            onClick={() => setChoice("schedule")}
          >
            <span className="creation-choice-icon">JS</span>
            <span>
              <strong>Ajukan Jadwal Tambahan</strong>
              <small>Nanti kita terusin ke Dispatcher, ya.</small>
            </span>
            <b>→</b>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="section-block">
      <div className="creation-flow-toolbar">
        <div>
          <strong>
            {choice === "supply" ? "Supply Non-TGR" : "Ajukan Jadwal Tambahan"}
          </strong>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setChoice(null)}
        >
          Ganti proses
        </button>
      </div>

      {choice === "supply" ? (
        <OperationCreateTask
          locations={locations}
          products={products}
          tasks={tasks}
        />
      ) : (
        <div className="metric-card operation-request-card">
          <p className="muted">
            Isi titik mulai, destinasi, STD, dan STA. Setelah dicek,
            request masuk ke Dispatcher.
          </p>
          <OperationRequestExtraScheduleForm locations={locations} />
        </div>
      )}
    </section>
  );
}
