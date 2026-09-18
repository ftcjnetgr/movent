'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = { label: string; href: string; icon: string }
type NavGroup = { label: string; icon: string; items: NavItem[] }

const navByRole: Record<string, NavGroup[]> = {
  Controller: [
    {
      label: 'Monitoring',
      icon: 'home',
      items: [
        { label: 'Beranda', href: '/controller/beranda', icon: 'home' },
        { label: 'Timetable', href: '/controller/timetable', icon: 'calendar' },
        { label: 'Tiket Maintenance', href: '/controller/ticketing-maintenance', icon: 'ticket' },
      ],
    },
    {
      label: 'Laporan',
      icon: 'report',
      items: [
        { label: 'Tarik Laporan', href: '/controller/penarikan-report', icon: 'report' },
      ],
    },
    {
      label: 'Akun',
      icon: 'user',
      items: [
        { label: 'Profil', href: '/controller/profil', icon: 'user' },
        { label: 'Ganti Kata Sandi', href: '/ganti-password', icon: 'lock' },
      ],
    },
  ],
  Dispatcher: [
    {
      label: 'Penugasan',
      icon: 'clipboard',
      items: [
        { label: 'Beranda', href: '/dispatcher/beranda', icon: 'home' },
        { label: 'Riwayat Penugasan', href: '/dispatcher/riwayat-penugasan', icon: 'history' },
        { label: 'Jadwal Tambahan', href: '/dispatcher/extra-schedule', icon: 'calendar' },
        { label: 'Armada Non-TGR', href: '/dispatcher/armada-non-tgr', icon: 'truck' },
      ],
    },
    {
      label: 'Maintenance',
      icon: 'wrench',
      items: [
        { label: 'Maintenance Armada', href: '/dispatcher/maintenance-armada', icon: 'wrench' },
        { label: 'Tiket Maintenance', href: '/dispatcher/ticketing-maintenance', icon: 'ticket' },
      ],
    },
    {
      label: 'Akun',
      icon: 'user',
      items: [
        { label: 'Profil', href: '/dispatcher/profil', icon: 'user' },
        { label: 'Ganti Kata Sandi', href: '/ganti-password', icon: 'lock' },
      ],
    },
  ],
  Operation: [
    {
      label: 'Jadwal Tambahan',
      icon: 'calendar',
      items: [
        { label: 'Permintaan Jadwal Tambahan', href: '/operation/request-extra-schedule', icon: 'calendar' },
        { label: 'Riwayat Permintaan', href: '/operation/riwayat-permintaan', icon: 'history' },
      ],
    },
    {
      label: 'Akun',
      icon: 'user',
      items: [
        { label: 'Profil', href: '/operation/profil', icon: 'user' },
        { label: 'Ganti Kata Sandi', href: '/ganti-password', icon: 'lock' },
      ],
    },
  ],
  Executor: [
    {
      label: 'Tugas',
      icon: 'clipboard',
      items: [
        { label: 'Tugas Saya', href: '/executor/tugas-saya', icon: 'clipboard' },
        { label: 'Riwayat Tugas', href: '/executor/riwayat-tugas', icon: 'history' },
      ],
    },
    {
      label: 'Akun',
      icon: 'user',
      items: [
        { label: 'Profil', href: '/executor/profil', icon: 'user' },
        { label: 'Ganti Kata Sandi', href: '/ganti-password', icon: 'lock' },
      ],
    },
  ],
  Maintainer: [
    {
      label: 'Operasional',
      icon: 'home',
      items: [
        { label: 'Beranda', href: '/maintainer/beranda', icon: 'home' },
        { label: 'Timetable', href: '/maintainer/timetable', icon: 'calendar' },
      ],
    },
    {
      label: 'Maintenance',
      icon: 'wrench',
      items: [
        { label: 'Tiket Maintenance', href: '/maintainer/tiket-maintenance', icon: 'ticket' },
        { label: 'Dashboard Maintenance', href: '/maintainer/ticketing-maintenance', icon: 'report' },
      ],
    },
    {
      label: 'Akun',
      icon: 'user',
      items: [
        { label: 'Profil', href: '/maintainer/profil', icon: 'user' },
        { label: 'Ganti Kata Sandi', href: '/ganti-password', icon: 'lock' },
      ],
    },
  ],
}
const modeRoutes: Record<string, string> = {
  Controller: '/controller/beranda',
  Dispatcher: '/dispatcher/beranda',
  Operation: '/operation/request-extra-schedule',
  Executor: '/executor/tugas-saya',
  Maintainer: '/maintainer/beranda',
}

function Icon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (name) {
    case 'home':
      return <svg {...common}><path d="m3 10 9-7 9 7" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" /></svg>
    case 'report':
      return <svg {...common}><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
    case 'user':
      return <svg {...common}><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>
    case 'lock':
      return <svg {...common}><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
    case 'history':
      return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" /></svg>
    case 'calendar':
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>
    case 'truck':
      return <svg {...common}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></svg>
    case 'wrench':
      return <svg {...common}><path d="M14 6a4 4 0 0 1-5 5L4 16l4 4 5-5a4 4 0 0 1 5-5l-4-4Z" /></svg>
    case 'clipboard':
      return <svg {...common}><rect x="6" y="5" width="12" height="16" rx="2" /><path d="M9 5V3h6v2M9 10h6M9 14h6M9 18h4" /></svg>
    case 'ticket':
      return <svg {...common}><path d="M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4Z" /><path d="M12 7v2M12 15v2" /></svg>
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>
  }
}

