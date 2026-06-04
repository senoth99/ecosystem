import { requireAuthWithZone } from "@/lib/auth";

export default async function CheckInLayout({ children }: { children: React.ReactNode }) {
  await requireAuthWithZone();
  return children;
}
