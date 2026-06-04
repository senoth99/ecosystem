'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logoutAction } from '@/app/actions'
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
  const router = useRouter()
  const dropMatch = pathname.match(/^\/drops\/([^/]+)/)
  const dropId = dropMatch?.[1]
  const isItem = pathname.includes('/items/')
  const isProductDetail = /^\/products\/[^/]+$/.test(pathname)

  const navTabs = tabs ?? mainNavTabs(pathname)

  const tabClass = (active: boolean) =>
    `app-shell-tab${active ? ' app-shell-tab--active' : ''}`

  return (
    <div className="app-shell-root flex min-h-screen flex-col bg-[#050505]">
      <header className="shrink-0 border-b border-[#3D5248]">
        <div className="app-shell-header-grid">
          <nav className="app-shell-nav justify-self-start">
            {navTabs.map(t => (
              <Link key={t.href} href={t.href} className={tabClass(t.active)}>
                {t.label}
              </Link>
            ))}
            {dropId && !isItem && (
              <Link href={`/drops/${dropId}`} className={tabClass(false)}>
                ДРОП
              </Link>
            )}
            {isItem && <span className={tabClass(false)}>ПОЗИЦИЯ</span>}
            {isProductDetail && <span className={tabClass(false)}>ПРОДУКТ</span>}
          </nav>
          <button type="button" onClick={() => router.push('/')} className="app-shell-icon-btn justify-self-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/optimize.gif" alt="CASHER" className="h-10 object-contain" />
          </button>
          <div className="flex justify-self-end">
            <form action={logoutAction}>
              <button type="submit" title="Выход" className="app-shell-icon-btn text-[#C8C8C8]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </form>
          </div>
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
