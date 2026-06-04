import { getDropsWithStats } from '@/lib/data'
import DashboardView from '@/components/DashboardView'

export default async function HomePage() {
  const { drops, stats } = await getDropsWithStats()
  return <DashboardView drops={drops} stats={stats} />
}
