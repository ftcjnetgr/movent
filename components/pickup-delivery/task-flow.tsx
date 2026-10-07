"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import {
  checkInPickupDeliveryStopAction,
  completePickupDeliveryAssignmentAction,
  startPickupDeliveryAssignmentAction,
  startPickupDeliveryTripAction,
} from "@/lib/server/pickup-delivery-actions";

type Stop = {
  id: string;
  sequence_no: number;
  location: string;
  status: "Pending" | "Checked In";
  checkin_at: string | null;
};

type Task = {
  id: string;
  transaction_id: string;
  status: string;
  fleet_snapshot: { plat_number?: string } | null;
};

export default function PickupDeliveryTaskFlow({
  role,
  activeTask,
  stops,
}: {
  role: "Pickup" | "Delivery";
  activeTask: Task | null;
  stops: Stop[];
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [stopCount, setStopCount] = useState(1);

  function submit(
    action: (formData: FormData) => Promise<{ error?: string; success?: string }>,
    form: HTMLFormElement,
  ) {
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await action(formData);
      setMessage(result.success ?? result.error ?? "");
      if (result.success) window.location.reload();
    });
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(startPickupDeliveryAssignmentAction, event.currentTarget);
  }

  function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(startPickupDeliveryTripAction, event.currentTarget);
  }

  function handleCheckIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(checkInPickupDeliveryStopAction, event.currentTarget);
  }

  function handleComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(completePickupDeliveryAssignmentAction, event.currentTarget);
  }

  const stopInputs = useMemo(() => Array.from({ length: stopCount }, (_, index) => index + 1), [stopCount]);
  const currentStop = stops.find((stop) => stop.status === "Pending") ?? null;
  const allChecked = stops.length > 0 && stops.every((stop) => stop.status === "Checked In");

  if (!activeTask) {
    return (
      <div className="role-page">
        <div className="page-heading">
          <div>
            <h1>{role}</h1>
            <p>Isi armada dan semua titik, lalu mulai tugas.</p>
          </div>
        </div>

        <section className="section-block">
          <div className="metric-card">
            <h2>Mulai Tugas</h2>
            <form onSubmit={handleCreate} className="data-form">
              <label>
                Nomor Plat Armada
                <input name="platNumber" placeholder="Contoh: B 1234 XYZ" required />
              </label>

              <label>
                Total Titik Tugas
                <input
                  name="stopCount"
                  type="number"
                  min="1"
                  max="100"
                  value={stopCount}
                  onChange={(event) => setStopCount(Math.min(100, Math.max(1, Number(event.target.value) || 1)))}
                  required
                />
              </label>

              <div className="data-form">
                {stopInputs.map((number) => (
                  <label key={number}>
                    Titik Tugas {number}
                    <input name="stops" placeholder={`Titik tugas ${number}`} required />
                  </label>
                ))}
              </div>

              <button type="submit" disabled={isPending}>
                Mulai Tugas
              </button>
            </form>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="role-page">
      <div className="page-heading">
        <div>
          <h1>{role}</h1>
          <p>Ikuti titik satu per satu sampai selesai, lalu perjalanan pulang.</p>
        </div>
      </div>

      <section className="section-block">
        <div className="metric-grid">
          <div className="metric-card"><span>ID Aktivitas</span><strong>{activeTask.transaction_id}</strong></div>
          <div className="metric-card"><span>Armada</span><strong>{activeTask.fleet_snapshot?.plat_number ?? "-"}</strong></div>
          <div className="metric-card"><span>Total Titik</span><strong>{stops.length}</strong></div>
          <div className="metric-card"><span>Selesai</span><strong>{stops.filter((stop) => stop.status === "Checked In").length}</strong></div>
        </div>
      </section>

      <section className="section-block">
        <div className="metric-card">
          <h2>Urutan Titik</h2>
          {stops.map((stop) => (
            <div className="task-summary-grid" key={stop.id}>
              <div><span>Titik</span><strong>{stop.sequence_no}</strong></div>
              <div><span>Lokasi</span><strong>{stop.location}</strong></div>
              <div><span>Status</span><strong>{stop.status === "Checked In" ? "Sudah Check-in" : "Belum Check-in"}</strong></div>
            </div>
          ))}
        </div>
      </section>

      {activeTask.status === "Confirmed" ? (
        <section className="section-block">
          <div className="metric-card">
            <h2>Siap Berangkat</h2>
            <p>Semua titik sudah tersimpan. Berangkat ke titik pertama.</p>
            <form onSubmit={handleStart}>
              <input type="hidden" name="transactionId" value={activeTask.transaction_id} />
              <button type="submit" disabled={isPending}>Mulai Perjalanan</button>
            </form>
          </div>
        </section>
      ) : null}

      {activeTask.status === "Driving" && !allChecked ? (
        <section className="section-block">
          <div className="metric-card">
            <h2>Titik Berikutnya</h2>
            <p>
              {currentStop
                ? `Menuju titik ${currentStop.sequence_no}: ${currentStop.location}`
                : "Semua titik sudah selesai."}
            </p>
            {currentStop ? (
              <form onSubmit={handleCheckIn}>
                <input type="hidden" name="transactionId" value={activeTask.transaction_id} />
                <input type="hidden" name="stopId" value={currentStop.id} />
                <button type="submit" disabled={isPending}>Check-in Titik {currentStop.sequence_no}</button>
              </form>
            ) : null}
          </div>
        </section>
      ) : null}

      {activeTask.status === "Driving" && allChecked ? (
        <section className="section-block">
          <div className="metric-card">
            <h2>Perjalanan Pulang</h2>
            <p>Semua titik sudah selesai. Sekarang menuju pulang.</p>
            <form onSubmit={handleComplete}>
              <input type="hidden" name="transactionId" value={activeTask.transaction_id} />
              <button type="submit" disabled={isPending}>Konfirmasi Tugas Selesai</button>
            </form>
          </div>
        </section>
      ) : null}

      {message ? <div className="inline-feedback">{message}</div> : null}
    </div>
  );
}
