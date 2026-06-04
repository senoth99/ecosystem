import { requireAuth } from "@/lib/auth";
import { StickerDailyClient } from "@/components/stickers/StickerDailyClient";

export default async function StickerDailyPage() {
  await requireAuth();
  return <StickerDailyClient />;
}

