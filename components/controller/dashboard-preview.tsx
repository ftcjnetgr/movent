"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { StatusIcon } from "@/components/shared/status-config";

export type DashboardPreviewItem = {
  scheduleId: string;
  status: string;
  startPoint: string | null;
  destination: string | null;
  executor: string | null;
  fleet: string | null;
  fleetType: string | null;
  fleetStatus: string | null;
  atd: string | null;
  ata: string | null;
  std: string | null;
  sta: string | null;
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
  mode?: "schedule" | "maintenance";
  timeMode?: "actual" | "planned";
  displayStatus?: string;
  compactSchedulePreview?: boolean;
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

function scheduleDurationLabel(std: string | null, sta: string | null) {
  if (!std || !sta) return "-";
  const minutes = Math.max(0, Math.round((new Date(sta).getTime() - new Date(std).getTime()) / 60000));
  return String(minutes) + " menit";
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

function previewStatusLabel(status: string, mode: "schedule" | "maintenance") {
  if (mode === "maintenance") {
    const labels: Record<string, string> = {
      "Udah Diajuin": "Belum Diterima",
      Requested: "Belum Diterima",
      Confirmed: "Udah Diterima",
      "In Progress": "Lagi Dikerjain",
      Completed: "Udah Selesai",
      Canceled: "Dibatalin",
    };
    return labels[status] ?? status;
  }

  const labels: Record<string, string> = {
    Unassigned: "Belum Ditugasin",
    Assigned: "Udah Ditugasin",
    Confirmed: "Udah Diterima",
    Driving: "Lagi Jalan",
    Completed: "Udah Selesai",
    Canceled: "Dibatalin",
  };
  return labels[status] ?? status;
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
  mode = "schedule",
  timeMode = "actual",
  displayStatus,
  compactSchedulePreview = false,
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
            <span className="activity-meta">
              <span>total</span>
              <span>rasio</span>
            </span>
            <span className="activity-values">
              <span>{valueLabel(value)}</span>
              <span>{subtitle ?? "0%"}</span>
            </span>
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

      {open
        ? createPortal(
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
                  {mode === "maintenance" ? (
                    <tr>
                      <th>ID Perbaikan</th>
                      <th>Status</th>
                      <th>Jenis Perbaikan</th>
                      <th>Armada</th>
                      <th>Tipe Armada</th>
                      <th>Status Armada</th>
                      <th>Lokasi</th>
                      <th>Dibuat</th>
                      <th>Selesai</th>
                      <th>Durasi</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Schedule ID</th>
                      <th>Status</th>
                      <th>Start Point</th>
                      <th>Destination</th>
                      {!compactSchedulePreview ? <th>Executor</th> : null}
                      {!compactSchedulePreview ? <th>Armada</th> : null}
                      <th>{timeMode === "planned" ? "STD" : "ATD"}</th>
                      <th>{timeMode === "planned" ? "STA" : "ATA"}</th>
                      {!compactSchedulePreview ? <th>Jarak Tempuh</th> : null}
                      <th>{compactSchedulePreview ? "Durasi Schedule" : "Durasi Mengemudi"}</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.scheduleId + "-" + index}>
                      <td><strong>{item.scheduleId}</strong></td>
                      <td>{displayStatus ?? previewStatusLabel(item.status, mode)}</td>
                      {mode === "maintenance" ? (
                        <>
                          <td>{item.startPoint ?? "-"}</td>
                          <td>{item.fleet ?? "-"}</td>
                          <td>{item.fleetType ?? "-"}</td>
                          <td>{item.fleetStatus ?? "-"}</td>
                          <td>{item.destination ?? "-"}</td>
                          <td>{timeLabel(item.atd)}</td>
                          <td>{timeLabel(item.ata)}</td>
                          <td>{durationLabel(item.drivingDurationMs)}</td>
                        </>
                      ) : (
                        <>
                          <td>{item.startPoint ?? "-"}</td>
                          <td>{item.destination ?? "-"}</td>
                          {!compactSchedulePreview ? <td>{item.executor ?? "-"}</td> : null}
                          {!compactSchedulePreview ? <td>{item.fleet ?? "-"}</td> : null}
                          <td>{timeLabel(timeMode === "planned" ? item.std : item.atd)}</td>
                          <td>{timeLabel(timeMode === "planned" ? item.sta : item.ata)}</td>
                          {!compactSchedulePreview ? <td>{item.distance === null ? "-" : numberLabel(item.distance) + " km"}</td> : null}
                          <td>{compactSchedulePreview ? scheduleDurationLabel(item.std, item.sta) : durationLabel(item.drivingDurationMs)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  {!items.length ? (
                    <tr>
                      <td colSpan={mode === "maintenance" ? 10 : compactSchedulePreview ? 7 : 12} className="dashboard-preview-empty">
                        Belum ada data di sini.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>,
        document.body
      )
        : null}
    </>
  );
}
