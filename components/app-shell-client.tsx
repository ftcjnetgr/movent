'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type NavItem = { label: string; href: string; icon: string }
type NavGroup = { label: string; icon: string; items: NavItem[]; nonCollapsible?: boolean }

const navByRole: Record<string, NavGroup[]> = {
  Controller: [
    { label: 'Alert', icon: 'bell', items: [{ label: 'Alert', href: '/controller/alert', icon: 'bell' }] },
    { label: 'Dashboard', icon: 'home', items: [{ label: 'Dashboard', href: '/controller/beranda', icon: 'home' }] },
    { label: 'By Plan', icon: 'calendar', items: [{ label: 'By Plan', href: '/controller/timetable?view=plan', icon: 'calendar' }] },
    { label: 'Live Tracking', icon: 'truck', items: [{ label: 'Live Tracking', href: '/controller/timetable?view=live', icon: 'truck' }] },
    { label: 'Penarikan Report', icon: 'report', items: [{ label: 'Penarikan Report', href: '/controller/penarikan-report', icon: 'report' }] },
    { label: 'Pengaturan', icon: 'user', items: [{ label: 'Pengaturan', href: '/controller/profil', icon: 'user' }] },
  ],
  Dispatcher: [

    { label: 'Alert', icon: 'bell', items: [
      { label: 'Penugasan', href: '/dispatcher/alert/penugasan', icon: 'clipboard' },
      { label: 'Maintenance', href: '/dispatcher/alert/ticketing-maintenance', icon: 'wrench' },
    ] },
    { label: 'Jadwal Tambahan', icon: 'calendar', items: [{ label: 'Jadwal Tambahan', href: '/dispatcher/extra-schedule', icon: 'calendar' }] },
    { label: 'Armada Non TGR', icon: 'truck', items: [{ label: 'Armada Non TGR', href: '/dispatcher/armada-non-tgr', icon: 'truck' }] },
    { label: 'Pengaturan', icon: 'user', items: [{ label: 'Pengaturan', href: '/dispatcher/profil', icon: 'user' }] },    { label: 'Dashboard', icon: 'home', items: [
      { label: 'Penugasan', href: '/dispatcher/riwayat-penugasan', icon: 'clipboard' },
      { label: 'Maintenance', href: '/dispatcher/maintenance-armada', icon: 'wrench' },
    ], nonCollapsible: true },

  ],
  Executor: [
    { label: 'Alert', icon: 'bell', items: [
      { label: 'Penugasan', href: '/executor/alert/penugasan', icon: 'clipboard' },
      { label: 'Maintenance', href: '/executor/alert/ticketing-maintenance', icon: 'wrench' },
    ] },
    { label: 'Tugas Saya', icon: 'clipboard', items: [{ label: 'Tugas Saya', href: '/executor/tugas-saya', icon: 'clipboard' }] },
    { label: 'Riwayat Tugas', icon: 'history', items: [{ label: 'Riwayat Tugas', href: '/executor/riwayat-tugas', icon: 'history' }] },
    { label: 'Pengaturan', icon: 'user', items: [{ label: 'Pengaturan', href: '/executor/profil', icon: 'user' }] },
  ],
  Maintainer: [
    { label: 'Alert', icon: 'bell', items: [
      { label: 'Penugasan', href: '/maintainer/alert/penugasan', icon: 'clipboard' },
      { label: 'Maintenance', href: '/maintainer/alert/ticketing-maintenance', icon: 'wrench' },
    ] },
    { label: 'Dashboard', icon: 'home', items: [{ label: 'Dashboard', href: '/maintainer/beranda', icon: 'home' }] },
    { label: 'Maintenance', icon: 'wrench', items: [{ label: 'Maintenance', href: '/maintainer/tiket-maintenance', icon: 'wrench' }] },
    { label: 'Penarikan Report', icon: 'report', items: [{ label: 'Penarikan Report', href: '/maintainer/penarikan-report', icon: 'report' }] },
    { label: 'Pengaturan', icon: 'user', items: [{ label: 'Pengaturan', href: '/maintainer/profil', icon: 'user' }] },
  ],
  Operation: [
    { label: 'Alert', icon: 'bell', items: [
      { label: 'Penugasan', href: '/operation/alert/penugasan', icon: 'clipboard' },
      { label: 'Maintenance', href: '/operation/alert/ticketing-maintenance', icon: 'wrench' },
    ] },
    { label: 'Dashboard', icon: 'home', items: [{ label: 'Dashboard', href: '/operation/beranda', icon: 'home' }] },
    { label: 'Riwayat Extra Schedule', icon: 'calendar', items: [{ label: 'Riwayat Extra Schedule', href: '/operation/riwayat-permintaan', icon: 'history' }] },
    { label: 'Pengaturan', icon: 'user', items: [{ label: 'Pengaturan', href: '/operation/profil', icon: 'user' }] },
  ],
}

