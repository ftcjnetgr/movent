'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

type NavItem = { label: string; href: string; icon: string }
type NavGroup = { label: string; icon: string; items: NavItem[] }

const navByRole: Record<string, NavGroup[]> = {
  Controller: [
    { label: 'Monitoring', icon: 'home', items: [
      { label: 'Homepage', href: '/controller/beranda', icon: 'home' },
    ]},
    { label: 'Schedule', icon: 'calendar', items: [
      { label: 'By Plan', href: '/controller/timetable/by-plan', icon: 'calendar' },
      { label: 'Live Tracking', href: '/controller/timetable/live-tracking', icon: 'truck' },
    ]},
    { label: 'Penarikan Report', icon: 'report', items: [
      { label: 'Penarikan Report', href: '/controller/penarikan-report', icon: 'report' },
    ]},
    { label: 'Setting', icon: 'user', items: [
      { label: 'Profil', href: '/controller/profil', icon: 'user' },
      { label: 'Ganti Kata Sandi', href: '/ganti-password', icon: 'lock' },
    ]},
  ],
  Dispatcher: [
    { label: 'Penugasan', icon: 'clipboard', items: [
      { label: 'Homepage', href: '/dispatcher/beranda', icon: 'home' },
      { label: 'Riwayat Penugasan', href: '/dispatcher/riwayat-penugasan', icon: 'history' },
    ]},
    { label: 'Extra Schedule', icon: 'calendar', items: [
      { label: 'Extra Schedule', href: '/dispatcher/extra-schedule', icon: 'calendar' },
    ]},
    { label: 'Armada Non TGR', icon: 'truck', items: [
      { label: 'Armada Non TGR', href: '/dispatcher/armada-non-tgr', icon: 'truck' },
    ]},
    { label: 'Setting', icon: 'user', items: [
      { label: 'Profil', href: '/dispatcher/profil', icon: 'user' },
      { label: 'Ganti Kata Sandi', href: '/ganti-password', icon: 'lock' },
    ]},
  ],
  Executor: [
    { label: 'Tugas', icon: 'clipboard', items: [
      { label: 'Tugas Saya', href: '/executor/tugas-saya', icon: 'clipboard' },
      { label: 'Riwayat Tugas', href: '/executor/riwayat-tugas', icon: 'history' },
    ]},
    { label: 'Akun', icon: 'user', items: [
      { label: 'Profil', href: '/executor/profil', icon: 'user' },
      { label: 'Ganti Kata Sandi', href: '/ganti-password', icon: 'lock' },
    ]},
  ],
  Maintainer: [
    { label: 'Operasional', icon: 'home', items: [
      { label: 'Homepage', href: '/maintainer/beranda', icon: 'home' },
    ]},
    { label: 'Setting', icon: 'user', items: [
      { label: 'Profil', href: '/maintainer/profil', icon: 'user' },
      { label: 'Ganti Kata Sandi', href: '/ganti-password', icon: 'lock' },
    ]},
  ],
  Operation: [
    { label: 'Operasional', icon: 'home', items: [
      { label: 'Homepage', href: '/operation/beranda', icon: 'home' },
    ]},
    { label: 'Extra Schedule', icon: 'calendar', items: [
      { label: 'Riwayat Extra Schedule', href: '/operation/riwayat-permintaan', icon: 'history' },
    ]},
    { label: 'Setting', icon: 'user', items: [
      { label: 'Profil', href: '/operation/profil', icon: 'user' },
      { label: 'Ganti Kata Sandi', href: '/ganti-password', icon: 'lock' },
    ]},
  ],
}

const superUserGroup: NavGroup = {
  label: 'Super User',
  icon: 'report',
  items: [
    { label: 'Setting', href: '/super-user/profil', icon: 'user' },
    { label: 'Manajemen User', href: '/super-user/pengelolaan-pengguna', icon: 'user' },
    { label: 'Manajemen Database', href: '/super-user/pengelolaan-database', icon: 'report' },
  ],
}

