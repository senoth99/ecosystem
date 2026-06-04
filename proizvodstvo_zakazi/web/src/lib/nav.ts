export function mainNavTabs(pathname: string) {
  const isCatalog = pathname.startsWith('/catalog')
  return [
    { label: 'ГЛАВНАЯ', href: '/', active: pathname === '/' },
    { label: 'СПРАВОЧНИКИ', href: '/catalog', active: isCatalog },
  ]
}
