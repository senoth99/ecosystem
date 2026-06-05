import { cookies } from "next/headers";
import {
  ECO_COOKIE,
  ecosystemAuthEnabled,
  verifyEcoSession,
  type EcoSession,
} from "./ecosystem-gate";

export async function getEcoSession(): Promise<EcoSession | null> {
  if (!ecosystemAuthEnabled()) return null;
  const token = (await cookies()).get(ECO_COOKIE)?.value;
  if (!token) return null;
  return verifyEcoSession(token);
}

export async function resolveUserFromEcoSession(): Promise<EcoSession | null> {
  return getEcoSession();
}

export async function hasEcoSession(): Promise<boolean> {
  return (await getEcoSession()) != null;
}
