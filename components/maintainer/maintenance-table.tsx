"use client";

import { useMemo, useState, useTransition } from "react";
import StatusBadge from "@/components/shared/status-badge";
import { STATUS_LABELS } from "@/components/shared/status-config";
import {
  acceptMaintenanceTicketAction,
  completeMaintenanceAction,
  startMaintenanceAction,
} from "@/app/maintainer/tiket-maintenance/actions";

type Ticket = {
  transaction_id: string;
  status: string;
  maintenance_list: string | null;
  location: string | null;
  fleet_plat_number: string | null;
  created_at: string;
  maintainer_user_id: string | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export default function MaintainerMaintenanceTable({
  tickets,
}: {
  tickets: Ticket[];
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [picFor, setPicFor] = useState<string | null>(null);
  const [message, setMessage] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const visibleTickets = useMemo(
    () =>
      statusFilter === "all"
        ? tickets
        : tickets.filter((ticket) => ticket.status === statusFilter),
    [tickets, statusFilter],
  );

  function runAction(
    transactionId: string,
    action: (
      formData: FormData,
    ) => Promise<{ error?: string; success?: string }>,
    formData?: FormData,
  ) {
    const next = formData ?? new FormData();
    next.set("transactionId", transactionId);
    setMessage((current) => ({
      ...current,
      [transactionId]: "Lagi diproses...",
    }));
    startTransition(async () => {
      const result = await action(next);
      setMessage((current) => ({
        ...current,
        [transactionId]: result.success ?? result.error ?? "",
      }));
      if (result.success) window.location.reload();
    });
  }

  return (
    <section className="data-table-card maintainer-maintenance-table-card">
      <div className="section-heading maintainer-maintenance-toolbar">
        <div>
          <h2>Perbaikan</h2>
          <p>Tinggal lanjutin sesuai statusnya, ya.</p>
        </div>
        <label className="maintainer-status-filter">
          <span>Lihat status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Semua</option>
            <option value="Requested">{STATUS_LABELS.Requested}</option>
            <option value="Confirmed">{STATUS_LABELS.Confirmed}</option>
            <option value="In Progress">{STATUS_LABELS["In Progress"]}</option>
            <option value="Completed">{STATUS_LABELS.Completed}</option>
            <option value="Canceled">{STATUS_LABELS.Canceled}</option>
          </select>
        </label>
      </div>

      <div className="table-wrap">
        <table className="maintainer-maintenance-table">
          <thead>
            <tr>
              <th>ID transaksi</th>
              <th>Perbaikan</th>
              <th>Lokasi</th>
              <th>Armada</th>
              <th>Status</th>
              <th>Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {visibleTickets.map((ticket) => (
              <tr key={ticket.transaction_id}>
                <td>
                  <strong>{ticket.transaction_id}</strong>
                </td>
                <td>{ticket.maintenance_list ?? "-"}</td>
                <td>{ticket.location ?? "-"}</td>
                <td>{ticket.fleet_plat_number ?? "-"}</td>
                <td>
                  <StatusBadge
                    status={ticket.status}
                    label={STATUS_LABELS[ticket.status] ?? ticket.status}
                  />
                </td>
                <td>{formatDate(ticket.created_at)}</td>
                <td>
                  {ticket.status === "Requested" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        runAction(
                          ticket.transaction_id,
                          acceptMaintenanceTicketAction,
                        )
                      }
                    >
                      Terima perbaikan
                    </button>
                  ) : null}

                  {ticket.status === "Confirmed" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        runAction(ticket.transaction_id, startMaintenanceAction)
                      }
                    >
                      Mulai kerjain
                    </button>
                  ) : null}

                  {ticket.status === "In Progress" ? (
                    picFor === ticket.transaction_id ? (
                      <form
                        className="maintainer-complete-inline"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const formData = new FormData(event.currentTarget);
                          runAction(
                            ticket.transaction_id,
                            completeMaintenanceAction,
                            formData,
                          );
                        }}
                      >
                        <input
                          name="picMaintenance"
                          required
                          placeholder="Nama PIC"
                        />
                        <button type="submit" disabled={pending}>
                          Selesaikan
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setPicFor(null)}
                        >
                          Batal
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setPicFor(ticket.transaction_id)}
                      >
                        Selesaikan perbaikan
                      </button>
                    )
                  ) : null}

                  {ticket.status === "Completed" ||
                  ticket.status === "Canceled" ? (
                    <span className="muted">Nggak ada yang perlu dilakukan</span>
                  ) : null}

                  {message[ticket.transaction_id] ? (
                    <div className="inline-feedback">
                      {message[ticket.transaction_id]}
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}

            {visibleTickets.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    Nggak ada perbaikan untuk pilihan ini.
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
