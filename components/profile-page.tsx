import { getCurrentProfile } from '@/lib/server/profile'

export default async function ProfilePage({ title }: { title: string }) {
  const profile = await getCurrentProfile()
  return (
    <>
    <div className="page-heading"><div><span className="eyebrow">{profile.role}</span><h1>{title}</h1><p>Ini informasi profil kamu yang sedang login.</p></div></div>
      <section className="section-grid two-column">
        <div className="metric-card"><span>Nama</span><strong>{profile.full_name}</strong></div>
        <div className="metric-card"><span>Username</span><strong>{profile.username}</strong></div>
        <div className="metric-card"><span>NIK</span><strong>{profile.nik}</strong></div>
        <div className="metric-card"><span>Role</span><strong>{profile.role}</strong></div>
      </section>
    </>
  )
}
