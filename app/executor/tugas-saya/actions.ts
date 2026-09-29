"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";

type Result = { error?: string; success?: string };

async function getTask(transactionId: string, statuses: string[]) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tasks")
    .select("*")
    .eq("transaction_id", transactionId)
    .in("status", statuses)
    .maybeSingle();
  return { admin, task: data };
}

function allowedExecutor(
  profileRole: string,
  taskNik: string | null | undefined,
  profileNik: string,
) {
  return (
    profileRole === "Super User" ||
    (profileRole === "Executor" && taskNik === profileNik)
  );
}

function requiresSj(task: Record<string, any>) {
  return task.task_type === "Supply" && task.fleet_ownership === "TGR";
}

export async function acceptExtraScheduleAction(
  formData: FormData,
): Promise<Result> {
  const profile = await getCurrentProfile();
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const { admin, task } = await getTask(transactionId, ["Assigned"]);

  if (
    !task ||
    task.fleet_ownership === "Non-TGR" ||
    !allowedExecutor(profile.role, task.executor_nik, profile.nik)
  ) {
    return { error: "Tugas ini belum tersedia buat kamu." };
  }

  const { error } = await admin
    .from("tasks")
    .update({ status: "Confirmed", accepted_at: new Date().toISOString() })
    .eq("id", task.id)
    .eq("status", "Assigned");

  if (error) return { error: "Penerimaan tugas belum berhasil. Coba lagi, ya." };

  revalidateExecutorPaths();
  return { success: "Tugasnya udah diterima." };
}

