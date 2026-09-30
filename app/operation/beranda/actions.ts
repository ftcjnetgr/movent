"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/server/profile";
import { createAdminClient } from "@/lib/supabase/admin";

type Preview = {
  startPoint: string;
  destination: string;
  std: string;
  sta: string;
  externalExecutor: string;
  externalFleet: string;
  executorNik: string;
  platNumber: string;
  sjs: {
    sjNumber: string;
    sjQty: number;
    sjWeight: number;
    product: string;
    productSnapshot: { product: string; status: string };
    sjNote: string | null;
  }[];
};

type State = {
  error?: string;
  success?: string;
  transactionId?: string;
  preview?: Preview;
  result?: {
    transactionId: string;
    startPoint: string;
    destination: string;
    std: string;
    sta: string;
    externalExecutor: string;
    externalFleet: string;
    sjs: Preview["sjs"];
  };
};

function jakartaTimestamp(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return `${date}T${value}:00+07:00`;
}

async function activeExecutorAndFleet(
  admin: ReturnType<typeof createAdminClient>,
  executorNik: string,
  platNumber: string,
) {
  const [{ data: executor }, { data: fleet }] = await Promise.all([
    admin
      .from("executors")
      .select("executor_nik, full_name, status")
      .eq("executor_nik", executorNik)
      .eq("status", "Active")
      .maybeSingle(),
    admin
      .from("fleets")
      .select("plat_number, fleet_type, status")
      .eq("plat_number", platNumber)
      .eq("status", "Active")
      .maybeSingle(),
  ]);
  return { executor, fleet };
}

