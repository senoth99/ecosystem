import { getProductsListData } from '@/lib/data'
import ProductsView from '@/components/ProductsView'

export default async function ProductsPage() {
  const products = await getProductsListData()
  return <ProductsView products={products} />
}
