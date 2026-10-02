"use client";

import { useMemo, useState } from "react";
import ChangePasswordForm from "@/components/shared/change-password-form";

type ProfileData = {
  full_name: string;
  username: string;
  nik?: string | null;
  role: string;
  email?: string | null;
  phone_number?: string | null;
  status?: string | null;
  password_changed_at?: string | null;
  last_login_at?: string | null;
};

export default function ProfilePage({
  title,
  profile,
}: {
  title: string;
  profile: ProfileData;
}) {
  const [section, setSection] = useState<"profile" | "security">("profile");

  const initials = useMemo(() => {
    const parts = profile.full_name.trim().split(/\s+/).filter(Boolean);
    return (
      parts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "U"
    );
  }, [profile.full_name]);

  const formatDateTime = (value: string | null | undefined) =>
    value
      ? new Intl.DateTimeFormat("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Jakarta",
        }).format(new Date(value))
      : "-";

  const fields = [
    ["Username", profile.username],
    ["Nama Lengkap", profile.full_name],
    ["No. Telepon", profile.phone_number || "-"],
    ["Role", profile.role],
    ["Terakhir Login", formatDateTime(profile.last_login_at)],
    ["Terakhir Ganti Password", formatDateTime(profile.password_changed_at)],
  ] as Array<[string, string]>;

  return (
    <div className="profile-settings-page">
      <div className="page-heading profile-settings-heading">
        <div>
          <h1>{title}</h1>
          <p>Atur info akun dan keamanan kamu di sini, ya.</p>
        </div>
      </div>

      <section className="profile-settings-workspace">
        <nav className="profile-settings-nav" aria-label="Pengaturan akun">
          <button
            type="button"
            className={section === "profile" ? "active" : ""}
            onClick={() => setSection("profile")}
          >
            <span>Profil</span>
            <small>Informasi akun</small>
          </button>
          <button
            type="button"
            className={section === "security" ? "active" : ""}
            onClick={() => setSection("security")}
          >
            <span>Keamanan</span>
            <small>Password akun kamu</small>
          </button>
        </nav>

        <div className="profile-settings-content">
          {section === "profile" ? (
            <div className="profile-settings-section">
              <div className="profile-settings-section-heading">
                <div>
                  <h2>Info akun kamu</h2>
                  <p>Info akun yang lagi kamu pakai.</p>
                </div>
                <span className="profile-settings-state">Profil kamu</span>
              </div>

              <div className="profile-settings-fields">
                {fields.map(([label, value]) => (
                  <div className="profile-settings-field" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="profile-settings-section profile-settings-security">
              <div className="profile-settings-section-heading">
                <div>
                  <h2>Keamanan akun</h2>
                  <p>
                    Perbarui kata sandi untuk menjaga akses akun tetap aman.
                  </p>
                </div>
              </div>
              <ChangePasswordForm first={false} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
