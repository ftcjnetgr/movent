'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navByRole: Record<string, { label: string; href: string }[]> = {
  Controller: [
    { label: 'Beranda', href: '/controller/beranda' },
    { label: 'Penarikan Laporan', href: '/controller/penarikan-report' },
    { label: 'Profil', href: '/controller/profil' },
    { label: 'Ganti Password', href: '/ganti-password' },
  ],
  Dispatcher: [
    { label: 'Beranda', href: '/dispatcher/beranda' },
    { label: 'Riwayat Penugasan', href: '/dispatcher/riwayat-penugasan' },
    { label: 'Extra Schedule', href: '/dispatcher/extra-schedule' },
    { label: 'Armada Non-TGR', href: '/dispatcher/armada-non-tgr' },
    { label: 'Maintenance Armada', href: '/dispatcher/maintenance-armada' },
    { label: 'Profil', href: '/dispatcher/profil' },
    { label: 'Ganti Password', href: '/ganti-password' },
  ],
  Operation: [
    { label: 'Permintaan Extra Schedule', href: '/operation/request-extra-schedule' },
    { label: 'Riwayat Permintaan', href: '/operation/riwayat-permintaan' },
    { label: 'Profil', href: '/operation/profil' },
    { label: 'Ganti Password', href: '/ganti-password' },
  ],
  Executor: [
    { label: 'Tugas Saya', href: '/executor/tugas-saya' },
    { label: 'Riwayat Tugas', href: '/executor/riwayat-tugas' },
    { label: 'Profil', href: '/executor/profil' },
    { label: 'Ganti Password', href: '/ganti-password' },
  ],
  Maintainer: [
    { label: 'Beranda', href: '/maintainer/beranda' },
    { label: 'Tiket Maintenance', href: '/maintainer/tiket-maintenance' },
    { label: 'Profil', href: '/maintainer/profil' },
    { label: 'Ganti Password', href: '/ganti-password' },
  ],
}

const modeRoutes: Record<string, string> = {
  Controller: '/controller/beranda',
  Dispatcher: '/dispatcher/beranda',
  Operation: '/operation/request-extra-schedule',
  Executor: '/executor/tugas-saya',
  Maintainer: '/maintainer/beranda',
}

export default function AppShellClient({
  profile,
  children,
}: {
  profile: { username: string; full_name: string; role: string }
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const currentRole = Object.keys(modeRoutes).find((role) => pathname.startsWith('/' + role.toLowerCase())) ?? (profile.role === 'Super User' ? 'Controller' : profile.role)
  const nav = navByRole[currentRole] ?? []

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <img
            src="/assets/branding/movent-dark.svg"
            alt="MOVENT"
            className="sidebar-brand-logo"
          />
          <div className="sidebar-caption">Movement Management</div>
        </div>

        {profile.role === 'Super User' ? (
          <div className="mode-box">
            <span>Mode peran</span>
            <div className="mode-links">
              {Object.entries(modeRoutes).map(([role, href]) => (
                <Link key={role} className={currentRole === role ? 'mode-link active' : 'mode-link'} href={href}>
                  {role}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <nav className="sidebar-nav" aria-label="Menu utama">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? 'nav-link active' : 'nav-link'}>
              {item.label}
            </Link>
          ))}
        </nav>

        {profile.role === 'Super User' ? (
          <div className="super-menu">
            <div className="super-title">Super User</div>
            <Link href="/super-user/profil">Profil Super User</Link>
            <Link href="/ganti-password">Ganti Password</Link>
            <Link href="/super-user/pengelolaan-pengguna">Pengelolaan Pengguna</Link>
            <Link href="/super-user/pengelolaan-database">Pengelolaan Database</Link>
            <Link href="/super-user/pengelolaan-transaksi">Pengelolaan Transaksi</Link>
          </div>
        ) : null}

        <div className="sidebar-footer">
          <div>{profile.full_name}</div>
          <small>{profile.role}</small>
        </div>
      </aside>

      <main className="app-content">
        <header className="topbar">
          <div>
            <span className="role-label">{currentRole}</span>
          </div>
          <div className="topbar-user">{profile.username}</div>
        </header>
        <section className="page-content">{children}</section>
        <footer className="app-footer">
          <span>Part of FTC Go Project</span>
          <span>Developed by Fleet Traffic Control</span>
        </footer>
      </main>
    </div>
  )
}
