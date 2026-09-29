"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  SESSION_ACTIVITY_COOKIE,
  SESSION_ACTIVITY_MAX_AGE_MS,
  SESSION_ACTIVITY_MAX_AGE_SECONDS,
} from "@/lib/auth/session-activity";

function readActivityAt() {
  const match = document.cookie
    .split("; ")
    .find((item) => item.startsWith(SESSION_ACTIVITY_COOKIE + "="));

  if (!match) return null;

  const value = decodeURIComponent(match.split("=").slice(1).join("="));
  const timestamp = Number(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function writeActivityAt(timestamp = Date.now()) {
  document.cookie =
    SESSION_ACTIVITY_COOKIE +
    "=" +
    encodeURIComponent(String(timestamp)) +
    "; Path=/; Max-Age=" +
    SESSION_ACTIVITY_MAX_AGE_SECONDS +
    "; SameSite=Lax" +
    (window.location.protocol === "https:" ? "; Secure" : "");
}

export default function SessionActivity() {
  const pathname = usePathname();
  const lastWriteRef = useRef(0);
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (pathname.startsWith("/login") || pathname.startsWith("/auth")) return;

    const supabase = createClient();

    async function expireSession() {
      if (redirectingRef.current) return;
      redirectingRef.current = true;
      document.cookie =
        SESSION_ACTIVITY_COOKIE +
        "=; Path=/; Max-Age=0; SameSite=Lax" +
        (window.location.protocol === "https:" ? "; Secure" : "");
      await supabase.auth.signOut();
      window.location.replace("/login");
    }

    function isExpired() {
      const activityAt = readActivityAt();
      return !activityAt || Date.now() - activityAt >= SESSION_ACTIVITY_MAX_AGE_MS;
    }

    if (isExpired()) {
      void expireSession();
      return;
    }

    writeActivityAt();
    lastWriteRef.current = Date.now();

    function touchActivity() {
      const now = Date.now();
      if (now - lastWriteRef.current < 10000) return;
      lastWriteRef.current = now;
      writeActivityAt(now);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") touchActivity();
    }

    function handleActivity() {
      touchActivity();
    }

    const options: AddEventListenerOptions = { passive: true };
    window.addEventListener("scroll", handleActivity, options);
    window.addEventListener("pointerdown", handleActivity, options);
    window.addEventListener("touchstart", handleActivity, options);
    window.addEventListener("keydown", handleActivity);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const timer = window.setInterval(() => {
      if (isExpired()) void expireSession();
    }, 30000);

    return () => {
      window.removeEventListener("scroll", handleActivity, options);
      window.removeEventListener("pointerdown", handleActivity, options);
      window.removeEventListener("touchstart", handleActivity, options);
      window.removeEventListener("keydown", handleActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(timer);
    };
  }, [pathname]);

  return null;
}
