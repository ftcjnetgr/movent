import AppShell from '@/components/app-shell'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
import { lockUserAction, unlockUserAction, updateUserProfileAction } from './actions'

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
          <h1>Pengelolaan Pengguna</h1>
          <p>Kunci, buka kunci, dan edit data pengguna.</p>
        </div>
      </div>

      <section className="data-table-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Auth</th><th>Gagal Login</th><th>Aksi</th></tr></thead>
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
                      <form action={updateUserProfileAction} className="data-form compact-form" style={{marginTop:12}}>
                        <input type="hidden" name="id" value={user.id} />
                        <label>Username<input name="username" defaultValue={user.username} required /></label>
                        <label>Email<input name="email" type="email" defaultValue={user.email} required /></label>
                        <label>NIK<input name="nik" defaultValue={user.nik} required /></label>
                        <label>Nama lengkap<input name="fullName" defaultValue={user.full_name} required /></label>
                        <label>No. telepon<input name="phoneNumber" defaultValue={user.phone_number ?? ''} /></label>
                        <label>Role<select name="role" defaultValue={user.role} required>{['Controller','Dispatcher','Operation','Executor','Maintainer','Super User'].map((role) => <option key={role}>{role}</option>)}</select></label>
                        <button type="submit">Simpan data</button>
                      </form>
                    </details>
                    <div style={{marginTop:8}}>
                      {user.status === 'Locked' ? (
                        <form action={unlockUserAction}><input type="hidden" name="id" value={user.id} /><button type="submit">Buka kunci</button></form>
                      ) : (
                        <form action={lockUserAction}><input type="hidden" name="id" value={user.id} /><button type="submit" className="secondary-button">Kunci akun</button></form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!(users ?? []).length ? <tr><td colSpan={6}><div className="empty-state">Belum ada user.</div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  )
}
