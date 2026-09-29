"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";

type Result = { error?: string; success?: string };

async function findTicket(transactionId: string, statuses: string[]) {
  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("ticketings")
    .select("*")
    .eq("transaction_id", transactionId)
    .in("status", statuses)
    .maybeSingle();
  return { admin, ticket };
}

function allowedMaintainer(role: string) {
  return role === "Maintainer" || role === "Super User";
}

export async function acceptMaintenanceTicketAction(
  formData: FormData,
): Promise<Result> {
  const profile = await getCurrentProfile();
  if (!allowedMaintainer(profile.role))
    return { error: "Kamu belum punya akses ke bagian ini." };

  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const { admin, ticket } = await findTicket(transactionId, ["Requested"]);
  if (!ticket) return { error: "Maintenance nggak ditemukan atau sudah diproses." };

  const { error } = await admin
    .from("ticketings")
    .update({
      status: "Confirmed",
      maintainer_user_id: profile.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", ticket.id)
    .eq("status", "Requested");

  if (error) return { error: "Penerimaan maintenance belum berhasil. Coba lagi, ya." };
  revalidatePath("/maintainer/tiket-maintenance");
  revalidatePath("/dispatcher/maintenance-armada");
  revalidatePath("/controller/beranda");
  return { success: "Maintenance udah diterima." };
}

export async function startMaintenanceAction(
  formData: FormData,
): Promise<Result> {
  const profile = await getCurrentProfile();
  if (!allowedMaintainer(profile.role))
    return { error: "Kamu belum punya akses ke bagian ini." };
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const { admin, ticket } = await findTicket(transactionId, ["Confirmed"]);
  if (!ticket) return { error: "Maintenance-nya nggak ditemukan." };
  if (profile.role !== "Super User" && ticket.maintainer_user_id !== profile.id)
    return { error: "Maintenance ini bukan tanggung jawab kamu." };

  const { error } = await admin
    .from("ticketings")
    .update({
      status: "In Progress",
      in_progress_at: new Date().toISOString(),
    })
    .eq("id", ticket.id)
    .eq("status", "Confirmed");

  if (error) return { error: "Maintenance belum berhasil dimulai. Coba lagi, ya." };
  revalidatePath("/maintainer/tiket-maintenance");
  revalidatePath("/controller/beranda");
  return { success: "Maintenance mulai dikerjain." };
}

export async function completeMaintenanceAction(
  formData: FormData,
): Promise<Result> {
  const profile = await getCurrentProfile();
  if (!allowedMaintainer(profile.role))
    return { error: "Kamu belum punya akses ke bagian ini." };
  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const pic = String(formData.get("picMaintenance") ?? "").trim();
  if (!pic) return { error: "Nama PIC maintenance perlu diisi dulu, ya." };
  const { admin, ticket } = await findTicket(transactionId, ["In Progress"]);
  if (!ticket) return { error: "Maintenance-nya nggak ditemukan." };
  if (profile.role !== "Super User" && ticket.maintainer_user_id !== profile.id)
    return { error: "Maintenance ini bukan tanggung jawab kamu." };

  const { error } = await admin
    .from("ticketings")
    .update({
      status: "Completed",
      maintenance_pic: pic,
      completed_at: new Date().toISOString(),
    })
    .eq("id", ticket.id)
    .eq("status", "In Progress");

  if (error) return { error: "Maintenance belum berhasil diselesaikan. Coba lagi, ya." };
  revalidatePath("/maintainer/tiket-maintenance");
  revalidatePath("/controller/beranda");
  revalidatePath("/dispatcher/beranda");
  return { success: "Maintenance udah selesai." };
}
