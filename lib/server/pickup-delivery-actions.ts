"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";

type Result = { error?: string; success?: string };

const ALLOWED_ROLES = ["Pickup", "Delivery"];

async function getOwnedTask(transactionId: string) {
  const profile = await getCurrentProfile();
  if (!ALLOWED_ROLES.includes(profile.role)) return { profile, admin: null, task: null };

  const admin = createAdminClient();
  const { data: task } = await admin
    .from("tasks")
    .select("id, transaction_id, status, executor_nik")
    .eq("transaction_id", transactionId)
    .eq("executor_nik", profile.username)
    .maybeSingle();

  return { profile, admin, task };
}

export async function startPickupDeliveryAssignmentAction(
  formData: FormData,
): Promise<Result> {
  const profile = await getCurrentProfile();
  if (!ALLOWED_ROLES.includes(profile.role))
    return { error: "Kamu belum punya akses ke bagian ini." };

  const platNumber = String(formData.get("platNumber") ?? "").trim();
  const rawStops = formData.getAll("stops").map((value) => String(value).trim()).filter(Boolean);

  if (!platNumber) return { error: "Nomor plat armada perlu diisi dulu, ya." };
  if (!rawStops.length) return { error: "Minimal isi 1 titik tugas, ya." };
  if (rawStops.length > 100) return { error: "Maksimal 100 titik tugas dalam satu penugasan, ya." };

  const admin = createAdminClient();
  const { data: fleet } = await admin
    .from("fleets")
    .select("plat_number, fleet_code, fleet_type, status")
    .eq("plat_number", platNumber)
    .eq("status", "Active")
    .maybeSingle();

  if (!fleet) return { error: "Armada dengan nomor plat itu belum tersedia atau tidak aktif." };

  const { data: activeTask } = await admin
    .from("tasks")
    .select("transaction_id")
    .eq("executor_nik", profile.username)
    .in("status", ["Confirmed", "Driving"])
    .maybeSingle();

  if (activeTask)
    return { error: "Masih ada penugasan yang belum selesai. Selesaikan dulu, ya." };

  const { data: transactionId, error: transactionError } = await admin.rpc(
    "movent_next_transaction_id",
  );
  if (transactionError || !transactionId)
    return { error: "ID penugasan belum berhasil dibuat. Coba lagi, ya." };

  const startPoint = rawStops[0];
  const destination = rawStops[rawStops.length - 1];

  const { data: task, error: taskError } = await admin
    .from("tasks")
    .insert({
      transaction_id: String(transactionId),
      source_type: "Manual",
      task_type: "Distribusi Mobil",
      fleet_ownership: "Non-TGR",
      status: "Confirmed",
      created_by: profile.id,
      executor_nik: profile.username,
      executor_snapshot: {
        executor_nik: profile.username,
        full_name: profile.full_name,
        role: profile.role,
      },
      fleet_snapshot: fleet,
      start_point: startPoint,
      start_point_snapshot: { location: startPoint },
      destination,
      destination_snapshot: { location: destination },
    })
    .select("id")
    .single();

  if (taskError || !task) return { error: "Penugasannya belum berhasil dibuat. Coba lagi, ya." };

  const stopRows = rawStops.map((location, index) => ({
    task_id: task.id,
    sequence_no: index + 1,
    location,
    status: "Pending",
  }));

  const { error: stopsError } = await admin.from("task_stops").insert(stopRows);
  if (stopsError) {
    await admin.from("tasks").delete().eq("id", task.id);
    return { error: "Titik tugas belum berhasil disimpan. Coba lagi, ya." };
  }

  revalidatePickupDeliveryPaths();
  return { success: `Penugasan ${transactionId} sudah dibuat. Siap jalan, ya.` };
}

