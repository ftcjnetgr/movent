import { createAdminClient } from "@/lib/supabase/admin";

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: unknown;
  }>,
) {
  const pageSize = 1000;
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error;

    const batch = data ?? [];
    rows.push(...batch);

    if (batch.length < pageSize) break;
  }

  return rows;
}

export type ReportFilters = {
  type: "STD" | "STA" | "CANCELED";
  from: string;
  to: string;
  startPoint?: string;
  destination?: string;
  executorNik?: string;
};

function escapeCsv(value: unknown) {
  const raw = String(value ?? "");
  return `"${raw.replaceAll('"', '""')}"`;
}

function csvText(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsv(row[header])).join(","),
    ),
  ].join("\r\n");
}

function endExclusiveIso(date: string) {
  const end = new Date(`${date}T00:00:00+07:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  return end.toISOString();
}

function formatReportDateTime(value: string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

const operationalReportColumns = [
  "id",
  "transaction_id",
  "source_type",
  "task_type",
  "fleet_ownership",
  "status",
  "created_by",
  "requested_by",
  "assigned_by",
  "executor_nik",
  "executor_snapshot",
  "fleet_snapshot",
  "schedule_id",
  "schedule_snapshot",
  "start_point",
  "start_point_snapshot",
  "destination",
  "destination_snapshot",
  "std",
  "sta",
  "external_executor",
  "external_fleet",
  "sj_number",
  "sj_qty",
  "sj_weight",
  "product",
  "product_snapshot",
  "sj_note",
  "odometer_start",
  "odometer_end",
  "requested_at",
  "assigned_at",
  "accepted_at",
  "driving_at",
  "completed_at",
  "canceled_at",
  "canceled_from_status",
  "cancellation_note",
  "external_departure_at",
  "external_arrival_at",
  "created_at",
  "updated_at",
  "arrived_at",
] as const;

function reportCellValue(column: string, value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  if (
    (column === "std" ||
      column === "sta" ||
      column.endsWith("_at") ||
      column === "created_at" ||
      column === "updated_at") &&
    typeof value === "string"
  ) {
    return formatReportDateTime(value);
  }
  return String(value);
}

export async function queryOperationalReport(filters: ReportFilters) {
  const admin = createAdminClient();
  const dateField =
    filters.type === "STD"
      ? "std"
      : filters.type === "STA"
        ? "sta"
        : "canceled_at";
  const fromIso = filters.from + "T00:00:00+07:00";
  const toIso = endExclusiveIso(filters.to);

  const dateFilters = (query: ReturnType<typeof admin.from>) => {
    let next = query.gte(dateField, fromIso).lt(dateField, toIso);
    if (filters.startPoint) next = next.eq("start_point", filters.startPoint);
    if (filters.destination) next = next.eq("destination", filters.destination);
    if (filters.executorNik) next = next.eq("executor_nik", filters.executorNik);
    if (filters.type === "CANCELED") next = next.eq("status", "Canceled");
    return next.order(dateField, { ascending: true });
  };

  const data = await fetchAllRows<Record<string, unknown>>((from, to) =>
    dateFilters(
      admin.from("tasks").select("*"),
    ).range(from, to),
  );

  const rows = data.map(
    (task) => {
      const row: Record<string, string> = {};
      for (const column of operationalReportColumns) {
        row[column] = reportCellValue(column, task[column]);
      }
      return row;
    },
  );

  const csvRows = rows.map((row) =>
    Object.fromEntries(
      operationalReportColumns.map((column) => [column, row[column]]),
    ),
  );

  return { rows, csv: csvText(csvRows) };
}
