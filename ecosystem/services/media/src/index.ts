import express from "express";
import cors from "cors";
import multer from "multer";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const app = express();
const PORT = Number(process.env.PORT ?? 4003);
const ROOT = process.env.MEDIA_ROOT?.trim() || "/data/media";
const ALLOWED_HOSTS = (process.env.IMG_PROXY_HOSTS ?? "api.cashercollection.com,cdn.cashercollection.com")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

fs.mkdirSync(path.join(ROOT, "uploads"), { recursive: true });
fs.mkdirSync(path.join(ROOT, "cache"), { recursive: true });

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

app.use(cors({ origin: true }));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/proxy", async (req, res) => {
  const url = typeof req.query.url === "string" ? req.query.url : "";
  if (!url) return res.status(400).json({ error: "url required" });
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: "invalid url" });
  }
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return res.status(403).json({ error: "host not allowed" });
  }
  const key = createHash("sha1").update(url).digest("hex");
  const cachePath = path.join(ROOT, "cache", key);
  if (fs.existsSync(cachePath)) {
    const buf = fs.readFileSync(cachePath);
    res.setHeader("Content-Type", "image/jpeg");
    return res.send(buf);
  }
  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).end();
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(cachePath, buf);
    const ct = r.headers.get("content-type") ?? "image/jpeg";
    res.setHeader("Content-Type", ct);
    res.send(buf);
  } catch {
    res.status(502).json({ error: "fetch failed" });
  }
});

app.post("/upload/:bucket/:id", upload.single("file"), (req, res) => {
  const bucket = req.params.bucket?.replace(/[^a-z0-9_-]/gi, "") ?? "misc";
  const id = req.params.id?.replace(/[^a-z0-9_-]/gi, "") ?? "file";
  if (!req.file) return res.status(400).json({ error: "file required" });
  const dir = path.join(ROOT, "uploads", bucket, id);
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(req.file.originalname) || ".jpg";
  const filename = `${Date.now()}${ext}`;
  const full = path.join(dir, filename);
  fs.writeFileSync(full, req.file.buffer);
  res.json({ path: `/media/${bucket}/${id}/${filename}`, url: `/api/media/file/${bucket}/${id}/${filename}` });
});

app.get("/file/:bucket/:id/:name", (req, res) => {
  const full = path.join(ROOT, "uploads", req.params.bucket, req.params.id, req.params.name);
  if (!full.startsWith(ROOT) || !fs.existsSync(full)) return res.status(404).end();
  res.sendFile(full);
});

app.listen(PORT, () => console.log(`media-service on ${PORT}, root=${ROOT}`));
