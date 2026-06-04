/** @returns {string} basePath без завершающего слэша */
export function readBasePath() {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH ?? "";
  return raw.replace(/\/$/, "");
}

export function withBasePath(config = {}) {
  const basePath = readBasePath();
  if (!basePath) return config;
  return { ...config, basePath };
}