const modeRoutes: Record<string, string> = {
  Controller: '/controller/beranda',
  Dispatcher: '/dispatcher/beranda',
  Executor: '/executor/tugas-saya',
  Maintainer: '/maintainer/beranda',
  Operation: '/operation/beranda',
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
      return <svg {...common}><path d="M3 12a9 9 1 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" /></svg>
    case 'calendar':
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></svg>
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
  const router = useRouter()
  const [navigating, setNavigating] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem('movent:sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<string[]>([])

  const currentRole =
    Object.keys(modeRoutes).find((role) => pathname.startsWith('/' + role.toLowerCase())) ??
    (profile.role === 'Super User' ? 'Controller' : profile.role)

  const baseNavGroups = navByRole[currentRole] ?? []
  const navGroups = useMemo(
    () => profile.role === 'Super User' ? [...baseNavGroups, superUserGroup] : baseNavGroups,
    [currentRole, profile.role],
  )

  const activeItem = useMemo(
    () => navGroups
      .flatMap((group) => group.items.map((item) => ({ ...item, group: group.label })))
      .filter((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
      .sort((a, b) => b.href.length - a.href.length)[0],
    [navGroups, pathname],
  )

  const activeGroup = activeItem?.group ?? ''

  useEffect(() => {
    try {
      window.localStorage.setItem('movent:sidebar-collapsed', String(collapsed))
    } catch {
      // ignore browser storage errors
    }
  }, [collapsed])

  useEffect(() => {
    if (!activeGroup) return
    setOpenGroups((current) => current.includes(activeGroup) ? current : [...current, activeGroup])
  }, [activeGroup])

  useEffect(() => {
    try {
      const key = `movent:open-nav-groups:${currentRole}`
      const saved = window.sessionStorage.getItem(key)
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) setOpenGroups(parsed.filter((item): item is string => navGroups.some((group) => group.label === item)))
    } catch {
      // ignore invalid browser storage
    }
  }, [currentRole, navGroups])

  useEffect(() => {
    try {
      window.sessionStorage.setItem(`movent:open-nav-groups:${currentRole}`, JSON.stringify(openGroups))
    } catch {
      // ignore browser storage errors
    }
  }, [currentRole, openGroups])

  useEffect(() => {
    setNavigating(false)
    setMobileOpen(false)
  }, [pathname])

  const closeMobile = () => setMobileOpen(false)

  function navigateTo(href: string) {
    if (href === pathname) return
    setNavigating(true)
    closeMobile()
    router.push(href)
  }

  function toggleGroup(label: string) {
    if (collapsed) {
      setCollapsed(false)
      setOpenGroups((current) => current.includes(label) ? current : [...current, label])
      return
    }
    setOpenGroups((current) => current.includes(label)
      ? current.filter((item) => item !== label)
      : [...current, label])
  }

  return (
    <div className={`app-shell role-${currentRole.toLowerCase().replace(/[^a-z0-9]+/g, '-')} ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''} ${navigating ? 'is-navigating' : ''}`}>
      {navigating ? <div className="route-progress" aria-label="Memuat halaman" /> : null}

      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand-row">
            <Link
              className="sidebar-brand"
              href={modeRoutes[currentRole] ?? '/controller/beranda'}
              onClick={(event) => { event.preventDefault(); navigateTo(modeRoutes[currentRole] ?? '/controller/beranda') }}
              aria-label="MOVENT"
            >
              <img src="/assets/branding/movent-dark.svg" alt="MOVENT" className="sidebar-brand-logo" />
              <span className="sidebar-brand-mark" aria-hidden="true">M</span>
            </Link>
            <button
              type="button"
              className="sidebar-toggle desktop-only"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? 'Tampilkan menu samping' : 'Sembunyikan menu samping'}
              title={collapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
            >
              <span aria-hidden="true">{collapsed ? '›' : '‹'}</span>
            </button>
          </div>
        </div>

        <nav className="sidebar-nav sidebar-accordion" aria-label="Menu utama">
          {navGroups.map((group) => {
            const isOpen = openGroups.includes(group.label)
            const hasActiveItem = group.items.some((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
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
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={isActive ? 'nav-link active' : 'nav-link'}
                        onClick={(event) => { event.preventDefault(); navigateTo(item.href) }}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className="nav-icon"><Icon name={item.icon} /></span>
                        <span className="nav-link-text">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

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
              <span className="topbar-page">
                {activeGroup ? `${activeGroup} / ` : ''}{activeItem?.label ?? currentRole}
              </span>
            </div>
          </div>

          <div className="topbar-actions">
            {profile.role === 'Super User' ? (
              <div className="topbar-mode" aria-label="Pilih mode">
                <span className="topbar-mode-label">Mode</span>
                <div className="topbar-mode-links">
                  {Object.entries(modeRoutes).map(([role, href]) => (
                    <Link
                      key={role}
                      className={currentRole === role ? 'topbar-mode-link active' : 'topbar-mode-link'}
                      href={href}
                      onClick={(event) => { event.preventDefault(); navigateTo(href) }}
                    >
                      {role}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="topbar-user">
              <span className="topbar-user-dot" />
              {profile.username}
            </div>
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
