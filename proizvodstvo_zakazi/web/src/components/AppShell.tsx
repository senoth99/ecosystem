'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { mainNavTabs } from '@/lib/nav'

export default function AppShell({
  title,
  tabs,
  actions,
  children,
}: {
  title: React.ReactNode
  tabs?: { label: string; href: string; active: boolean }[]
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const navTabs = tabs ?? mainNavTabs(pathname)

  const tabClass = (active: boolean) =>
    `app-shell-tab${active ? ' app-shell-tab--active' : ''}`

  return (
    <div className="app-shell-root flex min-h-screen flex-col bg-[#050505]">
      <header className="shrink-0 border-b border-[#3D5248]">
        <div className="app-shell-header-grid">
          <nav className="app-shell-nav">
            {navTabs.map(t => (
              <Link key={t.href} href={t.href} className={tabClass(t.active)}>
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="app-shell-title-row">
        <h1 className="app-shell-title text-white">{title}</h1>
        {actions && <div className="app-shell-actions">{actions}</div>}
      </div>
      <main className="app-shell-main">{children}</main>
    </div>
  )
}
