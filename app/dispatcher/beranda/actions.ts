"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";

const DISPATCHER_FLEET_OWNERSHIP = "TGR" as const;

export type State = {
  error?: string;
  success?: string;
  transactionId?: string;
  preview?: {
    transactionId?: string;
    flow: "tgr" | "distribusi";
    startPoint: string;
    destination: string;
    externalExecutor: string;
    externalFleet: string;
    sjNumber: string;
    sjQty: number;
    sjWeight: number;
    product: string;
    sjNote: string | null;
    scheduleId?: string;
    executorNik?: string;
    platNumber?: string;
    std?: string;
    sta?: string;
  };
};

function todayTimestamp(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  )
    return null;
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return `${date}T${time}:00+07:00`;
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

function scheduleCategoryAllowed(category: string) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);

  const year = Number(parts.find((item) => item.type === "year")?.value ?? 0);
  const month = Number(parts.find((item) => item.type === "month")?.value ?? 0);
  const day = Number(parts.find((item) => item.type === "day")?.value ?? 0);
  if (!year || !month || !day) return false;

  const todayKey = Date.UTC(year, month - 1, day);
  const twindateStartKey = Date.UTC(year, month - 1, month);
  const twindateEnd = new Date(twindateStartKey);
  twindateEnd.setUTCDate(twindateEnd.getUTCDate() + 2);
  const isTwindateWindow =
    todayKey >= twindateStartKey &&
    todayKey <= twindateEnd.getTime();

  return category === (isTwindateWindow ? "Campaign" : "Normal");
}

function scheduleStdNotPassed(std: string, scheduleDay: number) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };

  const currentDay = weekdayMap[
    parts.find((item) => item.type === "weekday")?.value ?? ""
  ];

  if (!currentDay || !Number.isInteger(scheduleDay)) return false;

  if (scheduleDay !== currentDay) return false;

  const year = parts.find((item) => item.type === "year")?.value;
  const month = parts.find((item) => item.type === "month")?.value;
  const day = parts.find((item) => item.type === "day")?.value;
  if (!year || !month || !day) return false;

  const targetDate = new Date(`${year}-${month}-${day}T00:00:00+07:00`);

  const nextDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(targetDate);

  const stdAt = new Date(`${nextDate}T${std}+07:00`);
  return new Date() <= stdAt;
}

async function nextTransaction(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin.rpc("movent_next_transaction_id");
  if (error || !data) return null;
  return data as string;
}

export async function createDispatcherTaskAction(
  _state: State,
  formData: FormData,
): Promise<State> {
  const profile = await getCurrentProfile();
  if (!["Dispatcher", "Super User"].includes(profile.role))
    return { error: "Kamu belum punya akses ke bagian ini." };

  const taskType = String(formData.get("taskType") ?? "");

  if (taskType !== "Supply") {
    return { error: "Tugas baru dari Dispatcher sekarang khusus Armada TGR, ya." };
  }

  const ownership = DISPATCHER_FLEET_OWNERSHIP;

  const admin = createAdminClient();

  if (taskType === "Supply" && ownership === "TGR") {
    const scheduleId = String(formData.get("scheduleId") ?? "").trim();
    const executorNik = String(formData.get("executorNik") ?? "").trim();
    const platNumber = String(formData.get("platNumber") ?? "").trim();
    if (!scheduleId || !executorNik || !platNumber)
      return { error: "Schedule, Executor, dan Armada perlu diisi dulu, ya." };

    const { data: schedule } = await admin
      .from("schedules")
      .select("*")
      .eq("schedule_id", scheduleId)
      .eq("status", "Active")
      .maybeSingle();
    if (!schedule) return { error: "Schedule-nya nggak tersedia." };
    if (!scheduleStdNotPassed(schedule.std, Number(schedule.schedule_day)))
      return {
        error: "Jadwalnya sudah lewat STD, jadi nggak bisa dipakai lagi, ya.",
      };

    const { executor, fleet } = await activeExecutorAndFleet(
      admin,
      executorNik,
      platNumber,
    );
    if (!executor || !fleet)
      return { error: "Executor atau armadanya belum tersedia, ya." };

    const transactionId = await nextTransaction(admin);
    if (!transactionId)
      return { error: "ID transaksinya belum berhasil dibuat. Coba lagi, ya." };
    return {
      success: "Preview tugasnya sudah siap. Cek dulu sebelum lanjut, ya.",
      preview: {
        transactionId,
        flow: "tgr",
        startPoint: schedule.start_point,
        destination: schedule.destination,
        externalExecutor: executor.full_name,
        externalFleet: fleet.plat_number,
        sjNumber: "",
        sjQty: 0,
        sjWeight: 0,
        product: "",
        sjNote: null,
        scheduleId: schedule.schedule_id,
        executorNik: executor.executor_nik,
        platNumber: fleet.plat_number,
        std: todayTimestamp(schedule.std) ?? "",
        sta: todayTimestamp(schedule.sta) ?? "",
      },
    };
  }

  return { error: "Jenis tugasnya belum lengkap. Coba cek lagi, ya." };
}

