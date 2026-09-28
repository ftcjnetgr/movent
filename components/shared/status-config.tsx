export type StatusName =
  | "Requested"
  | "Assigned"
  | "Confirmed"
  | "Driving"
  | "Ready"
  | "In Progress"
  | "Completed"
  | "Canceled"
  | string;

export type StatusIconSize = number;

export const STATUS_ORDER: Record<string, number> = {
  Requested: 0,
  Assigned: 1,
  Confirmed: 2,
  Ready: 3,
  Driving: 4,
  "In Progress": 6,
  Completed: 7,
  Canceled: 8,
};

export function compareStatus(a: string, b: string) {
  return (STATUS_ORDER[a] ?? 999) - (STATUS_ORDER[b] ?? 999);
}

export const STATUS_LABELS: Record<string, string> = {
  Requested: "Udah Diajukan",
  Assigned: "Udah Ditugasin",
  Confirmed: "Udah Diterima",
  Ready: "Siap Jalan",
  Driving: "Lagi Jalan",
  "In Progress": "Lagi Dikerjain",
  Completed: "Udah Selesai",
  Canceled: "Dibatalin",
};

export function StatusIcon({
  status,
  size = 13,
}: {
  status: StatusName;
  size?: StatusIconSize;
}) {
  const common = {
    width: size,
    height: size,
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
          <path d="M9 4V2h6v2M9 11h6M9 15h4" />
        </svg>
      );
    case "Confirmed":
      return (
        <svg {...common}>
          <path d="m12 3 7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
          <path d="m8.5 11.5 2.25 2.25L15.5 9" />
        </svg>
      );
    case "Ready":
      return (
        <svg {...common}>
          <path d="M5 19h14M6 16h12l-2-7H8l-2 7Z" />
          <path d="M9 12h6M8 16h8" />
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

export function statusClass(status: string) {
  return `status-${status.toLowerCase().replaceAll(" ", "-")}`;
}
