"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeContext, darkPalette, lightPalette, ThemeName } from "@/lib/theme";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>("light");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: row } = await supabase.from("users").select("theme_pref").eq("id", data.user.id).single();
      if (row?.theme_pref === "dark" || row?.theme_pref === "light") setThemeState(row.theme_pref);
    });
  }, []);

  async function setTheme(next: ThemeName) {
    setThemeState(next);
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from("users").update({ theme_pref: next }).eq("id", data.user.id);
  }

  const palette = theme === "dark" ? darkPalette : lightPalette;

  return (
    <ThemeContext.Provider value={{ theme, palette, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
