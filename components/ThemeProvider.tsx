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

  // La franja de estado / barras del navegador se tintan con <meta name="theme-color">.
  // Tiene que seguir el tema elegido DENTRO de la app, no el del sistema: si no, con el
  // celular en claro y la app en oscuro queda una franja clara pegada a una app oscura.
  useEffect(() => {
    // Alimenta el fondo de html y body definido en globals.css, que es lo que pinta
    // la franja de estado, el área segura y el rebote del scroll.
    document.documentElement.style.setProperty("--ft-bg", palette.bg);

    // Etiqueta propia, creada por nosotros, marcada con data-ft-theme-color y reutilizada
    // siempre. NUNCA hay que tocar las etiquetas que renderiza React (las del `viewport`
    // de Next): al borrarlas por debajo, en la siguiente navegación React intenta
    // quitarlas del head, ya no están, y la app entera cae con una excepción de cliente.
    // Por eso el layout ya no declara themeColor: aquí no hay nada de React que pisar.
    let meta = document.querySelector<HTMLMetaElement>("meta[data-ft-theme-color]");
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.setAttribute("data-ft-theme-color", "");
      document.head.appendChild(meta);
    }
    meta.content = palette.bg;

    // `color-scheme` hace que los controles nativos (scrollbars, inputs, el rebote del
    // scroll en iOS) usen el mismo tema que la app en vez del del sistema.
    document.documentElement.style.colorScheme = theme;
  }, [palette.bg, theme]);

  return (
    <ThemeContext.Provider value={{ theme, palette, setTheme, hydrateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
