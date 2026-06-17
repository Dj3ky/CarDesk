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

  useEffect(() => {
    if (timeoutMinutes <= 0) return;

    const ms = timeoutMinutes * 60 * 1000;

    function reset() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        signOut({ redirectTo: `/${locale}/login` });
      }, ms);
    }

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [timeoutMinutes, locale]);

  return null;
}
