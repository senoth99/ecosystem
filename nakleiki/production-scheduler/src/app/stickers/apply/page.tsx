import { requireAuth } from "@/lib/auth";
import { StickerApplyClient } from "@/components/stickers/StickerApplyClient";

export default async function StickerApplyPage() {
  await requireAuth();
  return <StickerApplyClient />;
}

