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
  themeColor: "#F4F5F7",
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
