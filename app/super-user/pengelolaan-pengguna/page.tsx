import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
import { addUserAction, importUsersAction, lockUserAction, unlockUserAction, updateUserProfileAction } from './actions'
import DatabaseActionPreview from '@/components/database-action-preview'
import DatabaseEditPreview from '@/components/database-edit-preview'
function roleLabel(role: string) {
  const labels: Record<string, string> = {
    Controller: 'Controller',
    Dispatcher: 'Dispatcher',
    Operation: 'Operasional',
    Executor: 'Executor',
    Maintainer: 'Maintainer',
    'Super User': 'Super User',
  }
  return labels[role] ?? role
}

function userStatusLabel(status: string) {
  return status === 'Active' ? 'Aktif' : status === 'Locked' ? 'Terkunci' : status
}


async function lockUserFormAction(formData: FormData) {
  'use server'
  await lockUserAction(formData)
}

async function unlockUserFormAction(formData: FormData) {
  'use server'
  await unlockUserAction(formData)
}

async function updateUserProfileFormAction(formData: FormData) {
  'use server'
  await updateUserProfileAction(formData)
}

async function addUserFormAction(formData: FormData) {
  'use server'
  await addUserAction(formData)
}

async function importUsersFormAction(formData: FormData) {
  'use server'
  await importUsersAction(formData)
}

export default async function UserManagementPage() {
  const profile = await getCurrentProfile()
  if (profile.role !== 'Super User') return null

  const admin = createAdminClient()
  const { data: users } = await admin
    .from('user_profiles')
    .select('id, username, email, nik, full_name, phone_number, role, status, must_change_password, failed_login_attempts, auth_user_id')
    .order('full_name')

  return (
    <>
    <div className="page-heading">
        <div>
          <h1>Kelola Pengguna</h1>
          <p>Atur akses dan data pengguna dari sini.</p>
        </div>
      </div>

      <section className="user-management-actions section-block">
        <DatabaseActionPreview title="Import banyak data">
          <p className="muted">Kolom wajib: username, email, nik, full_name, role. Kolom opsional: phone_number, status.</p>
          <p className="muted">Password awal untuk user baru mengikuti mekanisme login awal aplikasi.</p>
          <form action={importUsersFormAction} className="data-form database-action-form">
            <label>File CSV / XLSX<input type="file" name="file" accept=".csv,.xlsx" required /></label>
            <button type="submit">Import data</button>
          </form>
        </DatabaseActionPreview>

        <DatabaseActionPreview title="Tambah data">
          <form action={addUserFormAction} className="data-form compact-form database-action-form">
            <label>Username<input name="username" required /></label>
            <label>Email<input name="email" type="email" required /></label>
            <label>NIK<input name="nik" required /></label>
            <label>Nama lengkap<input name="fullName" required /></label>
            <label>No. telepon<input name="phoneNumber" /></label>
            <label>Role<select name="role" defaultValue="Controller" required>{['Controller','Dispatcher','Operation','Executor','Maintainer','Super User'].map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
            <label>Status<select name="status" defaultValue="Active" required><option value="Active">Active</option><option value="Locked">Locked</option></select></label>
            <button type="submit">Tambah data</button>
          </form>
        </DatabaseActionPreview>
      </section>

      <section className="data-table-card user-management-table-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Auth</th><th>Percobaan Login Gagal</th><th>Aksi</th></tr></thead>
            <tbody>
              {(users ?? []).map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.full_name}</strong>
                    <div className="muted">{user.username} · {user.nik}</div>
                  </td>
                  <td>{roleLabel(user.role)}</td>
                  <td><span className={'status-badge status-' + String(user.status).toLowerCase()}>{userStatusLabel(user.status)}</span></td>
                  <td>{user.auth_user_id ? 'Terhubung' : 'Belum terhubung'}</td>
                  <td>{user.failed_login_attempts}</td>
                  <td>
                    <div className="admin-row-actions">
                    <DatabaseEditPreview>
                      <form action={updateUserProfileFormAction} className="data-form compact-form database-action-form">
                        <input type="hidden" name="id" value={user.id} />
                        <label>Username<input name="username" defaultValue={user.username} required /></label>
                        <label>Email<input name="email" type="email" defaultValue={user.email} required /></label>
                        <label>NIK<input name="nik" defaultValue={user.nik} required /></label>
                        <label>Nama lengkap<input name="fullName" defaultValue={user.full_name} required /></label>
                        <label>No. telepon<input name="phoneNumber" defaultValue={user.phone_number ?? ''} /></label>
                        <label>Role<select name="role" defaultValue={user.role} required>{['Controller','Dispatcher','Operation','Executor','Maintainer','Super User'].map((role) => <option key={role}>{role}</option>)}</select></label>
                        <button type="submit">Simpan perubahan</button>
                      </form>
                    </DatabaseEditPreview>
                    <div className="admin-row-action-secondary admin-user-lock-actions">
                      <form action={lockUserFormAction}>
                        <input type="hidden" name="id" value={user.id} />
                        <button type="submit" className="user-action-lock" disabled={user.status === 'Locked'}>
                          Kunci akun
                        </button>
                      </form>
                      <form action={unlockUserFormAction}>
                        <input type="hidden" name="id" value={user.id} />
                        <button type="submit" className="user-action-unlock" disabled={user.status !== 'Locked'}>
                          Buka akun
                        </button>
                      </form>
                    </div>
                    </div>
                  </td>
                </tr>
              ))}
              {!(users ?? []).length ? <tr><td colSpan={6}><div className="empty-state">Belum ada pengguna.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
