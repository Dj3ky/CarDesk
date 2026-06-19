"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

interface InactivityWatcherProps {
  timeoutMinutes: number;
  locale: string;
}

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

export function InactivityWatcher({ timeoutMinutes, locale }: InactivityWatcherProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (timeoutMinutes <= 0) return;

    const ms = timeoutMinutes * 60 * 1000;

    function logout() {
      signOut({ redirectTo: `/${locale}/login` });
    }

    function reset() {
      lastActivityRef.current = Date.now();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, ms);
    }

    // On mobile, setTimeout is frozen when the screen locks or app is backgrounded.
    // When the user returns, check wall-clock elapsed time and log out if needed.
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        if (Date.now() - lastActivityRef.current >= ms) {
          logout();
        } else {
          // Reschedule the remaining time
          const remaining = ms - (Date.now() - lastActivityRef.current);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(logout, remaining);
        }
      }
    }

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibilityChange);
    reset();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [timeoutMinutes, locale]);

  return null;
}
