"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

let cachedUserId: string | null = null;
let cachedPromise: Promise<string | null> | null = null;

function getUserPromise(): Promise<string | null> {
  if (cachedPromise) return cachedPromise;
  const supabase = createClient();
  const promise = supabase.auth.getUser().then(({ data }) => {
    cachedUserId = data.user?.id ?? null;
    return cachedUserId;
  });
  cachedPromise = promise;
  return promise;
}

export function useCurrentUser(): string | null {
  const [uid, setUid] = useState<string | null>(cachedUserId);

  useEffect(() => {
    if (cachedUserId) {
      setUid(cachedUserId);
      return;
    }
    getUserPromise().then((id) => setUid(id));
  }, []);

  return uid;
}
