'use client'

import { useMemo, useState } from 'react'
import ChangePasswordForm from '@/components/change-password-form'

type ProfileData = {
  full_name: string
  username: string
  nik?: string | null
  role: string
  email?: string | null
  phone_number?: string | null
  status?: string | null
}

export default function ProfilePage({
  title,
  profile,
}: {
  title: string
  profile: ProfileData
}) {
  const [section, setSection] = useState<'profile' | 'security'>('profile')

  const initials = useMemo(() => {
    const parts = profile.full_name.trim().split(/\s+/).filter(Boolean)
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U'
  }, [profile.full_name])

  const fields = [
    ['Nama Lengkap', profile.full_name],
    ['Username', profile.username],
    ...(profile.email !== undefined ? [['Email', profile.email || '-']] : []),
    ['NIK', profile.nik || '-'],
    ...(profile.phone_number !== undefined ? [['No. Telepon', profile.phone_number || '-']] : []),
    ['Role', profile.role],
    ...(profile.status !== undefined ? [['Status', profile.status || '-']] : []),
  ] as Array<[string, string]>

  return (
    <div className="profile-settings-page">
      <div className="page-heading profile-settings-heading">
        <div>
          <span className="eyebrow">{profile.role}</span>
          <h1>{title}</h1>
          <p>Atur informasi akun dan keamanan akses kamu.</p>
        </div>
      </div>

      <section className="profile-settings-hero">
        <div className="profile-settings-avatar" aria-hidden="true">{initials}</div>
        <div className="profile-settings-identity">
          <h2>{profile.full_name}</h2>
          <p>@{profile.username}</p>
        </div>
        <span className="profile-settings-role">{profile.role}</span>
      </section>

      <section className="profile-settings-workspace">
        <nav className="profile-settings-nav" aria-label="Pengaturan akun">
          <button
            type="button"
            className={section === 'profile' ? 'active' : ''}
            onClick={() => setSection('profile')}
          >
            <span>Profil</span>
            <small>Informasi akun</small>
          </button>
          <button
            type="button"
            className={section === 'security' ? 'active' : ''}
            onClick={() => setSection('security')}
          >
            <span>Keamanan</span>
            <small>Password akun</small>
          </button>
        </nav>

        <div className="profile-settings-content">
          {section === 'profile' ? (
            <div className="profile-settings-section">
              <div className="profile-settings-section-heading">
                <div>
                  <h2>Informasi Akun</h2>
                  <p>Informasi akun yang sedang digunakan.</p>
                </div>
                <span className="profile-settings-state">Profil Aktif</span>
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
                  <h2>Keamanan Akun</h2>
                  <p>Perbarui password untuk menjaga akses akun tetap aman.</p>
                </div>
              </div>
              <ChangePasswordForm first={false} />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
