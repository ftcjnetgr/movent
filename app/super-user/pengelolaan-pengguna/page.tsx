import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/server/profile";
import {
  addUserAction,
  importUsersAction,
  lockUserAction,
  unlockUserAction,
  updateUserProfileAction,
} from "./actions";
import DatabaseActionPreview from "@/components/shared/database/action-preview";
import DatabaseUbahPreview from "@/components/shared/database/edit-preview";
function roleLabel(role: string) {
  const labels: Record<string, string> = {
    Controller: "Controller",
    Dispatcher: "Dispatcher",
    Operation: "Operasional",
    Executor: "Executor",
    Maintainer: "Maintainer",
    "Super User": "Super User",
  };
  return labels[role] ?? role;
}

function userStatusLabel(status: string) {
  return status === "Active"
    ? "Aktif"
    : status === "Locked"
      ? "Terkunci"
      : status;
}

async function lockUserFormAction(formData: FormData) {
  "use server";
  return await lockUserAction(formData);
}

async function unlockUserFormAction(formData: FormData) {
  "use server";
  return await unlockUserAction(formData);
}

async function updateUserProfileFormAction(formData: FormData) {
  "use server";
  return await updateUserProfileAction(formData);
}

async function addUserFormAction(formData: FormData) {
  "use server";
  return await addUserAction(formData);
}

async function importUsersFormAction(formData: FormData) {
  "use server";
  return await importUsersAction(formData);
}

export default async function UserManagementPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "Super User") return null;

  const admin = createAdminClient();
  const { data: users } = await admin
    .from("user_profiles")
    .select(
      "id, username, email, nik, full_name, phone_number, role, status, must_change_password, failed_login_attempts, auth_user_id",
    )
    .order("full_name");

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Yuk, kelola pengguna</h1>
          <p>Atur akses dan data pengguna di sini, ya.</p>
        </div>
      </div>

      <section className="user-management-actions section-block">
        <DatabaseActionPreview title="Mau tambah dari file?">
          <p className="muted">
            Isi file dengan kolom wajib: username, email, NIK, nama lengkap, dan
            role. Nomor telepon serta status boleh diisi kalau ada.
          </p>
          <p className="muted">
            Pengguna baru akan mendapat kata sandi awal sesuai aturan login
            aplikasi.
          </p>
          <form
            action={importUsersFormAction}
            className="data-form database-action-form"
          >
            <label>
              File CSV atau XLSX
              <input type="file" name="file" accept=".csv,.xlsx" required />
            </label>
            <button type="submit">Import pengguna</button>
          </form>
        </DatabaseActionPreview>

        <DatabaseActionPreview title="Tambah pengguna">
          <form
            action={addUserFormAction}
            className="data-form compact-form database-action-form"
          >
            <label>
              Nama pengguna
              <input name="username" required />
            </label>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              NIK
              <input name="nik" required />
            </label>
            <label>
              Nama lengkap
              <input name="fullName" required />
            </label>
            <label>
              Nomor telepon
              <input name="phoneNumber" />
            </label>
            <label>
              Role
              <select name="role" defaultValue="Controller" required>
                {[
                  "Controller",
                  "Dispatcher",
                  "Operation",
                  "Executor",
                  "Maintainer",
                  "Super User",
                ].map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select name="status" defaultValue="Active" required>
                <option value="Active">Aktif</option>
                <option value="Locked">Terkunci</option>
              </select>
            </label>
            <button type="submit">Tambah pengguna</button>
          </form>
        </DatabaseActionPreview>
      </section>

      <section className="data-table-card user-management-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pengguna</th>
                <th>Peran</th>
                <th>Status</th>
                <th>Akun</th>
                <th>Gagal masuk</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.full_name}</strong>
                    <div className="muted">
                      {user.username} · {user.nik}
                    </div>
                  </td>
                  <td>{roleLabel(user.role)}</td>
                  <td>
                    <span
                      className={
                        "status-badge status-" +
                        String(user.status).toLowerCase()
                      }
                    >
                      {userStatusLabel(user.status)}
                    </span>
                  </td>
                  <td>
                    {user.auth_user_id ? "Terhubung" : "Belum nyambung"}
                  </td>
                  <td>{user.failed_login_attempts}</td>
                  <td>
                    <div className="admin-row-actions">
                      <DatabaseUbahPreview>
                        <form
                          action={updateUserProfileFormAction}
                          className="data-form compact-form database-action-form"
                        >
                          <input type="hidden" name="id" value={user.id} />
                          <label>
                            Nama pengguna
                            <input
                              name="username"
                              defaultValue={user.username}
                              required
                            />
                          </label>
                          <label>
                            Email
                            <input
                              name="email"
                              type="email"
                              defaultValue={user.email}
                              required
                            />
                          </label>
                          <label>
                            NIK
                            <input
                              name="nik"
                              defaultValue={user.nik}
                              required
                            />
                          </label>
                          <label>
                            Nama lengkap
                            <input
                              name="fullName"
                              defaultValue={user.full_name}
                              required
                            />
                          </label>
                          <label>
                            Nomor telepon
                            <input
                              name="phoneNumber"
                              defaultValue={user.phone_number ?? ""}
                            />
                          </label>
                          <label>
                            Role
                            <select
                              name="role"
                              defaultValue={user.role}
                              required
                            >
                              {[
                                "Controller",
                                "Dispatcher",
                                "Operation",
                                "Executor",
                                "Maintainer",
                                "Super User",
                              ].map((role) => (
                                <option key={role}>{role}</option>
                              ))}
                            </select>
                          </label>
                          <button type="submit">Simpan perubahan</button>
                        </form>
                      </DatabaseUbahPreview>
                      <div className="admin-row-action-secondary admin-user-lock-actions">
                        <form action={lockUserFormAction}>
                          <input type="hidden" name="id" value={user.id} />
                          <button
                            type="submit"
                            className="user-action-lock"
                            disabled={user.status === "Locked"}
                          >
                            Kunci
                          </button>
                        </form>
                        <form action={unlockUserFormAction}>
                          <input type="hidden" name="id" value={user.id} />
                          <button
                            type="submit"
                            className="user-action-unlock"
                            disabled={user.status !== "Locked"}
                          >
                            Buka
                          </button>
                        </form>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {!(users ?? []).length ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      Belum ada pengguna. Coba tambah pengguna pertama di sini.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
