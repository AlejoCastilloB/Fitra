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
  // Sin themeColor a propósito: lo maneja ThemeProvider con su propia etiqueta, para que
  // React no tenga ninguna <meta name="theme-color"> bajo su control. El fondo visible
  // antes de hidratar ya lo cubre --ft-bg en globals.css, que sigue al tema del sistema.
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
