import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton width={90} height={22} style={{ marginBottom: 8 }} />
      <Skeleton width={140} height={14} style={{ marginBottom: 20 }} />

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} width={32} height={32} radius={999} />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
        <Skeleton width={90} height={30} />
        <Skeleton width={110} height={30} />
      </div>

      <Skeleton width={100} height={12} style={{ marginBottom: 10 }} />
      <Skeleton height={64} radius={16} style={{ marginBottom: 24 }} />

      <Skeleton width={100} height={12} style={{ marginBottom: 10 }} />
      <Skeleton height={54} style={{ marginBottom: 8 }} />
      <Skeleton height={54} style={{ marginBottom: 8 }} />
    </div>
  );
}
