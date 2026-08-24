"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SessionKeepAlive() {
  useEffect(() => {
    const supabase = createClient();

    function refresh() {
      if (document.visibilityState === "visible") supabase.auth.getSession();
    }

    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);

    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);

  return null;
}
