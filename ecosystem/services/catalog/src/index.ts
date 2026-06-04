import express from "express";
import cors from "cors";

const app = express();
const PORT = Number(process.env.PORT ?? 4002);
const BASE = process.env.CASHER_API_BASE?.trim() ?? "https://api.cashercollection.com";

let cache: { at: number; data: unknown } | null = null;
const CACHE_MS = 60_000;

app.use(cors({ origin: true }));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/products", async (_req, res) => {
  try {
    if (cache && Date.now() - cache.at < CACHE_MS) {
      return res.json(cache.data);
    }
    const r = await fetch(`${BASE}/products`, { next: { revalidate: 60 } } as RequestInit);
    if (!r.ok) return res.status(r.status).json({ error: "Upstream error" });
    const data = await r.json();
    cache = { at: Date.now(), data };
    res.json(data);
  } catch (e) {
    console.error("[catalog]", e);
    res.status(502).json({ error: "Catalog unavailable" });
  }
});

app.listen(PORT, () => console.log(`catalog-service on ${PORT}`));
