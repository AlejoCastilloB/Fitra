"use client";

import { usePathname, useRouter } from "next/navigation";
import { useWorkoutSession } from "@/lib/workoutSession";
import { usePalette } from "@/lib/theme";
import { Dumbbell } from "lucide-react";

export default function ActiveWorkoutPill() {
  const palette = usePalette();
  const { session, now } = useWorkoutSession();
  const pathname = usePathname();
  const router = useRouter();

  if (!session || pathname === `/app/workout/${session.routineId}`) return null;

  const elapsed = Math.floor((now - session.startedAt) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const doneCount = session.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.done).length, 0);
  const totalCount = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <button
      onClick={() => router.push(`/app/workout/${session.routineId}`)}
      style={{
        position: "fixed", left: "50%", bottom: 88, transform: "translateX(-50%)", zIndex: 40,
        display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 999,
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})`, border: "none",
        boxShadow: "0 10px 30px -8px rgba(0,0,0,0.5)", cursor: "pointer", color: palette.bg,
      }}
    >
      <Dumbbell size={15} />
      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{session.routineName}</span>
      <span style={{ fontSize: 11.5, opacity: 0.75 }}>{mins}:{String(secs).padStart(2, "0")} · {doneCount}/{totalCount}</span>
    </button>
  );
}
