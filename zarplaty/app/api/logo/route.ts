import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LOGO_PATH =
  "/Users/senoth/.cursor/projects/Users-senoth-Desktop-zarplaty/assets/optimize-8808f01a-4d35-4135-a990-f842525118f1.png";

export async function GET() {
  const file = await readFile(LOGO_PATH);
  return new NextResponse(file, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
