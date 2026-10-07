"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";

type Result = { error?: string; success?: string };
const ALLOWED_ROLES = ["Pickup", "Delivery"];

async function getOwnedActivity(transactionId: string) {
  const profile = await getCurrentProfile();
  if (!ALLOWED_ROLES.includes(profile.role)) return { profile, admin: null, activity: null };

  const admin = createAdminClient();
  const { data: activity } = await admin
    .from("pickup_delivery_activities")
    .select("id, transaction_id, status, executor_nik")
    .eq("transaction_id", transactionId)
    .eq("executor_nik", profile.username)
    .maybeSingle();

  return { profile, admin, activity };
}

export async function startPickupDeliveryAssignmentAction(formData: FormData): Promise<Result> {
  const profile = await getCurrentProfile();
  if (!ALLOWED_ROLES.includes(profile.role)) return { error: "Kamu belum punya akses ke bagian ini." };

  const platNumber = String(formData.get("platNumber") ?? "").trim();
  const rawStops = formData.getAll("stops").map((value) => String(value).trim()).filter(Boolean);

  if (!platNumber) return { error: "Nomor plat armada perlu diisi dulu, ya." };
  if (!rawStops.length) return { error: "Minimal isi 1 titik tugas, ya." };
  if (rawStops.length > 100) return { error: "Maksimal 100 titik tugas dalam satu tugas, ya." };

  const admin = createAdminClient();
  const { data: fleet } = await admin
    .from("fleets")
    .select("plat_number, fleet_code, fleet_type, status")
    .eq("plat_number", platNumber)
    .eq("status", "Active")
    .maybeSingle();

  if (!fleet) return { error: "Armada dengan nomor plat itu belum tersedia atau tidak aktif." };

  const { data: activeActivity } = await admin
    .from("pickup_delivery_activities")
    .select("transaction_id")
    .eq("executor_nik", profile.username)
    .in("status", ["Confirmed", "Driving"])
    .maybeSingle();

  if (activeActivity) return { error: "Masih ada tugas yang belum selesai. Selesaikan dulu, ya." };

  const { data: transactionId, error: transactionError } = await admin.rpc("movent_next_transaction_id");
  if (transactionError || !transactionId) return { error: "ID Aktivitas belum berhasil dibuat. Coba lagi, ya." };

  const startPoint = rawStops[0];
  const destination = rawStops[rawStops.length - 1];

  const { data: activity, error: activityError } = await admin
    .from("pickup_delivery_activities")
    .insert({
      transaction_id: String(transactionId),
      activity_type: profile.role,
      user_id: profile.auth_user_id,
      executor_nik: profile.username,
      executor_snapshot: {
        executor_nik: profile.username,
        full_name: profile.full_name,
        role: profile.role,
      },
      fleet_snapshot: fleet,
      start_point: startPoint,
      destination,
      status: "Confirmed",
    })
    .select("id")
    .single();

  if (activityError || !activity) return { error: "Aktivitas belum berhasil dibuat. Coba lagi, ya." };

  const stopRows = rawStops.map((location, index) => ({
    activity_id: activity.id,
    sequence_no: index + 1,
    location,
    status: "Pending",
  }));

  const { error: stopsError } = await admin.from("pickup_delivery_stops").insert(stopRows);
  if (stopsError) {
    await admin.from("pickup_delivery_activities").delete().eq("id", activity.id);
    return { error: "Titik tugas belum berhasil disimpan. Coba lagi, ya." };
  }

  revalidatePickupDeliveryPaths();
  return { success: `ID Aktivitas ${transactionId} sudah dibuat. Siap mulai tugas, ya.` };
}

export async function startPickupDeliveryTripAction(formData: FormData): Promise<Result> {
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const { admin, activity } = await getOwnedActivity(transactionId);

  if (!admin || !activity || activity.status !== "Confirmed") return { error: "Tugas ini belum siap dimulai." };

  const { count } = await admin
    .from("pickup_delivery_stops")
    .select("id", { count: "exact", head: true })
    .eq("activity_id", activity.id);

  if (!count) return { error: "Belum ada titik tugas. Isi titik dulu, ya." };

  const { error } = await admin
    .from("pickup_delivery_activities")
    .update({ status: "Driving", started_at: new Date().toISOString() })
    .eq("id", activity.id)
    .eq("executor_nik", activity.executor_nik)
    .eq("status", "Confirmed");

  if (error) return { error: "Tugas belum berhasil dimulai. Coba lagi, ya." };

  revalidatePickupDeliveryPaths();
  return { success: "Perjalanan dimulai. Gas ke titik pertama, ya." };
}

export async function checkInPickupDeliveryStopAction(formData: FormData): Promise<Result> {
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const stopId = String(formData.get("stopId") ?? "").trim();
  const { admin, activity } = await getOwnedActivity(transactionId);

  if (!admin || !activity || activity.status !== "Driving") return { error: "Tugas ini belum dalam perjalanan." };
  if (!stopId) return { error: "Titik tugas belum dipilih." };

  const { data: stop } = await admin
    .from("pickup_delivery_stops")
    .select("id, sequence_no, status")
    .eq("id", stopId)
    .eq("activity_id", activity.id)
    .maybeSingle();

  if (!stop) return { error: "Titik tugasnya nggak ditemukan." };
  if (stop.status === "Checked In") return { error: "Titik ini sudah di-check-in." };

  const { data: previous } = await admin
    .from("pickup_delivery_stops")
    .select("sequence_no, status")
    .eq("activity_id", activity.id)
    .lt("sequence_no", stop.sequence_no)
    .neq("status", "Checked In")
    .limit(1)
    .maybeSingle();

  if (previous) return { error: `Check-in titik ${previous.sequence_no} dulu, ya.` };

  const { error } = await admin
    .from("pickup_delivery_stops")
    .update({
      status: "Checked In",
      checkin_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", stop.id)
    .eq("activity_id", activity.id)
    .eq("status", "Pending");

  if (error) return { error: "Check-in belum berhasil. Coba lagi, ya." };

  revalidatePickupDeliveryPaths();
  return { success: `Titik ${stop.sequence_no} sudah di-check-in.` };
}

export async function completePickupDeliveryAssignmentAction(formData: FormData): Promise<Result> {
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const { admin, activity } = await getOwnedActivity(transactionId);

  if (!admin || !activity || activity.status !== "Driving") return { error: "Tugas ini belum siap diselesaikan." };

  const { count } = await admin
    .from("pickup_delivery_stops")
    .select("id", { count: "exact", head: true })
    .eq("activity_id", activity.id)
    .eq("status", "Checked In");

  const { count: total } = await admin
    .from("pickup_delivery_stops")
    .select("id", { count: "exact", head: true })
    .eq("activity_id", activity.id);

  if (!total || count !== total) return { error: "Semua titik harus di-check-in dulu sebelum pulang." };

  const { error } = await admin
    .from("pickup_delivery_activities")
    .update({ status: "Completed", completed_at: new Date().toISOString() })
    .eq("id", activity.id)
    .eq("executor_nik", activity.executor_nik)
    .eq("status", "Driving");

  if (error) return { error: "Tugas belum berhasil diselesaikan. Coba lagi, ya." };

  revalidatePickupDeliveryPaths();
  return { success: "Tugas selesai. Siap mulai tugas berikutnya, ya." };
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
