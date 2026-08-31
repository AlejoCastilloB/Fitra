import "./globals.css";
import PWARegister from "@/components/PWARegister";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata = {
  title: "FitTrack",
  description: "Entrenamiento, nutrición y seguimiento de coach en una sola plataforma.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FitTrack",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Valor inicial, antes de que hidrate ThemeProvider: sigue al tema del sistema para
  // que el primer pintado sea razonable. Ya hidratado, ThemeProvider las reemplaza por
  // una sola etiqueta con el tema elegido dentro de la app.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F5F7" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0C10" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ThemeProvider>
          <PWARegister />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
