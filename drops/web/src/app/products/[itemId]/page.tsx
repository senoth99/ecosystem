import { notFound } from 'next/navigation'
import { getProductCatalogData } from '@/lib/data'
import ProductCatalogView from '@/components/ProductCatalogView'

export default async function ProductPage({
  params,
}: {
  params: Promise<{ itemId: string }>
}) {
  const { itemId } = await params
  const data = await getProductCatalogData(itemId)
  if (!data) notFound()
  return <ProductCatalogView item={data.item} drops={data.drops} tasksByStage={data.tasksByStage} />
}
