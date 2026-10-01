"use client";

import { useEffect, useState } from "react";
import { StatusIcon } from "@/components/shared/status-config";

export type DashboardPreviewItem = {
  scheduleId: string;
  status: string;
  startPoint: string | null;
  destination: string | null;
  executor: string | null;
  fleet: string | null;
  atd: string | null;
  ata: string | null;
  distance: number | null;
  drivingDurationMs: number | null;
};

type Props = {
  title: string;
  items: DashboardPreviewItem[];
  className?: string;
  iconStatus?: string;
  label: string;
  value: string | number;
  subtitle?: string;
  variant?: "kpi" | "activity";
  dotClass?: "blue" | "green" | "red";
};

function numberLabel(value: number | null) {
  return value === null ? "-" : new Intl.NumberFormat("id-ID").format(value);
}

function timeLabel(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

function durationLabel(value: number | null) {
  if (value === null) return "-";
  const totalMinutes = Math.floor(value / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} m`;
  return `${hours}j ${minutes}m`;
}

function valueLabel(value: string | number) {
  return typeof value === "number"
    ? new Intl.NumberFormat("id-ID").format(value)
    : value;
}

export default function DashboardPreviewButton({
  title,
  items,
  className,
  iconStatus,
  label,
  value,
  subtitle,
  variant = "kpi",
  dotClass = "blue",
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const buttonClass =
    variant === "activity"
      ? "dashboard-preview-activity-row"
      : `dashboard-preview-kpi ${className ?? ""}`.trim();

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        onClick={() => setOpen(true)}
        title={title}
      >
        {variant === "activity" ? (
          <>
            <span className={`activity-dot ${dotClass}`} />
            <span>{label}</span>
            <strong>{valueLabel(value)}</strong>
          </>
        ) : (
          <>
            <span className="super-kpi-icon">
              <StatusIcon status={iconStatus ?? "Requested"} size={20} />
            </span>
            <span className="super-kpi-content">
              <span>{label}</span>
              <strong>{valueLabel(value)}</strong>
              {subtitle ? <small>{subtitle}</small> : null}
            </span>
          </>
        )}
      </button>

      {open ? (
        <div
          className="dashboard-preview-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
        >
          <section
            className="dashboard-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-preview-title"
          >
            <div className="dashboard-preview-head">
              <div>
                <small>Preview jadwal</small>
                <strong id="dashboard-preview-title">{title}</strong>
              </div>
              <button
                type="button"
                className="dashboard-preview-close"
                onClick={() => setOpen(false)}
                aria-label="Tutup preview jadwal"
              >
                ×
              </button>
            </div>

            <div className="dashboard-preview-table-wrap">
              <table className="dashboard-preview-table">
                <thead>
                  <tr>
                    <th>Schedule ID</th>
                    <th>Status</th>
                    <th>Start Point</th>
                    <th>Destination</th>
                    <th>Executor</th>
                    <th>Armada</th>
                    <th>ATD</th>
                    <th>ATA</th>
                    <th>Jarak Tempuh</th>
                    <th>Durasi Mengemudi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.scheduleId + "-" + index}>
                      <td><strong>{item.scheduleId}</strong></td>
                      <td>{item.status}</td>
                      <td>{item.startPoint ?? "-"}</td>
                      <td>{item.destination ?? "-"}</td>
                      <td>{item.executor ?? "-"}</td>
                      <td>{item.fleet ?? "-"}</td>
                      <td>{timeLabel(item.atd)}</td>
                      <td>{timeLabel(item.ata)}</td>
                      <td>{item.distance === null ? "-" : numberLabel(item.distance) + " km"}</td>
                      <td>{durationLabel(item.drivingDurationMs)}</td>
                    </tr>
                  ))}
                  {!items.length ? (
                    <tr>
                      <td colSpan={10} className="dashboard-preview-empty">
                        Belum ada data di sini.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
