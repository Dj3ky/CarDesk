"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

interface InactivityWatcherProps {
  timeoutMinutes: number;
  locale: string;
}

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
const STORAGE_KEY = "inactivity_last_active";

export function InactivityWatcher({ timeoutMinutes, locale }: InactivityWatcherProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutMinutes <= 0) return;

    const ms = timeoutMinutes * 60 * 1000;

    function getLastActive(): number {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? parseInt(stored, 10) : Date.now();
    }

    function logout() {
      localStorage.removeItem(STORAGE_KEY);
      signOut({ redirectTo: `/${locale}/login` });
    }

    // On iOS PWA, the OS can kill and fully reload the page when the user returns.
    // Check localStorage on mount to catch inactivity that happened before the reload.
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && Date.now() - parseInt(stored, 10) >= ms) {
      logout();
      return;
    }

    function reset() {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && Date.now() - parseInt(stored, 10) >= ms) {
        logout();
        return;
      }
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, ms);
    }

    // On Android PWA / mobile browsers, setTimeout is frozen when the screen locks.
    // When the user returns, check wall-clock elapsed time and log out if needed.
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        const lastActive = getLastActive();
        const elapsed = Date.now() - lastActive;
        if (elapsed >= ms) {
          logout();
        } else {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(logout, ms - elapsed);
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
