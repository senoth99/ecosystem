import { getDropsWithStats } from '@/lib/data'
import DashboardView from '@/components/DashboardView'

export default async function ArchivePage() {
  const { drops, stats } = await getDropsWithStats()
  return <DashboardView drops={drops} stats={stats} archived />
}
