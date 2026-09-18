import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'

export default async function SuperUserProfilePage() {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()
  const { data } = await admin
    .from('user_profiles')
    .select('full_name, username, email, nik, phone_number, role, status')
    .eq('id', profile.id)
    .maybeSingle()

  if (!data) return null

  return (
    <>
    <div className="page-heading">
        <div>
          <span className="eyebrow">Super User</span>
          <h1>Profil</h1>
          <p>Ini informasi profil kamu yang sedang login.</p>
        </div>
      </div>
      <section className="section-grid two-column">
        <div className="metric-card"><span>Nama</span><strong>{data.full_name}</strong></div>
        <div className="metric-card"><span>Username</span><strong>{data.username}</strong></div>
        <div className="metric-card"><span>Email</span><strong>{data.email}</strong></div>
        <div className="metric-card"><span>NIK</span><strong>{data.nik}</strong></div>
        <div className="metric-card"><span>No. telepon</span><strong>{data.phone_number ?? '-'}</strong></div>
        <div className="metric-card"><span>Role</span><strong>{data.role}</strong></div>
        <div className="metric-card"><span>Status</span><strong>{data.status}</strong></div>
      </section>)
}
