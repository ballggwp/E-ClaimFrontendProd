// lib/fetchJson.ts
import { signOut } from "next-auth/react";

export async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  let payload: any;
  try {
    payload = await res.json();
  } catch {
    // non‐JSON → treat as error
    if (res.status === 401) {
      signOut({ callbackUrl: "/login" });
      throw new Error("Session expired");
    }
    throw new Error(res.statusText);
  }

  // 1) HTTP 401 Unauthorized
  if (res.status === 401) {
    signOut({ callbackUrl: "/login" });
    throw new Error(payload.message || "Session expired");
  }

  // 2) 200 OK but backend says invalid token
  if (payload?.message === "Invalid token") {
    signOut({ callbackUrl: "/login" });
    throw new Error("Session expired");
  }

  // 3) any other non‐ok
  if (!res.ok) {
    throw new Error(payload.message || res.statusText);
  }

  return payload;
}