export async function confirmDispatcherTaskAction(
  _state: State,
  formData: FormData,
): Promise<State> {
  const profile = await getCurrentProfile();
  if (!["Dispatcher", "Super User"].includes(profile.role)) {
    return { error: "Kamu belum punya akses ke bagian ini." };
  }

  const flow = String(formData.get("flow") ?? "");
  const suppliedTransactionId = String(
    formData.get("transactionId") ?? "",
  ).trim();
  const executorNik = String(formData.get("executorNik") ?? "").trim();
  const platNumber = String(formData.get("platNumber") ?? "").trim();
  const scheduleId = String(formData.get("scheduleId") ?? "").trim();

  const admin = createAdminClient();
  const transactionId = suppliedTransactionId;

  if (!transactionId) {
    return {
      error:
        "ID transaksi preview belum ada. Buat preview tugas dulu, ya.",
    };
  }

  const { executor, fleet } = await activeExecutorAndFleet(
    admin,
    executorNik,
    platNumber,
  );
  if (!executor || !fleet) {
    return { error: "Executor atau armadanya belum tersedia, ya." };
  }

  if (flow === "tgr") {
    const { data: schedule } = await admin
      .from("schedules")
      .select("*")
      .eq("schedule_id", scheduleId)
      .eq("status", "Active")
      .maybeSingle();

    if (!schedule) {
      return { error: "Schedule-nya nggak tersedia." };
    }

    if (!scheduleCategoryAllowed(String(schedule.category ?? ""))) {
      return {
        error:
          "Jenis schedule-nya nggak sesuai periode Twindate hari ini, jadi nggak bisa dipakai, ya.",
      };
    }

    if (!scheduleStdNotPassed(schedule.std, Number(schedule.schedule_day))) {
      return {
        error: "Jadwalnya sudah lewat STD, jadi nggak bisa dipakai lagi, ya.",
      };
    }

    const std = String(formData.get("std") ?? "").trim();
    const sta = String(formData.get("sta") ?? "").trim();

    if (!std || !sta) {
      return { error: "Waktu preview-nya belum tersedia." };
    }

    if (
      Number.isNaN(new Date(std).getTime()) ||
      Number.isNaN(new Date(sta).getTime())
    ) {
      return { error: "Waktu preview-nya belum benar. Cek lagi, ya." };
    }

    if (new Date(sta).getTime() <= new Date(std).getTime()) {
      return { error: "STA harus setelah STD, ya." };
    }

    const { error } = await admin.from("tasks").insert({
      transaction_id: transactionId,
      source_type: "Schedule",
      task_type: "Supply",
      fleet_ownership: DISPATCHER_FLEET_OWNERSHIP,
      status: "Assigned",
      created_by: profile.id,
      assigned_by: profile.id,
      executor_nik: executor.executor_nik,
      executor_snapshot: executor,
      fleet_snapshot: fleet,
      schedule_id: schedule.schedule_id,
      schedule_snapshot: schedule,
      start_point: schedule.start_point,
      start_point_snapshot: schedule,
      destination: schedule.destination,
      destination_snapshot: schedule,
      std,
      sta,
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

      return { error: "Tugasnya belum berhasil dibuat. Coba lagi, ya." };
    }
  } else {
    return { error: "Preview tugasnya sudah nggak valid. Buat ulang, ya." };
  }

  revalidateTaskPaths();
  return {
    success: `Tugas ${transactionId} udah dibuat dan ditugasin.`,
    transactionId,
  };
}

export async function cancelDispatcherTaskAction(formData: FormData) {
  const profile = await getCurrentProfile();
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!transactionId || !note)
    return {
      error: "Transaction ID dan alasan pembatalan perlu diisi dulu, ya.",
    };

  const admin = createAdminClient();
  const { data: task } = await admin
    .from("tasks")
    .select("id, status, created_by, fleet_ownership")
    .eq("transaction_id", transactionId)
    .maybeSingle();
  if (!task) return { error: "Tugasnya nggak ditemukan." };
  if (task.fleet_ownership === "Non-TGR") {
    if (profile.role !== "Super User")
      return {
        error: "Tugas Armada Non-TGR cuma bisa dibatalin oleh Super User.",
      };
    if (!["Assigned", "Driving"].includes(task.status))
      return { error: "Tugasnya sudah selesai atau memang nggak bisa dibatalin." };
  } else {
    if (task.status !== "Assigned")
      return {
        error: "Tugasnya sudah diterima atau memang nggak bisa dibatalin lagi.",
      };
    if (
      profile.role !== "Super User" &&
      (profile.role !== "Dispatcher" || task.created_by !== profile.id)
    ) {
      return { error: "Kamu belum punya akses ke bagian ini." };
    }
  }

  const { error } = await admin
    .from("tasks")
    .update({
      status: "Canceled",
      canceled_at: new Date().toISOString(),
      canceled_from_status: task.status,
      cancellation_note: note,
    })
    .eq("id", task.id)
    .eq("status", task.status);
  if (error)
    return { error: "Tugasnya belum berhasil dibatalin. Coba lagi, ya." };
  revalidateTaskPaths();
  redirect("/dispatcher/riwayat-penugasan");
}

function revalidateTaskPaths() {
  revalidatePath("/dispatcher/beranda");
  revalidatePath("/dispatcher/riwayat-penugasan");
  revalidatePath("/dispatcher/armada-non-tgr");
  revalidatePath("/dispatcher/timetable");
  revalidatePath("/controller/beranda");
  revalidatePath("/controller/timetable");
  revalidatePath("/executor/tugas-saya");
}
