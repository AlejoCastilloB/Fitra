import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton width={130} height={22} style={{ marginBottom: 8 }} />
      <Skeleton width={160} height={12} style={{ marginBottom: 22 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <Skeleton height={60} radius={18} style={{ marginBottom: 6 }} />
            <Skeleton height={10} width="70%" style={{ margin: "0 auto" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
