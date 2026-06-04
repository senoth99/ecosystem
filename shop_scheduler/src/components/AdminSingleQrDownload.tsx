"use client";

import { AdminQrDownloadButton } from "@/components/AdminQrDownloadButton";

export function AdminSingleQrDownload({ zoneId, zoneName }: { zoneId: string; zoneName: string }) {
  return <AdminQrDownloadButton zoneId={zoneId} zoneName={zoneName} />;
}
