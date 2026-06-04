import { notFound } from 'next/navigation'
import { getDropPageData, getUnlinkedProducts } from '@/lib/data'
import DropView from '@/components/DropView'

export default async function DropPage({ params }: { params: Promise<{ dropId: string }> }) {
  const { dropId } = await params
  const [data, catalogProducts] = await Promise.all([getDropPageData(dropId), getUnlinkedProducts()])
  if (!data) notFound()
  return (
    <DropView
      drop={data.drop}
      items={data.items}
      itemTasks={data.itemTasks}
      collectionTasks={data.collectionTasks}
      dropIdeationTasks={data.dropIdeationTasks}
      ideationMoments={data.ideationMoments}
      catalogProducts={catalogProducts}
    />
  )
}
