"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AchievementCelebration from "@/components/AchievementCelebration";
import { Achievement } from "@/lib/achievements";

export default function AchievementChecker() {
  const pathname = usePathname();
  const [queue, setQueue] = useState<Achievement[]>([]);

  useEffect(() => {
    fetch("/api/achievements/check", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.newAchievements?.length) setQueue((q) => [...q, ...data.newAchievements]);
      })
      .catch(() => {});
  }, [pathname]);

  if (queue.length === 0) return null;
  const current = queue[0];

  return (
    <AchievementCelebration achievement={current} onClose={() => setQueue((q) => q.slice(1))} />
  );
}