export async function startPickupDeliveryTripAction(
  formData: FormData,
): Promise<Result> {
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const { admin, task } = await getOwnedTask(transactionId);

  if (!admin || !task || task.status !== "Confirmed")
    return { error: "Penugasan ini belum siap dimulai." };

  const { count } = await admin
    .from("task_stops")
    .select("id", { count: "exact", head: true })
    .eq("task_id", task.id);

  if (!count) return { error: "Belum ada titik tugas. Isi titik dulu, ya." };

  const { error } = await admin
    .from("tasks")
    .update({ status: "Driving", driving_at: new Date().toISOString() })
    .eq("id", task.id)
    .eq("executor_nik", task.executor_nik)
    .eq("status", "Confirmed");

  if (error) return { error: "Penugasan belum berhasil dimulai. Coba lagi, ya." };

  revalidatePickupDeliveryPaths();
  return { success: "Perjalanan dimulai. Gas ke titik pertama, ya." };
}

export async function checkInPickupDeliveryStopAction(
  formData: FormData,
): Promise<Result> {
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const stopId = String(formData.get("stopId") ?? "").trim();
  const { admin, task } = await getOwnedTask(transactionId);

  if (!admin || !task || task.status !== "Driving")
    return { error: "Penugasan ini belum dalam perjalanan." };
  if (!stopId) return { error: "Titik tugas belum dipilih." };

  const { data: stop } = await admin
    .from("task_stops")
    .select("id, sequence_no, status")
    .eq("id", stopId)
    .eq("task_id", task.id)
    .maybeSingle();

  if (!stop) return { error: "Titik tugasnya nggak ditemukan." };
  if (stop.status === "Checked In") return { error: "Titik ini sudah di-check-in." };

  const { data: previous } = await admin
    .from("task_stops")
    .select("sequence_no, status")
    .eq("task_id", task.id)
    .lt("sequence_no", stop.sequence_no)
    .neq("status", "Checked In")
    .limit(1)
    .maybeSingle();

  if (previous)
    return { error: `Check-in titik ${previous.sequence_no} dulu, ya.` };

  const { error } = await admin
    .from("task_stops")
    .update({
      status: "Checked In",
      checkin_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", stop.id)
    .eq("task_id", task.id)
    .eq("status", "Pending");

  if (error) return { error: "Check-in belum berhasil. Coba lagi, ya." };

  revalidatePickupDeliveryPaths();
  return { success: `Titik ${stop.sequence_no} sudah di-check-in.` };
}

export async function completePickupDeliveryAssignmentAction(
  formData: FormData,
): Promise<Result> {
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const { admin, task } = await getOwnedTask(transactionId);

  if (!admin || !task || task.status !== "Driving")
    return { error: "Penugasan ini belum siap diselesaikan." };

  const { count } = await admin
    .from("task_stops")
    .select("id", { count: "exact", head: true })
    .eq("task_id", task.id)
    .eq("status", "Checked In");

  const { count: total } = await admin
    .from("task_stops")
    .select("id", { count: "exact", head: true })
    .eq("task_id", task.id);

  if (!total || count !== total)
    return { error: "Semua titik harus di-check-in dulu sebelum pulang." };

  const { error } = await admin
    .from("tasks")
    .update({
      status: "Completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", task.id)
    .eq("executor_nik", task.executor_nik)
    .eq("status", "Driving");

  if (error) return { error: "Tugas belum berhasil diselesaikan. Coba lagi, ya." };

  revalidatePickupDeliveryPaths();
  return { success: "Tugas selesai. Siap mulai penugasan berikutnya, ya." };
}

function revalidatePickupDeliveryPaths() {
  revalidatePath("/pickup/tugas-saya");
  revalidatePath("/pickup/riwayat-tugas");
  revalidatePath("/delivery/tugas-saya");
  revalidatePath("/delivery/riwayat-tugas");
  revalidatePath("/dispatcher/beranda");
  revalidatePath("/dispatcher/riwayat-penugasan");
  revalidatePath("/controller/beranda");
  revalidatePath("/controller/timetable");
}
