import { getCurrentProfile } from '@/lib/server/profile'
import ChangePasswordForm from '@/components/change-password-form'

export default async function ProfilePage({ title }: { title: string }) {
  const profile = await getCurrentProfile()
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{profile.role}</span>
          <h1>{title}</h1>
          <p>Profil dan pengaturan akun kamu ada di sini.</p>
        </div>
      </div>

      <section className="section-grid two-column setting-grid">
        <div className="metric-card">
          <span>Nama</span>
          <strong>{profile.full_name}</strong>
        </div>
        <div className="metric-card">
          <span>Username</span>
          <strong>{profile.username}</strong>
        </div>
        <div className="metric-card">
          <span>NIK</span>
          <strong>{profile.nik}</strong>
        </div>
        <div className="metric-card">
          <span>Role</span>
          <strong>{profile.role}</strong>
        </div>
      </section>

      <section className="section-block">
        <ChangePasswordForm first={false} />
      </section>
    </>
  )
}
