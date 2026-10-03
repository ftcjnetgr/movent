"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";
import * as XLSX from "sheetjs_xlsx";

type Result = { error?: string; success?: string };

const configs = {
  schedules: {
    identifier: "schedule_id",
    columns: [
      "schedule_id",
      "trip",
      "schedule_hub_id",
      "route",
      "category",
      "start_point",
      "start_point_type",
      "destination",
      "destination_type",
      "schedule_day",
      "schedule_day_name",
      "aging",
      "std",
      "sta",
      "status",
      "schedule_area",
    ],
  },
  executors: {
    identifier: "executor_nik",
    columns: ["executor_nik", "full_name", "phone_number", "level", "area", "status"],
  },
  fleets: {
    identifier: "plat_number",
    columns: ["plat_number", "fleet_code", "fleet_type", "fleet_status", "status"],
  },
  locations: {
    identifier: "location",
    columns: ["location", "grouping", "lattitude", "longitude", "status"],
  },
  products: {
    identifier: "product_code",
    columns: ["product_code", "product_detail", "status"],
  },
  maintenance_lists: {
    identifier: "maintenance_list",
    columns: ["maintenance_code", "maintenance_list", "aging", "status"],
  },
  tasks: {
    identifier: "transaction_id",
    columns: [
      "id","transaction_id","source_type","task_type","fleet_ownership","status",
      "created_by","requested_by","assigned_by","executor_nik","executor_snapshot",
      "fleet_snapshot","schedule_id","schedule_snapshot","start_point",
      "start_point_snapshot","destination","destination_snapshot","std","sta",
      "external_executor","external_fleet","sj_number","sj_qty","sj_weight",
      "product","product_snapshot","sj_note","odometer_start","odometer_end",
      "requested_at","assigned_at","accepted_at","driving_at","completed_at",
      "canceled_at","canceled_from_status","cancellation_note",
      "external_departure_at","external_arrival_at","created_at","updated_at","arrived_at",
    ],
  },
  ticketings: {
    identifier: "transaction_id",
    columns: [
      "id","transaction_id","status","created_by","maintainer_user_id",
      "maintenance_list","maintenance_snapshot","fleet_plat_number","fleet_snapshot",
      "location","location_snapshot","created_at","accepted_at","in_progress_at",
      "completed_at","canceled_at","canceled_from_status","cancellation_note",
      "updated_at","maintenance_pic","requested_at",
    ],
  },
  task_sj_items: {
    identifier: "id",
    columns: [
      "id","task_id","sj_number","sj_qty","sj_weight","product",
      "product_snapshot","note","created_at","updated_at",
    ],
  },
  user_profiles: {
    identifier: "username",
    columns: [
      "id","auth_user_id","username","email","full_name","phone_number","role",
      "status","must_change_password","failed_login_attempts","locked_at",
      "created_at","updated_at","hub","area","department",
    ],
  },
} as const;

type DatabaseKey = keyof typeof configs;

function getConfig(value: string) {
  return value in configs ? configs[value as DatabaseKey] : null;
}

async function requireSuperUser() {
  const profile = await getCurrentProfile();
  if (profile.role !== "Super User") throw new Error("Akses tidak tersedia.");
}

function valueForColumn(formData: FormData, column: string) {
  const value = formData.get("field__" + column);
  if (value === null) return undefined;
  const text = String(value).trim();
  if (text === "") return null;
  return text;
}

async function saveMasterRow(
  formData: FormData,
  mode: "insert" | "update",
): Promise<Result> {
  try {
    await requireSuperUser();
  } catch {
    return { error: "Akses tidak tersedia." };
  }

  const db = String(formData.get("database") ?? "").trim();
  const config = getConfig(db);
  if (!config) return { error: "Database-nya nggak tersedia." };

  const payload: Record<string, unknown> = {};
  for (const column of config.columns) {
    const value = valueForColumn(formData, column);
    if (value !== undefined) payload[column] = value;
  }

  if (!payload[config.identifier]) return { error: "Identifier perlu diisi dulu, ya." };

  const admin = createAdminClient();
  if (mode === "insert") {
    payload.status = "Active";
    const { error } = await admin.from(db).insert(payload);
    if (error) return { error: "Data belum berhasil ditambahkan. Coba lagi, ya." };
  } else {
    const identifier = String(formData.get("identifier") ?? "").trim();
    if (!identifier) return { error: "Identifier-nya nggak ditemukan." };
    delete payload[config.identifier];
    const { error } = await admin
      .from(db)
      .update(payload)
      .eq(config.identifier, identifier);
    if (error) return { error: "Data belum berhasil diperbarui. Coba lagi, ya." };
  }

  revalidatePath("/super-user/pengelolaan-database");
  return {
    success:
      mode === "insert"
        ? "Data berhasil ditambahkan."
        : "Data berhasil diperbarui.",
  };
}

export async function addMasterRowAction(formData: FormData) {
  return saveMasterRow(formData, "insert");
}

export async function updateMasterRowAction(formData: FormData) {
  return saveMasterRow(formData, "update");
}

export async function deleteMasterRowAction(
  formData: FormData,
): Promise<Result> {
  try {
    await requireSuperUser();
  } catch {
    return { error: "Akses tidak tersedia." };
  }

  const db = String(formData.get("database") ?? "").trim();
  const config = getConfig(db);
  if (!config) return { error: "Database-nya nggak tersedia." };

  const identifier = String(formData.get("identifier") ?? "").trim();
  if (!identifier) return { error: "Identifier-nya nggak ditemukan." };

  const admin = createAdminClient();
  const { error } = await admin
    .from(db)
    .delete()
    .eq(config.identifier, identifier);
  if (error) return { error: "Data belum berhasil dihapus. Coba lagi, ya." };

  revalidatePath("/super-user/pengelolaan-database");
  return { success: "Data sudah dihapus." };
}

function normalizeImportedRows(
  input: unknown[],
  config: { columns: readonly string[] },
) {
  return input
    .map((row) => {
      const source = row as Record<string, unknown>;
      const clean: Record<string, unknown> = {};
      for (const column of config.columns) {
        if (Object.prototype.hasOwnProperty.call(source, column)) {
          const value = source[column];
          clean[column] = value === "" || value === undefined ? null : value;
        }
      }
      return clean;
    })
    .filter((row) => Object.keys(row).length > 0);
}

export async function importMasterDatabaseAction(
  formData: FormData,
): Promise<Result> {
  try {
    await requireSuperUser();
  } catch {
    return { error: "Akses tidak tersedia." };
  }

  const db = String(formData.get("database") ?? "").trim();
  const config = getConfig(db);
  if (!config) return { error: "Database-nya nggak tersedia." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { error: "Pilih file CSV atau XLSX dulu, ya." };

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: unknown[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(firstSheet, { defval: null });
  } catch {
    return { error: "File-nya belum bisa dibaca. Pastikan formatnya CSV atau XLSX, ya." };
  }

  const normalized = normalizeImportedRows(rows, config);
  if (!normalized.length)
    return { error: "File-nya belum punya data yang bisa diimpor." };

  if (!normalized.every((row) => row[config.identifier])) {
    return { error: "Setiap baris perlu punya identifier, ya." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from(db)
    .upsert(normalized, { onConflict: config.identifier });
  if (error) return { error: "Import belum berhasil diproses. Coba lagi, ya." };

  revalidatePath("/super-user/pengelolaan-database");
  return { success: normalized.length + " data berhasil diimpor." };
}
