'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type NavItem = { label: string; href: string; icon: string }
type NavGroup = { label: string; icon: string; items: NavItem[] }

const navByRole: Record<string, NavGroup[]> = {
  Controller: [
    { label: 'Dashboard', icon: 'home', items: [
      { label: 'Penugasan', href: '/controller/beranda', icon: 'clipboard' },
      { label: 'Ticketing Maintenance', href: '/controller/beranda/ticketing', icon: 'ticket' },
    ] },
    { label: 'Schedule', icon: 'calendar', items: [
      { label: 'By Plan', href: '/controller/timetable?view=plan', icon: 'calendar' },
      { label: 'Live Tracking', href: '/controller/timetable?view=live', icon: 'truck' },
    ]},
    { label: 'Penarikan Report', icon: 'report', items: [{ label: 'Penarikan Report', href: '/controller/penarikan-report', icon: 'report' }] },
    { label: 'Setting', icon: 'user', items: [{ label: 'Setting', href: '/controller/profil', icon: 'user' }] },
  ],
  Dispatcher: [
    { label: 'Dashboard', icon: 'home', items: [{ label: 'Dashboard', href: '/dispatcher/beranda', icon: 'home' }] },
    { label: 'Penugasan', icon: 'clipboard', items: [{ label: 'Riwayat Penugasan', href: '/dispatcher/riwayat-penugasan', icon: 'history' }] },
    { label: 'Extra Schedule', icon: 'calendar', items: [{ label: 'Extra Schedule', href: '/dispatcher/extra-schedule', icon: 'calendar' }] },
    { label: 'Armada Non TGR', icon: 'truck', items: [{ label: 'Armada Non TGR', href: '/dispatcher/armada-non-tgr', icon: 'truck' }] },
    { label: 'Maintenance Armada', icon: 'wrench', items: [{ label: 'Maintenance Armada', href: '/dispatcher/maintenance-armada', icon: 'wrench' }] },
    { label: 'Setting', icon: 'user', items: [{ label: 'Setting', href: '/dispatcher/profil', icon: 'user' }] },
  ],
  Executor: [
    { label: 'Tugas', icon: 'clipboard', items: [{ label: 'Tugas Saya', href: '/executor/tugas-saya', icon: 'clipboard' }, { label: 'Riwayat Tugas', href: '/executor/riwayat-tugas', icon: 'history' }] },
    { label: 'Setting', icon: 'user', items: [{ label: 'Setting', href: '/executor/profil', icon: 'user' }] },
  ],
  Maintainer: [
    { label: 'Dashboard', icon: 'home', items: [{ label: 'Dashboard', href: '/maintainer/beranda', icon: 'home' }] },
    { label: 'Ticketing', icon: 'ticket', items: [{ label: 'Ticketing', href: '/maintainer/tiket-maintenance', icon: 'ticket' }] },
    { label: 'Penarikan Report', icon: 'report', items: [{ label: 'Penarikan Report', href: '/maintainer/penarikan-report', icon: 'report' }] },
    { label: 'Setting', icon: 'user', items: [{ label: 'Setting', href: '/maintainer/profil', icon: 'user' }] },
  ],
  Operation: [
    { label: 'Dashboard', icon: 'home', items: [{ label: 'Dashboard', href: '/operation/beranda', icon: 'home' }] },
    { label: 'Extra Schedule', icon: 'calendar', items: [{ label: 'Riwayat Extra Schedule', href: '/operation/riwayat-permintaan', icon: 'history' }] },
    { label: 'Setting', icon: 'user', items: [{ label: 'Setting', href: '/operation/profil', icon: 'user' }] },
  ],
}