const superUserNav: NavGroup[] = [
  {
    label: 'Alert',
    icon: 'bell',
    items: [
      { label: 'Penugasan', href: '/alert/penugasan', icon: 'clipboard' },
      { label: 'Maintenance', href: '/alert/ticketing-maintenance', icon: 'wrench' },
    ],
  },
  {
    label: 'Beranda',
    icon: 'home',
    items: [{ label: 'Beranda', href: '/controller/beranda', icon: 'home' }],
  },
  {
    label: 'Operasional',
    icon: 'calendar',
    items: [
      { label: 'Schedule', href: '/controller/timetable?view=plan', icon: 'calendar' },
      { label: 'Penugasan', href: '/controller/beranda', icon: 'clipboard' },
      { label: 'Maintenance', href: '/controller/beranda/ticketing', icon: 'ticket' },
      { label: 'Monitoring', href: '/controller/timetable?view=live', icon: 'truck' },
    ],
  },
  {
    label: 'Master Data',
    icon: 'database',
    items: [
      { label: 'Armada', href: '/super-user/pengelolaan-database?db=fleets', icon: 'truck' },
      { label: 'Executor', href: '/super-user/pengelolaan-database?db=executors', icon: 'user' },
      { label: 'Lokasi', href: '/super-user/pengelolaan-database?db=locations', icon: 'location' },
      { label: 'Produk', href: '/super-user/pengelolaan-database?db=products', icon: 'box' },
      { label: 'List Maintenance', href: '/super-user/pengelolaan-database?db=maintenance_lists', icon: 'wrench' },
      { label: 'Schedule', href: '/super-user/pengelolaan-database?db=schedules', icon: 'calendar' },
    ],
  },
  {
    label: 'Manajemen',
    icon: 'settings',
    items: [
      { label: 'Manajemen User', href: '/super-user/pengelolaan-pengguna', icon: 'user' },
      { label: 'Manajemen Database', href: '/super-user/pengelolaan-database', icon: 'database' },
      { label: 'Manajemen Transaksi', href: '/super-user/pengelolaan-transaksi', icon: 'clipboard' },
    ],
  },
  {
    label: 'Laporan',
    icon: 'report',
    items: [{ label: 'Penarikan Report', href: '/controller/penarikan-report', icon: 'report' }],
  },
  {
    label: 'Pengaturan',
    icon: 'settings',
    items: [{ label: 'Pengaturan Sistem', href: '/super-user/profil', icon: 'settings' }],
  },
]

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
    case 'bell': return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>
    case 'location': return <svg {...common}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
    case 'box': return <svg {...common}><path d="m12 3 8 4-8 4-8-4 8-4Z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></svg>
    case 'upload': return <svg {...common}><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 19h14" /></svg>
    case 'settings': return <svg {...common}><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /><circle cx="12" cy="12" r="4" /></svg>
    case 'logout': return <svg {...common}><path d="M10 5H5v14h5" /><path d="M14 8l4 4-4 4" /><path d="M18 12H9" /></svg>
    default: return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>
  }
}