async function validateTgrInput(formData: FormData) {
  const startPoint = String(formData.get("startPoint") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  const std = String(formData.get("std") ?? "").trim();
  const sta = String(formData.get("sta") ?? "").trim();
  const executorNik = String(formData.get("executorNik") ?? "").trim();
  const platNumber = String(formData.get("platNumber") ?? "").trim();
  const sjNumbers = formData
    .getAll("sjNumber")
    .map(String)
    .map((v) => v.trim());
  const sjQtys = formData.getAll("sjQty").map((v) => Number(v));
  const sjWeights = formData.getAll("sjWeight").map((v) => Number(v));
  const products = formData
    .getAll("product")
    .map(String)
    .map((v) => v.trim());
  const sjNotes = formData
    .getAll("sjNote")
    .map(String)
    .map((v) => v.trim());

  if (
    !startPoint ||
    !destination ||
    !std ||
    !sta ||
    !executorNik ||
    !platNumber ||
    !sjNumbers.length
  ) {
    return {
      error:
        "Data perjalanan, Executor, Armada TGR, dan minimal satu SJ perlu diisi lengkap dulu, ya.",
    } as const;
  }

  if (
    sjNumbers.length !== sjQtys.length ||
    sjNumbers.length !== sjWeights.length ||
    sjNumbers.length !== products.length
  ) {
    return { error: "Data setiap SJ belum lengkap. Cek lagi, ya." } as const;
  }

  const stdTimestamp = jakartaTimestamp(std);
  const staTimestamp = jakartaTimestamp(sta);
  if (!stdTimestamp || !staTimestamp)
    return { error: "Format STD atau STA belum benar. Cek lagi, ya." } as const;
  if (new Date(staTimestamp).getTime() <= new Date(stdTimestamp).getTime())
    return { error: "STA harus lebih besar dari STD." } as const;

  const admin = createAdminClient();
  const [
    { data: startLocation },
    { data: destinationLocation },
    { executor, fleet },
  ] = await Promise.all([
    admin
      .from("locations")
      .select("location, grouping, status")
      .eq("location", startPoint)
      .eq("status", "Active")
      .maybeSingle(),
    admin
      .from("locations")
      .select("location, grouping, status")
      .eq("location", destination)
      .eq("status", "Active")
      .maybeSingle(),
    activeExecutorAndFleet(admin, executorNik, platNumber),
  ]);

  if (!startLocation || !destinationLocation) {
    return {
      error:
        "Start point dan destinasi harus dipilih dari lokasi yang aktif, ya.",
    } as const;
  }

  if (!executor || !fleet) {
    return { error: "Executor atau Armada TGR yang dipilih belum aktif, ya." } as const;
  }

  const sjs: Preview["sjs"] = [];
  for (let i = 0; i < sjNumbers.length; i++) {
    if (
      !sjNumbers[i] ||
      !products[i] ||
      !Number.isFinite(sjQtys[i]) ||
      sjQtys[i] < 0 ||
      !Number.isFinite(sjWeights[i]) ||
      sjWeights[i] < 0
    ) {
      return {
        error: "Nomor SJ, Qty, berat, dan produk perlu diisi di setiap SJ, ya.",
      } as const;
    }

    const { data: productData } = await admin
      .from("products")
      .select("product, status")
      .eq("product", products[i])
      .eq("status", "Active")
      .maybeSingle();

    if (!productData)
      return { error: `Produk pada SJ ke-${i + 1} belum tersedia.` } as const;

    sjs.push({
      sjNumber: sjNumbers[i],
      sjQty: sjQtys[i],
      sjWeight: sjWeights[i],
      product: products[i],
      productSnapshot: productData,
      sjNote: sjNotes[i] || null,
    });
  }

  return {
    value: {
      startPoint,
      destination,
      std: stdTimestamp,
      sta: staTimestamp,
      externalExecutor: executor.full_name,
      externalFleet: `${fleet.plat_number} · ${fleet.fleet_type}`,
      executorNik: executor.executor_nik,
      platNumber: fleet.plat_number,
      sjs,
    } satisfies Preview,
    snapshots: { startLocation, destinationLocation, executor, fleet },
  };
}

export async function createTgrSupplyAction(
  _state: State,
  formData: FormData,
): Promise<State> {
  const profile = await getCurrentProfile();
  if (!["Operation", "Super User"].includes(profile.role))
    return { error: "Kamu belum punya akses ke bagian ini." };

  const validated = await validateTgrInput(formData);
  if ("error" in validated) return validated;

  return {
    success:
      "SJ sudah masuk. Cek preview penugasan dan hasil SJ sebelum lanjut, ya.",
    preview: validated.value,
  };
}

export async function confirmTgrSupplyAction(
  _state: State,
  formData: FormData,
): Promise<State> {
  const profile = await getCurrentProfile();
  if (!["Operation", "Super User"].includes(profile.role))
    return { error: "Kamu belum punya akses ke bagian ini." };

  const validated = await validateTgrInput(formData);
  if ("error" in validated) return validated;

  const { snapshots, value } = validated;
  const admin = createAdminClient();
  const { data: transactionId, error: transactionError } = await admin.rpc(
    "movent_next_transaction_id",
  );
  if (transactionError || !transactionId) {
    return { error: "ID tugas belum berhasil dibuat. Coba lagi, ya." };
  }
  const { error } = await admin.from("tasks").insert({
    transaction_id: transactionId,
    source_type: "Manual",
    task_type: "Supply",
    fleet_ownership: "TGR",
    status: "Assigned",
    created_by: profile.id,
    assigned_by: profile.id,
    executor_nik: value.executorNik,
    executor_snapshot: snapshots.executor,
    fleet_snapshot: snapshots.fleet,
    external_executor: value.externalExecutor,
    external_fleet: value.externalFleet,
    start_point: value.startPoint,
    start_point_snapshot: snapshots.startLocation,
    destination: value.destination,
    destination_snapshot: snapshots.destinationLocation,
    std: value.std,
    sta: value.sta,
    sj_number: value.sjs[0].sjNumber,
    sj_qty: value.sjs[0].sjQty,
    sj_weight: value.sjs[0].sjWeight,
    product: value.sjs[0].product,
    product_snapshot: value.sjs[0].productSnapshot,
    sj_note: value.sjs[0].sjNote,
    assigned_at: new Date().toISOString(),
  });

  if (error) {
    const { data: existing } = await admin
      .from("tasks")
      .select("transaction_id")
      .eq("transaction_id", transactionId)
      .maybeSingle();

    if (existing) {
      return {
        success: `Tugas ${existing.transaction_id} udah dibuat dan ditugasin.`,
        transactionId: existing.transaction_id,
      };
    }

    return {
      error: "Tugas Supply TGR belum berhasil dibuat. Coba lagi, ya.",
    };
  }

  const { data: taskRow } = await admin
    .from("tasks")
    .select("id")
    .eq("transaction_id", transactionId)
    .maybeSingle();

  if (!taskRow)
    return { error: "Tugasnya sudah dibuat, tapi detail SJ belum ketemu." };

  const sjRows = value.sjs.map((sj) => ({
    task_id: taskRow.id,
    sj_number: sj.sjNumber,
    sj_qty: sj.sjQty,
    sj_weight: sj.sjWeight,
    product: sj.product,
    product_snapshot: sj.productSnapshot,
    note: sj.sjNote,
  }));

  const { error: sjError } = await admin.from("task_sj_items").insert(sjRows);
  if (sjError) {
    await admin
      .from("tasks")
      .delete()
      .eq("id", taskRow.id)
      .eq("status", "Assigned");

    return {
      error: "Tugas dan detail SJ belum berhasil disimpan. Coba lagi, ya.",
    };
  }

  revalidateOperationPaths();
  return {
    success: `Tugas ${transactionId} udah dibuat dan ditugasin.`,
    transactionId,
    result: {
      transactionId: String(transactionId),
      startPoint: value.startPoint,
      destination: value.destination,
      std: value.std,
      sta: value.sta,
      externalExecutor: value.externalExecutor,
      externalFleet: value.externalFleet,
      sjs: value.sjs,
    },
  };
}

export async function confirmTgrDepartureByOperationAction(
  _state: State,
  formData: FormData,
): Promise<State> {
  const profile = await getCurrentProfile();
  if (!["Operation", "Super User"].includes(profile.role))
    return { error: "Kamu belum punya akses ke bagian ini." };

  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const departure = String(formData.get("departure") ?? "").trim();
  const timestamp = jakartaTimestamp(departure);
  if (!transactionId || !timestamp)
    return { error: "Tanggal dan jam ATD perlu diisi dulu, ya." };

  const admin = createAdminClient();
  const query = admin
    .from("tasks")
    .select("id, status, created_by")
    .eq("transaction_id", transactionId)
    .eq("task_type", "Supply")
    .eq("fleet_ownership", "TGR")
    .eq("status", "Assigned");

  const { data: task } =
    profile.role === "Super User"
      ? await query.maybeSingle()
      : await query.eq("created_by", profile.id).maybeSingle();

  if (!task) {
    return { error: "Tugas TGR tidak ditemukan atau sudah diproses." };
  }

  const { error } = await admin
    .from("tasks")
    .update({
      status: "Driving",
      driving_at: timestamp,
    })
    .eq("id", task.id)
    .eq("status", "Assigned");

  if (error) {
    return { error: "Konfirmasi berangkat belum berhasil. Coba lagi, ya." };
  }

  revalidateOperationPaths();
  return { success: `ATD ${transactionId} sudah dicatat.` };
}

function revalidateOperationPaths() {
  revalidatePath("/operation/beranda");
  revalidatePath("/operation/riwayat-permintaan");
  revalidatePath("/dispatcher/armada-non-tgr");
  revalidatePath("/dispatcher/riwayat-penugasan");
  revalidatePath("/controller/beranda");
  revalidatePath("/controller/timetable");
}