const superUserGroup: NavGroup = {
  label: 'Super User',
  icon: 'settings',
  items: [
    { label: 'Setting', href: '/super-user/profil', icon: 'user' },
    { label: 'Manajemen User', href: '/super-user/pengelolaan-pengguna', icon: 'user' },
    { label: 'Manajemen Database', href: '/super-user/pengelolaan-database', icon: 'database' },
    { label: 'Manajemen Transaksi', href: '/super-user/pengelolaan-transaksi', icon: 'clipboard' },
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
  const common = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (name) {
    case 'home': return <svg {...common}><path d="m3 10 9-7 9 7" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" /></svg>
    case 'calendar': return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></svg>
    case 'truck': return <svg {...common}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></svg>
    case 'report': return <svg {...common}><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
    case 'user': return <svg {...common}><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>
    case 'lock': return <svg {...common}><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
    case 'history': return <svg {...common}><path d="M3 12a9 9 1 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" /></svg>
    case 'clipboard': return <svg {...common}><rect x="6" y="5" width="12" height="16" rx="2" /><path d="M9 5V3h6v2M9 10h6M9 14h6M9 18h4" /></svg>
    case 'wrench': return <svg {...common}><path d="M14 6a4 4 0 0 1-5 5L4 16l4 4 5-5a4 4 0 0 1 5-5l-4-4Z" /></svg>
    case 'ticket': return <svg {...common}><path d="M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4Z" /><path d="M12 7v2M12 15v2" /></svg>
    case 'database': return <svg {...common}><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" /></svg>
    case 'settings': return <svg {...common}><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /><circle cx="12" cy="12" r="4" /></svg>
    case 'logout': return <svg {...common}><path d="M10 5H5v14h5" /><path d="M14 8l4 4-4 4" /><path d="M18 12H9" /></svg>
    default: return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>
  }
}

export default function AppShellClient({ profile, children }: { profile: { username: string; full_name: string; role: string }; children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [navigating, setNavigating] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<string[]>([])
  const currentRole = Object.keys(modeRoutes).find((role) => pathname.startsWith('/' + role.toLowerCase())) ?? (profile.role === 'Super User' ? 'Controller' : profile.role)
  const navGroups = useMemo(() => profile.role === 'Super User' ? [...(navByRole[currentRole] ?? []), superUserGroup] : (navByRole[currentRole] ?? []), [currentRole, profile.role])
  const activeItem = useMemo(() => {
    return navGroups
      .flatMap(group => group.items.map(item => ({ ...item, group: group.label })))
      .filter((item) => {
        const [itemPath, itemQuery] = item.href.split('?')
        if (pathname !== itemPath && !pathname.startsWith(itemPath + '/')) return false
        if (itemQuery) {
          const expected = new URLSearchParams(itemQuery).get('view')
          return searchParams.get('view') === expected
        }
        return true
      })
      .sort((a, b) => b.href.length - a.href.length)[0]
  }, [navGroups, pathname, searchParams.toString()])
  const isItemActive = (item: NavItem) => activeItem?.href === item.href
  const searchKey = searchParams.toString()
  const currentUrl = searchKey ? `${pathname}?${searchKey}` : pathname

  useEffect(() => { setNavigating(false); setMobileOpen(false) }, [pathname, searchKey])

  async function logout() { const supabase = createClient(); await supabase.auth.signOut(); router.replace('/login') }

  function navigateTo(href: string) {
    if (href === currentUrl) return
    setNavigating(true)
    setMobileOpen(false)
    router.push(href)
  }

  return (
    <div className={'app-shell role-' + currentRole.toLowerCase().replace(/[^a-z0-9]+/g, '-') + (mobileOpen ? ' sidebar-mobile-open' : '') + (navigating ? ' is-navigating' : '')}>
      {navigating ? <div className="route-progress" /> : null}
      <aside className="sidebar">
        <div className="sidebar-top">
          <Link className="sidebar-brand" href={modeRoutes[currentRole] ?? '/controller/beranda'} onClick={(e) => { e.preventDefault(); navigateTo(modeRoutes[currentRole] ?? '/controller/beranda') }}>
            <img src="/assets/branding/movent-light.svg" alt="MOVENT" className="sidebar-brand-logo" />
          </Link>
          <div className="sidebar-role">
            <div className="sidebar-role-name">{profile.role === 'Super User' ? 'Super User' : currentRole}</div>
            {profile.role === 'Super User' ? (
              <label className="mode-select"><span>Mode</span><select value={currentRole} onChange={(e) => navigateTo(modeRoutes[e.target.value])}>{Object.keys(modeRoutes).map(role => <option key={role}>{role}</option>)}</select></label>
            ) : null}
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Menu utama">
          {navGroups.map(group => {
            const hasActive = group.items.some(isItemActive)
            return (
              <div className={'nav-group ' + (hasActive ? 'has-active' : '')} key={group.label}>
                {group.items.length === 1 ? (
                  <Link href={group.items[0].href} className={'nav-link nav-link-direct ' + (hasActive ? 'active' : '')} onClick={(e) => { e.preventDefault(); navigateTo(group.items[0].href) }}>
                    <span className="nav-icon"><Icon name={group.items[0].icon} /></span><span>{group.label}</span>
                  </Link>
                ) : (
                  <>
                    <button type="button" className="nav-group-title" onClick={() => setOpenGroups((current) => current.includes(group.label) ? current.filter((item) => item !== group.label) : [...current, group.label])}>
                      <span className="nav-icon"><Icon name={group.icon} /></span><span>{group.label}</span><span className="nav-group-chevron">{openGroups.includes(group.label) ? '⌃' : '⌄'}</span>
                    </button>
                    <div className={'nav-group-items ' + (openGroups.includes(group.label) ? 'is-open' : 'is-closed')}>
                      {group.items.map(item => {
                        const active = isItemActive(item)
                        return <Link key={item.href} href={item.href} className={'nav-link ' + (active ? 'active' : '')} onClick={(e) => { e.preventDefault(); navigateTo(item.href) }}>
                          <span className="nav-icon"><Icon name={item.icon} /></span><span>{item.label}</span>
                        </Link>
                      })}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="sidebar-logout" onClick={logout}><span className="nav-icon"><Icon name="logout" /></span><span>Logout</span></button>
        </div>
      </aside>

      <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      <main className="app-content">
        <header className="topbar">
          <button className="mobile-menu" type="button" onClick={() => setMobileOpen(v => !v)} aria-label="Buka menu">☰</button>
          <div className="topbar-search"><span className="search-icon">⌕</span><input aria-label="Pencarian" placeholder="Cari tugas, armada, atau lokasi..." /></div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Notifikasi">♧</button>
            <div className="topbar-user"><span className="topbar-avatar">{(profile.full_name || profile.username || 'U').slice(0,1).toUpperCase()}</span><span>{profile.full_name || profile.username}</span><small>{currentRole}</small><span className="user-chevron">⌄</span></div>
          </div>
        </header>
        <section className="page-content">{children}</section>
        <footer className="app-footer"><span>Part of FTC Go Project</span><span>Developed by Fleet Traffic Control</span></footer>
      </main>
    </div>
  )
}
