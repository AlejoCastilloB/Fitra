import "./globals.css";

export const metadata = {
  title: "FitTrack",
  description: "Entrenamiento, nutrición y seguimiento de coach en una sola plataforma.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
