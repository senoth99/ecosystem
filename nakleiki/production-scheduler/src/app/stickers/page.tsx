import { requireAuth } from "@/lib/auth";
import { StickerDashboardClient } from "@/components/stickers/StickerDashboardClient";

export default async function StickersEntryPage() {
  await requireAuth();
  return <StickerDashboardClient />;
}

