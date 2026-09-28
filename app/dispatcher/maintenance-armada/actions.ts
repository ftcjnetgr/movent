"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";

type State = {
  error?: string;
  success?: string;
  transactionId?: string;
  preview?: {
    transactionId: string;
    maintenanceList: string;
    location: string;
    platNumber: string;
  };
};

async function validate(formData: FormData) {
  const maintenanceList = String(formData.get("maintenanceList") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const platNumber = String(formData.get("platNumber") ?? "").trim();

  if (!maintenanceList || !location || !platNumber) {
    return {
      error: "Kebutuhan maintenance, lokasi, dan armadanya perlu diisi dulu, ya.",
    } as const;
  }

  const admin = createAdminClient();

  const [{ data: maintenance }, { data: locationRow }, { data: fleet }] =
    await Promise.all([
      admin
        .from("maintenance_lists")
        .select("maintenance_list,status")
        .eq("maintenance_list", maintenanceList)
        .eq("status", "Active")
        .maybeSingle(),
      admin
        .from("locations")
        .select("location,grouping,status")
        .eq("location", location)
        .eq("status", "Active")
        .maybeSingle(),
      admin
        .from("fleets")
        .select("plat_number,fleet_type,status")
        .eq("plat_number", platNumber)
        .eq("status", "Active")
        .maybeSingle(),
    ]);

  if (!maintenance || !locationRow || !fleet) {
    return {
      error: "Data maintenance, lokasi, atau armadanya belum tersedia.",
    } as const;
  }

  const { data: transactionId, error: transactionError } = await admin.rpc(
    "movent_next_transaction_id",
  );

  if (transactionError || !transactionId) {
    return { error: "ID transaksinya belum berhasil dibuat. Coba lagi, ya." } as const;
  }

  return {
    value: {
      transactionId,
      maintenanceList: maintenance.maintenance_list,
      location: locationRow.location,
      platNumber: fleet.plat_number,
    },
    snapshots: {
      m: maintenance,
      l: locationRow,
      f: fleet,
    },
  } as const;
}

export async function createMaintenanceTicketAction(
  _state: State,
  formData: FormData,
): Promise<State> {
  const profile = await getCurrentProfile();

  if (!["Dispatcher", "Super User"].includes(profile.role)) {
    return { error: "Kamu belum punya akses ke bagian ini." };
  }

  const value = await validate(formData);
  if ("error" in value) {
    return value;
  }

  return {
    success: "Preview maintenance-nya sudah siap. Cek dulu sebelum lanjut, ya.",
    preview: value.value,
  };
}

export async function confirmMaintenanceTicketAction(
  _state: State,
  formData: FormData,
): Promise<State> {
  const profile = await getCurrentProfile();

  if (!["Dispatcher", "Super User"].includes(profile.role)) {
    return { error: "Kamu belum punya akses ke bagian ini." };
  }

  const suppliedTransactionId = String(
    formData.get("transactionId") ?? "",
  ).trim();
  const maintenanceList = String(formData.get("maintenanceList") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const platNumber = String(formData.get("platNumber") ?? "").trim();

  if (!suppliedTransactionId) {
    return {
      error:
        "ID transaksi preview belum ada. Buat preview maintenance dulu, ya.",
    };
  }

  if (!maintenanceList || !location || !platNumber) {
    return { error: "Data maintenance-nya belum lengkap. Cek lagi, ya." };
  }

  const admin = createAdminClient();

  const [{ data: maintenance }, { data: locationRow }, { data: fleet }] =
    await Promise.all([
      admin
        .from("maintenance_lists")
        .select("maintenance_list,status")
        .eq("maintenance_list", maintenanceList)
        .eq("status", "Active")
        .maybeSingle(),
      admin
        .from("locations")
        .select("location,grouping,status")
        .eq("location", location)
        .eq("status", "Active")
        .maybeSingle(),
      admin
        .from("fleets")
        .select("plat_number,fleet_type,status")
        .eq("plat_number", platNumber)
        .eq("status", "Active")
        .maybeSingle(),
    ]);

  if (!maintenance || !locationRow || !fleet) {
    return { error: "Data maintenance-nya sudah nggak tersedia. Buat preview baru, ya." };
  }

  const transactionId = suppliedTransactionId;

  const { error } = await admin.from("ticketings").insert({
    transaction_id: transactionId,
    status: "Requested",
    created_by: profile.id,
    maintenance_list: maintenance.maintenance_list,
    maintenance_snapshot: maintenance,
    fleet_plat_number: fleet.plat_number,
    fleet_snapshot: fleet,
    location: locationRow.location,
    location_snapshot: locationRow,
    requested_at: new Date().toISOString(),
  });

  if (error) {
    const { data: existing } = await admin
      .from("ticketings")
      .select("transaction_id")
      .eq("transaction_id", transactionId)
      .maybeSingle();

    if (existing) {
      return {
        success: `Maintenance ${existing.transaction_id} sudah dikonfirmasi.`,
        transactionId: existing.transaction_id,
      };
    }

    return { error: "Maintenance belum berhasil dibuat. Coba lagi, ya." };
  }

  revalidatePath("/dispatcher/maintenance-armada");
  revalidatePath("/maintainer/tiket-maintenance");
  revalidatePath("/controller/beranda");

  return {
    success: `Maintenance ${transactionId} berhasil dikonfirmasi.`,
    transactionId,
  };
}

export async function cancelMaintenanceTicketAction(formData: FormData) {
  const profile = await getCurrentProfile();
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!transactionId || !note) {
    return {
      error: "Transaction ID dan alasan pembatalan perlu diisi dulu, ya.",
    };
  }

  if (!["Dispatcher", "Super User"].includes(profile.role)) {
    return { error: "Kamu belum punya akses ke bagian ini." };
  }

  const admin = createAdminClient();

  let query = admin
    .from("ticketings")
    .select("id,status,created_by")
    .eq("transaction_id", transactionId)
    .eq("status", "Requested");

  if (profile.role !== "Super User") {
    query = query.eq("created_by", profile.id);
  }

  const { data: ticket } = await query.maybeSingle();

  if (!ticket) {
    return { error: "Maintenance-nya nggak ditemukan atau sudah nggak bisa dibatalin." };
  }

  const { error } = await admin
    .from("ticketings")
    .update({
      status: "Canceled",
      canceled_at: new Date().toISOString(),
      canceled_from_status: "Requested",
      cancellation_note: note,
    })
    .eq("id", ticket.id)
    .eq("status", "Requested");

  if (error) {
    return { error: "Maintenance-nya belum berhasil dibatalin. Coba lagi, ya." };
  }

  revalidatePath("/dispatcher/maintenance-armada");
  revalidatePath("/maintainer/tiket-maintenance");
  revalidatePath("/controller/beranda");

  return { success: "Maintenance berhasil dibatalin." };
}