export default function AppShellClient({
  profile,
  children,
}: {
  profile: { username: string; full_name: string; role: string }
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const currentRole =
    Object.keys(modeRoutes).find((role) => pathname.startsWith('/' + role.toLowerCase())) ??
    (profile.role === 'Super User' ? 'Controller' : profile.role)
  const navGroups = navByRole[currentRole] ?? []
  const activeGroup = navGroups.find((group) => group.items.some((item) => item.href === pathname))?.label ?? ''
  const [openGroups, setOpenGroups] = useState<string[]>([])

  useEffect(() => {
    if (!activeGroup) return
    setOpenGroups((current) => current.includes(activeGroup) ? current : [...current, activeGroup])
  }, [activeGroup])

  const closeMobile = () => setMobileOpen(false)

  function toggleGroup(label: string) {
    if (collapsed) setCollapsed(false)
    setOpenGroups((current) => current.includes(label)
      ? current.filter((item) => item !== label)
      : [...current, label])
  }

  const activeItem = navGroups.flatMap((group) => group.items).find((item) => item.href === pathname)

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <Link className="sidebar-brand" href={modeRoutes[currentRole] ?? '/controller/beranda'} onClick={closeMobile}>
            <img src="/assets/branding/movent-dark.svg" alt="MOVENT" className="sidebar-brand-logo" />
            <div className="sidebar-caption">Manajemen Pergerakan</div>
          </Link>
          <button
            type="button"
            className="sidebar-toggle desktop-only"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Buka menu samping' : 'Tutup menu samping'}
            title={collapsed ? 'Buka menu' : 'Tutup menu'}
          >
            <span aria-hidden="true">{collapsed ? '→' : '←'}</span>
          </button>
        </div>

        {profile.role === 'Super User' ? (
          <div className="mode-box">
            <span>Mode</span>
            <div className="mode-links">
              {Object.entries(modeRoutes).map(([role, href]) => (
                <Link key={role} className={currentRole === role ? 'mode-link active' : 'mode-link'} href={href} onClick={closeMobile}>
                  <span className="mode-dot" />
                  <span className="mode-link-text">{role}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <nav className="sidebar-nav sidebar-accordion" aria-label="Menu utama">
          {navGroups.map((group) => {
            const isOpen = openGroups.includes(group.label)
            const hasActiveItem = group.items.some((item) => item.href === pathname)
            const panelId = 'nav-group-' + group.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')

            return (
              <div className={`nav-group ${isOpen ? 'open' : ''} ${hasActiveItem ? 'has-active' : ''}`} key={group.label}>
                <button
                  type="button"
                  className="nav-group-toggle"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  title={collapsed ? group.label : undefined}
                >
                  <span className="nav-icon"><Icon name={group.icon} /></span>
                  <span className="nav-group-label">{group.label}</span>
                  <span className="nav-group-chevron" aria-hidden="true">⌄</span>
                </button>

                <div id={panelId} className="nav-group-items">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={pathname === item.href ? 'nav-link active' : 'nav-link'}
                      onClick={closeMobile}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="nav-icon"><Icon name={item.icon} /></span>
                      <span className="nav-link-text">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        {profile.role === 'Super User' ? (
          <div className="super-menu">
            <div className="super-title">Pengaturan</div>
            <Link href="/super-user/profil" onClick={closeMobile}><span className="nav-icon"><Icon name="user" /></span><span className="nav-link-text">Profil Super User</span></Link>
            <Link href="/ganti-password" onClick={closeMobile}><span className="nav-icon"><Icon name="lock" /></span><span className="nav-link-text">Ganti Kata Sandi</span></Link>
            <Link href="/super-user/pengelolaan-pengguna" onClick={closeMobile}><span className="nav-icon"><Icon name="user" /></span><span className="nav-link-text">Kelola Pengguna</span></Link>
            <Link href="/super-user/pengelolaan-database" onClick={closeMobile}><span className="nav-icon"><Icon name="report" /></span><span className="nav-link-text">Kelola Database</span></Link>
            <Link href="/super-user/pengelolaan-transaksi" onClick={closeMobile}><span className="nav-icon"><Icon name="clipboard" /></span><span className="nav-link-text">Kelola Transaksi</span></Link>
          </div>
        ) : null}

        <div className="sidebar-footer">
          <div className="sidebar-user-avatar">{(profile.full_name || profile.username || 'U').slice(0, 1).toUpperCase()}</div>
          <div className="sidebar-user-copy">
            <div>{profile.full_name}</div>
            <small>{profile.role}</small>
          </div>
        </div>
      </aside>

      <div className="sidebar-overlay" onClick={closeMobile} aria-hidden="true" />

      <main className="app-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="sidebar-toggle mobile-only"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label="Buka menu"
            >
              <span>☰</span>
            </button>
            <div className="topbar-title">
              <span className="role-label">{currentRole}</span>
              <span className="topbar-page">{activeItem?.label ?? currentRole}</span>
            </div>
          </div>
          <div className="topbar-user">
            <span className="topbar-user-dot" />
            {profile.username}
          </div>
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
