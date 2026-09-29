"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/server/profile";
import { createAdminClient } from "@/lib/supabase/admin";

type State = {
  error?: string;
  success?: string;
  preview?: {
    transactionId: string;
    executorNik: string;
    executorName: string;
    platNumber: string;
    fleetType: string;
  };
};

export async function confirmExtraScheduleRequestAction(
  formData: FormData,
): Promise<State> {
  const profile = await getCurrentProfile();
  if (!["Dispatcher", "Super User"].includes(profile.role))
    return { error: "Kamu belum punya akses ke bagian ini." };

  const transactionId = String(formData.get("transactionId") ?? "").trim();
  if (!transactionId) return { error: "ID transaksi perlu diisi dulu, ya." };

  const admin = createAdminClient();
  const { data: task } = await admin
    .from("tasks")
    .select("id, status")
    .eq("transaction_id", transactionId)
    .eq("source_type", "Extra Schedule")
    .eq("status", "Requested")
    .maybeSingle();

  if (!task)
    return {
      error: "Permintaan jadwal tambahan nggak ditemukan atau sudah diproses.",
    };

  const { error } = await admin
    .from("tasks")
    .update({
      status: "Confirmed",
      assigned_by: profile.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", task.id)
    .eq("status", "Requested");

  if (error) return { error: "Permintaannya belum berhasil diterima. Coba lagi, ya." };

  revalidatePaths();
  return {
    success: `Request ${transactionId} udah diterima. Pilih Executor dan Armada buat lanjut, ya.`,
  };
}

export async function previewExtraScheduleAssignmentAction(
  formData: FormData,
): Promise<State> {
  const profile = await getCurrentProfile();
  if (!["Dispatcher", "Super User"].includes(profile.role))
    return { error: "Kamu belum punya akses ke bagian ini." };

  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const executorNik = String(formData.get("executorNik") ?? "").trim();
  const platNumber = String(formData.get("platNumber") ?? "").trim();
  if (!transactionId || !executorNik || !platNumber)
    return { error: "Executor dan nomor plat perlu dipilih dulu, ya." };

  const admin = createAdminClient();
  const [{ data: task }, { data: executor }, { data: fleet }] =
    await Promise.all([
      admin
        .from("tasks")
        .select("id, status")
        .eq("transaction_id", transactionId)
        .eq("source_type", "Extra Schedule")
        .eq("status", "Confirmed")
        .maybeSingle(),
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

  if (!task)
    return {
      error: "Permintaan jadwal tambahan belum diterima atau sudah diproses.",
    };
  if (!executor) return { error: "Executor-nya nggak tersedia." };
  if (!fleet) return { error: "Armadanya nggak tersedia." };

  return {
    preview: {
      transactionId,
      executorNik: executor.executor_nik,
      executorName: executor.full_name,
      platNumber: fleet.plat_number,
      fleetType: fleet.fleet_type,
    },
  };
}

export async function confirmExtraScheduleAssignmentAction(
  formData: FormData,
): Promise<State> {
  const profile = await getCurrentProfile();
  if (!["Dispatcher", "Super User"].includes(profile.role))
    return { error: "Kamu belum punya akses ke bagian ini." };

  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const executorNik = String(formData.get("executorNik") ?? "").trim();
  const platNumber = String(formData.get("platNumber") ?? "").trim();
  if (!transactionId || !executorNik || !platNumber)
    return { error: "Data penugasannya belum lengkap. Cek lagi, ya." };

  const admin = createAdminClient();
  const [{ data: task }, { data: executor }, { data: fleet }] =
    await Promise.all([
      admin
        .from("tasks")
        .select("id, status")
        .eq("transaction_id", transactionId)
        .eq("source_type", "Extra Schedule")
        .eq("status", "Confirmed")
        .maybeSingle(),
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

  if (!task)
    return {
      error: "Permintaan jadwal tambahan belum diterima atau sudah diproses.",
    };
  if (!executor) return { error: "Executor-nya nggak tersedia." };
  if (!fleet) return { error: "Armadanya nggak tersedia." };

  const { error } = await admin
    .from("tasks")
    .update({
      assigned_by: profile.id,
      executor_nik: executor.executor_nik,
      executor_snapshot: executor,
      fleet_snapshot: fleet,
      status: "Assigned",
      assigned_at: new Date().toISOString(),
    })
    .eq("id", task.id)
    .eq("status", "Confirmed");

  if (error)
    return { error: "Penugasannya belum berhasil diselesaikan. Coba lagi, ya." };

  revalidatePaths();
  return { success: `Jadwal tambahan ${transactionId} berhasil ditugasin.` };
}

async function revalidatePaths() {
  revalidatePath("/dispatcher/extra-schedule");
  revalidatePath("/operation/riwayat-permintaan");
  revalidatePath("/executor/tugas-saya");
  revalidatePath("/controller/beranda");
  revalidatePath("/controller/timetable");
}