export async function submitExtraScheduleSjAction(
  formData: FormData,
): Promise<Result> {
  const profile = await getCurrentProfile();
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const sjNumber = String(formData.get("sjNumber") ?? "").trim();
  const qty = Number(formData.get("qty"));
  const weight = Number(formData.get("weight"));
  const product = String(formData.get("product") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (
    !sjNumber ||
    !Number.isFinite(qty) ||
    qty < 0 ||
    !Number.isFinite(weight) ||
    weight < 0 ||
    !product
  ) {
    return { error: "Nomor SJ, Qty, berat, dan produk perlu diisi dulu, ya." };
  }

  const { admin, task } = await getTask(transactionId, ["Confirmed"]);
  if (
    !task ||
    !requiresSj(task) ||
    !allowedExecutor(profile.role, task.executor_nik, profile.nik)
  ) {
    return { error: "Tugas ini belum siap buat isi SJ." };
  }

  const { data: productData } = await admin
    .from("products")
    .select("product, status")
    .eq("product", product)
    .eq("status", "Active")
    .maybeSingle();

  if (!productData) return { error: "Produknya nggak tersedia." };

  const { data: insertedSj, error } = await admin
    .from("task_sj_items")
    .insert({
      task_id: task.id,
      sj_number: sjNumber,
      sj_qty: qty,
      sj_weight: weight,
      product,
      product_snapshot: productData,
      note: note || null,
    })
    .select("id")
    .single();

  if (error || !insertedSj) return { error: "SJ belum berhasil disimpan. Coba lagi, ya." };

  // Keep the legacy task-level fields populated for existing reports/records.
  const { error: legacyError } = await admin
    .from("tasks")
    .update({
      sj_number: sjNumber,
      sj_qty: qty,
      sj_weight: weight,
      product,
      product_snapshot: productData,
      sj_note: note || null,
    })
    .eq("id", task.id)
    .eq("status", "Confirmed");

  if (legacyError) {
    await admin
      .from("task_sj_items")
      .delete()
      .eq("id", insertedSj.id)
      .eq("task_id", task.id);
    return { error: "SJ belum berhasil disimpan. Coba lagi, ya." };
  }

  revalidateExecutorPaths();
  return { success: "SJ sudah disimpan." };
}

export async function saveOdometerStartAction(
  formData: FormData,
): Promise<Result> {
  const profile = await getCurrentProfile();
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const value = Number(formData.get("odometerStart"));
  if (!Number.isFinite(value) || value < 0)
    return { error: "Odometer awal belum benar. Cek lagi, ya." };

  const { admin, task } = await getTask(transactionId, ["Confirmed"]);
  if (!task || !allowedExecutor(profile.role, task.executor_nik, profile.nik))
    return { error: "Tugas ini belum tersedia buat kamu." };
  if (requiresSj(task)) {
    const { count } = await admin
      .from("task_sj_items")
      .select("id", { count: "exact", head: true })
      .eq("task_id", task.id);
    if (!count) return { error: "Isi SJ dulu, ya." };
  }

  const { error } = await admin
    .from("tasks")
    .update({ odometer_start: value })
    .eq("id", task.id)
    .eq("status", "Confirmed");
  if (error) return { error: "Odometer awal belum berhasil disimpan. Coba lagi, ya." };
  revalidateExecutorPaths();
  return { success: "Odometer awal sudah disimpan." };
}

export async function confirmDrivingAction(
  formData: FormData,
): Promise<Result> {
  const profile = await getCurrentProfile();
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const { admin, task } = await getTask(transactionId, ["Confirmed"]);
  if (
    !task ||
    task.fleet_ownership === "Non-TGR" ||
    !allowedExecutor(profile.role, task.executor_nik, profile.nik)
  )
    return { error: "Tugas ini belum tersedia buat kamu." };
  if (requiresSj(task)) {
    const { count } = await admin
      .from("task_sj_items")
      .select("id", { count: "exact", head: true })
      .eq("task_id", task.id);
    if (!count) return { error: "Isi SJ dulu, ya." };
  }
  if (task.odometer_start === null)
    return { error: "Isi odometer awal dulu, ya." };

  const { error } = await admin
    .from("tasks")
    .update({ status: "Driving", driving_at: new Date().toISOString() })
    .eq("id", task.id)
    .eq("status", "Confirmed");
  if (error) return { error: "Konfirmasi berangkat belum berhasil. Coba lagi, ya." };
  revalidateExecutorPaths();
  return { success: "Berangkat sudah dicatat." };
}

export async function confirmArrivalAction(
  formData: FormData,
): Promise<Result> {
  const profile = await getCurrentProfile();
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const { admin, task } = await getTask(transactionId, ["Driving"]);
  if (!task || !allowedExecutor(profile.role, task.executor_nik, profile.nik))
    return { error: "Tugas ini belum tersedia buat kamu." };

  const { error } = await admin
    .from("tasks")
    .update({ arrived_at: new Date().toISOString() })
    .eq("id", task.id)
    .eq("status", "Driving")
    .is("arrived_at", null);

  if (error) return { error: "Konfirmasi datang belum berhasil. Coba lagi, ya." };
  revalidateExecutorPaths();
  return { success: "Kedatangan sudah dicatat." };
}

export async function saveOdometerEndAction(
  formData: FormData,
): Promise<Result> {
  const profile = await getCurrentProfile();
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const value = Number(formData.get("odometerEnd"));
  if (!Number.isFinite(value) || value < 0)
    return { error: "Odometer akhir belum benar. Cek lagi, ya." };

  const { admin, task } = await getTask(transactionId, ["Driving"]);
  if (!task || !allowedExecutor(profile.role, task.executor_nik, profile.nik))
    return { error: "Tugas ini belum tersedia buat kamu." };
  if (!task.arrived_at) return { error: "Konfirmasi kedatangan dulu, ya." };
  if (task.odometer_start !== null && value < Number(task.odometer_start))
    return {
      error: "Odometer akhir nggak boleh lebih kecil dari odometer awal, ya.",
    };

  const { error } = await admin
    .from("tasks")
    .update({ odometer_end: value })
    .eq("id", task.id)
    .eq("status", "Driving");
  if (error) return { error: "Odometer akhir belum berhasil disimpan. Coba lagi, ya." };
  revalidateExecutorPaths();
  return { success: "Odometer akhir sudah disimpan." };
}

export async function confirmCompletedAction(
  formData: FormData,
): Promise<Result> {
  const profile = await getCurrentProfile();
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const { admin, task } = await getTask(transactionId, ["Driving"]);
  if (!task || !allowedExecutor(profile.role, task.executor_nik, profile.nik))
    return { error: "Tugas ini belum tersedia buat kamu." };
  if (!task.arrived_at) return { error: "Konfirmasi kedatangan dulu, ya." };
  if (task.odometer_end === null)
    return { error: "Isi odometer akhir dulu, ya." };

  const { error } = await admin
    .from("tasks")
    .update({ status: "Completed", completed_at: new Date().toISOString() })
    .eq("id", task.id)
    .eq("status", "Driving");
  if (error) return { error: "Penyelesaian tugas belum berhasil. Coba lagi, ya." };
  revalidateExecutorPaths();
  return { success: "Tugasnya udah selesai." };
}

function revalidateExecutorPaths() {
  revalidatePath("/executor/tugas-saya");
  revalidatePath("/executor/riwayat-tugas");
  revalidatePath("/dispatcher/beranda");
  revalidatePath("/dispatcher/riwayat-penugasan");
  revalidatePath("/controller/beranda");
  revalidatePath("/controller/timetable");
}
