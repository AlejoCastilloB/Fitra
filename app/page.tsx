import Link from "next/link";

const palette = {
  bg: "#0A0C10",
  panel: "rgba(255,255,255,0.055)",
  panelBorder: "rgba(255,255,255,0.09)",
  ink: "#E7EAEE",
  inkDim: "#8A93A0",
  accent: "#B9C2CE",
};

export default function DevHome() {
  return (
    <main style={{ minHeight: "100vh", background: palette.bg, color: palette.ink, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", gap: 24, padding: 20 }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>FitTrack 🚧</h1>
        <p style={{ color: palette.inkDim, fontSize: 14, marginTop: 6 }}>Home temporal — se reemplaza por la landing real</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}>
        <DevLink href="/login" label="Login" />
        <DevLink href="/onboarding" label="Onboarding" />
        <DevLink href="/app" label="Dashboard Usuario" />
        <DevLink href="/coach" label="Dashboard Entrenador" />
      </div>
    </main>
  );
}

function DevLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{
      display: "block", textAlign: "center", padding: "12px 16px", borderRadius: 12,
      border: `1px solid ${palette.panelBorder}`, background: palette.panel, color: palette.ink,
      textDecoration: "none", fontSize: 14.5, fontWeight: 600,
    }}>
      {label}
    </Link>
  );
}