export default function AppShellClient({ profile, children, alertCounts }: { profile: { username: string; full_name: string; role: string }; children: React.ReactNode; alertCounts: { task: number; maintenance: number } }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<string[]>([])
  const currentRole = Object.keys(modeRoutes).find((role) => pathname.startsWith('/' + role.toLowerCase())) ?? (profile.role === 'Super User' ? 'Controller' : profile.role)
  const isDashboardDateFilter = pathname === '/controller/beranda' || pathname === '/controller/beranda/ticketing'
  const jakartaToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const queryFilterFrom = searchParams.get('from') ?? jakartaToday
  const queryFilterTo = searchParams.get('to') ?? queryFilterFrom
  const [filterFrom, setFilterFrom] = useState(queryFilterFrom)
  const [filterTo, setFilterTo] = useState(queryFilterTo)
  const totalAlertCount = alertCounts.task + alertCounts.maintenance
  const alertCountForItem = (label: string) => label === 'Penugasan' ? alertCounts.task : label === 'Maintenance' ? alertCounts.maintenance : 0
  const navGroups = useMemo(() => {
    const roleNav = navByRole[currentRole] ?? []
    if (profile.role !== 'Super User') return roleNav
    return [
      ...roleNav,
      {
        label: 'Manajemen',
        icon: 'settings',
        items: [
          { label: 'Manajemen User', href: '/super-user/pengelolaan-pengguna', icon: 'user' },
          { label: 'Manajemen Database', href: '/super-user/pengelolaan-database', icon: 'database' },
          { label: 'Manajemen Transaksi', href: '/super-user/pengelolaan-transaksi', icon: 'clipboard' },
        ],
      },
    ]
  }, [currentRole, profile.role])
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

  useEffect(() => {
    setMobileOpen(false)
    setFilterFrom(queryFilterFrom)
    setFilterTo(queryFilterTo)
    const activeGroups = navGroups.filter(group => group.items.some(isItemActive)).map(group => group.label)
    setOpenGroups(current => Array.from(new Set([...current, ...activeGroups])))
  }, [pathname, searchKey, navGroups, queryFilterFrom, queryFilterTo])

  async function logout() { const supabase = createClient(); await supabase.auth.signOut(); router.replace('/login') }

  function navigateTo(href: string) {
    if (href === currentUrl) return
    setMobileOpen(false)
    router.push(href)
  }

  return (
    <div className={'app-shell role-' + currentRole.toLowerCase().replace(/[^a-z0-9]+/g, '-') + (profile.role === 'Super User' ? ' is-super-user' : '') + (mobileOpen ? ' sidebar-mobile-open' : '')}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <Link className="sidebar-brand" href={modeRoutes[currentRole] ?? '/controller/beranda'} >
            <img src="/assets/branding/movent-dark.svg" alt="MOVENT" className="sidebar-brand-logo" />
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
                {group.nonCollapsible ? (
                  <>
                    <div className="nav-group-title nav-group-title-static">
                      <span className="nav-icon nav-icon-with-badge"><Icon name={group.icon} />{group.label === 'Alert' && totalAlertCount > 0 ? <span className="alert-nav-dot" aria-label="Ada alert aktif" /> : null}</span><span>{group.label}</span>
                    </div>
                    <div className="nav-group-items nav-group-items-static">
                      {group.items.map(item => {
                        const active = isItemActive(item)
                        return <Link key={item.href} href={item.href} className={'nav-link nav-dashboard-button ' + (active ? 'active' : '')} >
                          <span className="nav-icon nav-icon-with-badge"><Icon name={item.icon} />{group.label === 'Alert' && alertCountForItem(item.label) > 0 ? <span className="alert-nav-badge" style={{ color: "#fff", backgroundColor: "#dc2626" }}>{alertCountForItem(item.label) > 99 ? '99+' : alertCountForItem(item.label)}</span> : null}</span><span>{item.label}</span>
                        </Link>
                      })}
                    </div>
                  </>
                ) : group.items.length === 1 ? (
                  <Link href={group.items[0].href} className={'nav-link nav-link-direct ' + (hasActive ? 'active' : '')} >
                    <span className="nav-icon nav-icon-with-badge"><Icon name={group.items[0].icon} />{group.label === 'Alert' && totalAlertCount > 0 ? <span className="alert-nav-dot" aria-label="Ada alert aktif" /> : null}</span><span>{group.label}</span>
                  </Link>
                ) : (
                  <>
                    <button type="button" className={'nav-group-title ' + (hasActive ? 'is-active ' : '') + (group.label === 'Manajemen' ? 'manajemen-nav-title' : '')} onClick={() => setOpenGroups((current) => current.includes(group.label) ? current.filter((item) => item !== group.label) : [...current, group.label])}>
                      <span className="nav-icon nav-icon-with-badge"><Icon name={group.icon} />{group.label === 'Alert' && totalAlertCount > 0 ? <span className="alert-nav-dot" aria-label="Ada alert aktif" /> : null}</span><span>{group.label}</span><span className="nav-group-chevron">{openGroups.includes(group.label) ? '⌃' : '⌄'}</span>
                    </button>
                    <div className={'nav-group-items ' + (openGroups.includes(group.label) ? 'is-open' : 'is-closed')}>
                      {group.items.map(item => {
                        const active = isItemActive(item)
                        return <Link key={item.href} href={item.href} className={'nav-link ' + (active ? 'active' : '')} >
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
          <button type="button" className="sidebar-logout" onClick={logout}><span className="nav-icon"><Icon name="logout" /></span><span>Keluar</span></button>
          <div className="sidebar-credit">
            <span>Part of FTC Go Project</span>
            <span>Developed by Fleet Traffic Control</span>
          </div>
        </div>
      </aside>

      <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      <main className="app-content">
        <header className="topbar">
          <button className="mobile-menu" type="button" onClick={() => setMobileOpen(v => !v)} aria-label="Buka menu navigasi">☰</button>
          <div className="topbar-search"><span className="search-icon">⌕</span><input aria-label="Pencarian" placeholder="Cari tugas, armada, lokasi..." /></div>
          {isDashboardDateFilter ? (
            <form className="topbar-date-filter" method="get" action={pathname}>
              <label>
                <span>Dari</span>
                <input type="date" name="from" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
              </label>
              <label>
                <span>Sampai</span>
                <input type="date" name="to" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} min={filterFrom} />
              </label>
              <button type="submit">Terapkan</button>
              <button type="button" className="topbar-date-reset" onClick={() => router.push(pathname)}>Reset</button>
            </form>
          ) : null}
        </header>
        <section className="page-content">{children}</section>
      </main>
    </div>
  )
}
