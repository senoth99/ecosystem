import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { appBasePath, ecosystemAuthEnabled, ecosystemLoginUrl } from "./ecosystem-gate";
import { hasEcoSession, resolveUserFromEcoSession } from "./eco-auth-bridge";

export const AUTH_COOKIE = "zarplaty-auth";

const LOGIN = "senoth";
const PASSWORD = "WillianBoltz3$";

export function isValidCredentials(login: string, password: string) {
  return login === LOGIN && password === PASSWORD;
}

export async function isAuthorized() {
  const cookieStore = await cookies();
  if (cookieStore.get(AUTH_COOKIE)?.value === "ok") return true;
  if (ecosystemAuthEnabled()) return hasEcoSession();
  return false;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  if (cookieStore.get(AUTH_COOKIE)?.value === "ok") return { source: "local" as const };
  return resolveUserFromEcoSession();
}

export async function requireAuth() {
  const ok = await isAuthorized();
  if (ok) return;
  if (ecosystemAuthEnabled()) {
    redirect(ecosystemLoginUrl(`${appBasePath()}/employees`));
  }
  redirect("/login");
}
