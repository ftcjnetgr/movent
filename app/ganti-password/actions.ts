"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const roleHome: Record<string, string> = {
  Controller: "/controller/beranda",
  Dispatcher: "/dispatcher/beranda",
  Operation: "/operation/beranda",
  Executor: "/executor/tugas-saya",
  Maintainer: "/maintainer/beranda",
  "Super User": "/controller/beranda",
};

export async function changePasswordAction(
  _state: { error?: string },
  formData: FormData,
) {
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 6) {
    return { error: "Kata sandi baru minimal 6 karakter, ya." };
  }

  if (newPassword === "123456") {
    return {
      error:
        "Kata sandi baru nggak boleh sama dengan kata sandi bawaan 123456.",
    };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Password-nya belum sama. Cek lagi, ya." };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId || typeof userId !== "string") {
    redirect("/login");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("id, role, status")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (!profile) {
    return { error: "Data profil kamu belum ditemukan." };
  }

  if (profile.status === "Locked") {
    return {
      error:
        "Akun kamu sedang terkunci. Hubungi Super User untuk membukanya lagi.",
    };
  }

  const { error: passwordError } = await admin.auth.admin.updateUserById(
    userId,
    { password: newPassword },
  );

  if (passwordError) {
    return { error: "Password belum berhasil diubah. Coba lagi, ya." };
  }

  await admin
    .from("user_profiles")
    .update({
      must_change_password: false,
      failed_login_attempts: 0,
      status: "Active",
      locked_at: null,
    })
    .eq("id", profile.id);

  redirect(roleHome[profile.role] ?? "/login");
}
