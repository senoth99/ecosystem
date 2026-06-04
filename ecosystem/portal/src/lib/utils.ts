import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function ecoFetch(path: string, init?: RequestInit) {
  return fetch(`/api/eco${path}`, { credentials: "include", ...init });
}
