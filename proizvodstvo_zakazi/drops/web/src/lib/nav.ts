export function mainNavTabs(pathname: string) {
  const isProducts = pathname.startsWith('/products')
  return [
    { label: 'ДРОПЫ', href: '/', active: !isProducts },
    { label: 'ПРОДУКТЫ', href: '/products', active: isProducts },
  ]
}
