import { requireAuth } from "@/lib/auth";
import { StickerRewardClient } from "@/components/stickers/StickerRewardClient";

export default async function StickerRewardPage() {
  await requireAuth();
  return <StickerRewardClient />;
}

