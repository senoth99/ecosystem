import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const AUTH_COOKIE = "zarplaty-auth";

const LOGIN = "senoth";
const PASSWORD = "WillianBoltz3$";

export function isValidCredentials(login: string, password: string) {
  return login === LOGIN && password === PASSWORD;
}

export async function isAuthorized() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE)?.value === "ok";
}

export async function requireAuth() {
  const ok = await isAuthorized();
  if (!ok) redirect("/login");
}
