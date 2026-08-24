export function BarbellIcon({ size, rounded = true }: { size: number; rounded?: boolean }) {
  const s = size / 512;
  return (
    <div
      style={{
        width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #20242c, #0a0c10)",
        borderRadius: rounded ? Math.round(size * 0.23) : 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: Math.round(8 * s) }}>
        <div style={{ width: Math.round(26 * s), height: Math.round(92 * s), borderRadius: Math.round(10 * s), background: "linear-gradient(180deg, #8FF7C0, #5FD8FF)" }} />
        <div style={{ width: Math.round(34 * s), height: Math.round(140 * s), borderRadius: Math.round(12 * s), background: "linear-gradient(180deg, #8FF7C0, #5FD8FF)" }} />
        <div style={{ width: Math.round(292 * s), height: Math.round(20 * s), borderRadius: Math.round(10 * s), background: "#ffffff" }} />
        <div style={{ width: Math.round(34 * s), height: Math.round(140 * s), borderRadius: Math.round(12 * s), background: "linear-gradient(180deg, #8FF7C0, #5FD8FF)" }} />
        <div style={{ width: Math.round(26 * s), height: Math.round(92 * s), borderRadius: Math.round(10 * s), background: "linear-gradient(180deg, #8FF7C0, #5FD8FF)" }} />
      </div>
    </div>
  );
}
