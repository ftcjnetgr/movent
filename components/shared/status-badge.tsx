"use client";

import {
  STATUS_LABELS,
  StatusIcon,
  statusClass,
} from "@/components/shared/status-config";

export default function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  return (
    <span className={`status-badge ${statusClass(status)}`}>
      <StatusIcon status={status} />
      <span>{label ?? STATUS_LABELS[status] ?? status}</span>
    </span>
  );
}
