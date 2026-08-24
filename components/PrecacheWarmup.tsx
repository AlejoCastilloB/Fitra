"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PrecacheWarmup({ routes }: { routes: string[] }) {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      routes.forEach((route) => router.prefetch(route));
    }, 1500);
    return () => clearTimeout(t);
  }, [routes.join(",")]);

  return null;
}
