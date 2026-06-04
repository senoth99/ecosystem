import { notFound } from 'next/navigation'
import { getItemPageData } from '@/lib/data'
import ItemView from '@/components/ItemView'

export default async function ItemPage({
  params,
}: {
  params: Promise<{ dropId: string; itemId: string }>
}) {
  const { dropId, itemId } = await params
  const data = await getItemPageData(dropId, itemId)
  if (!data) notFound()
  return (
    <ItemView
      drop={data.drop}
      item={data.item}
      tasksByStage={data.tasksByStage}
    />
  )
}
