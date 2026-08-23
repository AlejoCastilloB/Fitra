"use client";

import { useEffect } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { createClient } from "@/lib/supabase/client";

export default function TimezoneSync() {
  const uid = useCurrentUser();

  useEffect(() => {
    if (!uid) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;

    const supabase = createClient();
    supabase.from("users").select("timezone").eq("id", uid).single().then(({ data }) => {
      if (data?.timezone !== tz) {
        supabase.from("users").update({ timezone: tz }).eq("id", uid).then(() => {});
      }
    });
  }, [uid]);

  return null;
}
