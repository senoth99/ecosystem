/** Клиентские хелперы для Mini App (без server imports). */

export function getTelegramWebApp() {
  if (typeof window === "undefined") return undefined;
  return window.Telegram?.WebApp;
}

/** Mini App WebView, обычный in-app браузер Telegram или десктоп-клиент. */
export function isLikelyTelegramMiniAppContext(): boolean {
  if (typeof window === "undefined") return false;
  if (getTelegramWebApp()) return true;
  const params = new URLSearchParams(window.location.search);
  if (params.has("tgWebAppPlatform") || params.has("tgWebAppVersion")) return true;
  return /Telegram/i.test(navigator.userAgent ?? "");
}

/** initData из WebApp или hash (старые клиенты). */
export function readTelegramInitData(): string {
  const fromWebApp = getTelegramWebApp()?.initData?.trim();
  if (fromWebApp) return fromWebApp;

  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  if (hash) {
    const fromHash = new URLSearchParams(hash).get("tgWebAppData")?.trim();
    if (fromHash) return fromHash;
  }

  return "";
}

export function prepareTelegramWebApp() {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  try {
    webApp.ready();
    webApp.expand();
  } catch {
    /* ignore */
  }
}
