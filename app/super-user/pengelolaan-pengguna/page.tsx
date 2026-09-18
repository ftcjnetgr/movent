import AppShell from '@/components/app-shell'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
import { lockUserAction, unlockUserAction, updateUserProfileAction } from './actions'

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

export default async function UserManagementPage() {
  const profile = await getCurrentProfile()
  if (profile.role !== 'Super User') return null

  const admin = createAdminClient()
  const { data: users } = await admin
    .from('user_profiles')
    .select('id, username, email, nik, full_name, phone_number, role, status, must_change_password, failed_login_attempts, auth_user_id')
    .order('full_name')

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Super User</span>
          <h1>Kelola Pengguna</h1>
          <p>Atur akses dan data pengguna dari sini.</p>
        </div>
      </div>

      <section className="data-table-card">
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
                  <td>{user.role}</td>
                  <td><span className={'status-badge status-' + String(user.status).toLowerCase()}>{user.status}</span></td>
                  <td>{user.auth_user_id ? 'Terhubung' : 'Belum terhubung'}</td>
                  <td>{user.failed_login_attempts}</td>
                  <td>
                    <details>
                      <summary className="link-button">Edit</summary>
                      <form action={updateUserProfileFormAction} className="data-form compact-form" style={{marginTop:12}}>
                        <input type="hidden" name="id" value={user.id} />
                        <label>Username<input name="username" defaultValue={user.username} required /></label>
                        <label>Email<input name="email" type="email" defaultValue={user.email} required /></label>
                        <label>NIK<input name="nik" defaultValue={user.nik} required /></label>
                        <label>Nama lengkap<input name="fullName" defaultValue={user.full_name} required /></label>
                        <label>No. telepon<input name="phoneNumber" defaultValue={user.phone_number ?? ''} /></label>
                        <label>Role<select name="role" defaultValue={user.role} required>{['Controller','Dispatcher','Operation','Executor','Maintainer','Super User'].map((role) => <option key={role}>{role}</option>)}</select></label>
                        <button type="submit">Simpan perubahan</button>
                      </form>
                    </details>
                    <div style={{marginTop:8}}>
                      {user.status === 'Locked' ? (
                        <form action={unlockUserFormAction}><input type="hidden" name="id" value={user.id} /><button type="submit">Buka akses</button></form>
                      ) : (
                        <form action={lockUserFormAction}><input type="hidden" name="id" value={user.id} /><button type="submit" className="secondary-button">Kunci akun</button></form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!(users ?? []).length ? <tr><td colSpan={6}><div className="empty-state">Belum ada pengguna.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  )
}
