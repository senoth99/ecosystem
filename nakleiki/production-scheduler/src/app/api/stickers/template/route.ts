import { NextResponse } from "next/server";

/** Временный макет наклейки для печати (SVG). Потом заменим на ваш финальный файл. */
export async function GET() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">
  <rect width="210" height="297" fill="#ffffff"/>
  <g transform="translate(20,35)">
    <rect x="0" y="0" width="170" height="90" fill="none" stroke="#111" stroke-width="0.8"/>
    <text x="85" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#111">
      YOUR LOGO HERE
    </text>
    <text x="85" y="58" text-anchor="middle" font-family="Arial, sans-serif" font-size="6.5" fill="#333">
      Макет-заглушка. Заменим на финальный.
    </text>
  </g>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}

