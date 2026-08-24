"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const MIN_INTERVAL_MS = 60_000;

export default function SessionKeepAlive() {
  const lastRefresh = useRef(0);

  useEffect(() => {
    const supabase = createClient();

    function refresh() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefresh.current < MIN_INTERVAL_MS) return;
      lastRefresh.current = now;
      supabase.auth.getSession().catch(() => {});
    }

    document.addEventListener("visibilitychange", refresh);

    return () => {
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return null;
}
