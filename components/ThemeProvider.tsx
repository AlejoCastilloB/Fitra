"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeContext, darkPalette, lightPalette, ThemeName } from "@/lib/theme";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>("light");
  const [hydrated, setHydrated] = useState(false);

  const hydrateTheme = useCallback((next: ThemeName) => {
    setThemeState(next);
    setHydrated(true);
  }, []);

  // respaldo para páginas que no empujan el tema ya resuelto desde el server (ej. /admin/seed)
  useEffect(() => {
    if (hydrated) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (hydrated || !data.user) return;
      const { data: row } = await supabase.from("users").select("theme_pref").eq("id", data.user.id).single();
      if (!hydrated && (row?.theme_pref === "dark" || row?.theme_pref === "light")) setThemeState(row.theme_pref);
    });
  }, [hydrated]);

  async function setTheme(next: ThemeName) {
    setThemeState(next);
    setHydrated(true);
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from("users").update({ theme_pref: next }).eq("id", data.user.id);
  }

  const palette = theme === "dark" ? darkPalette : lightPalette;

  return (
    <ThemeContext.Provider value={{ theme, palette, setTheme, hydrateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
