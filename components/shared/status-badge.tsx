"use client";

type StatusName =
  | "Requested"
  | "Assigned"
  | "Confirmed"
  | "Driving"
  | "In Progress"
  | "Completed"
  | "Canceled"
  | string;

function StatusIcon({ status }: { status: StatusName }) {
  const common = {
    width: 13,
    height: 13,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (status) {
    case "Requested":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "Assigned":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path d="M9 4V2h6v2M9 11l2 2 4-4" />
        </svg>
      );
    case "Confirmed":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.5 2.5L16 9" />
        </svg>
      );
    case "Driving":
      return (
        <svg {...common}>
          <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      );
    case "In Progress":
      return (
        <svg {...common}>
          <path d="M14 6a4 4 0 0 1-5 5L4 16l4 4 5-5a4 4 0 0 1 5-5l-4-4Z" />
        </svg>
      );
    case "Completed":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.5 2.5L16 9" />
        </svg>
      );
    case "Canceled":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m9 9 6 6M15 9l-6 6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

const STATUS_LABELS: Record<string, string> = {
  Requested: "Diajukan",
  Assigned: "Ditugaskan",
  Confirmed: "Dikonfirmasi",
  Driving: "Sedang berjalan",
  "In Progress": "Sedang dikerjakan",
  Completed: "Selesai",
  Canceled: "Dibatalkan",
};

export default function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const className = `status-badge status-${status.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <span className={className}>
      <StatusIcon status={status} />
      <span>{label ?? STATUS_LABELS[status] ?? status}</span>
    </span>
  );
}
