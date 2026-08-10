import { createClient } from "@/lib/supabase/server";
import { palette } from "@/lib/theme";
import { ACHIEVEMENTS } from "@/lib/achievements";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function AchievementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: unlockedRows } = await supabase.from("user_achievements").select("achievement_key").eq("client_id", user!.id);
  const unlockedSet = new Set((unlockedRows ?? []).map((r) => r.achievement_key));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Link href="/app/profile" style={{ color: palette.inkDim, display: "flex" }}><ChevronLeft size={20} /></Link>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Insignias</h1>
      </div>
      <p style={{ fontSize: 13, color: palette.inkDim, marginBottom: 22 }}>
        {unlockedSet.size} de {ACHIEVEMENTS.length} desbloqueadas
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {ACHIEVEMENTS.map((a) => {
          const unlocked = unlockedSet.has(a.key);
          return (
            <div key={a.key} style={{ textAlign: "center", opacity: unlocked ? 1 : 0.35 }}>
              <div style={{
                width: 60, height: 60, borderRadius: 18, margin: "0 auto 6px",
                background: unlocked ? `linear-gradient(135deg, ${palette.accent}, ${palette.accentDeep})` : palette.inputBg,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
              }}>
                {a.emoji}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.3 }}>{a.title}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
