import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton width={200} height={20} style={{ marginBottom: 18 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 24 }}>
        <Skeleton height={64} radius={16} />
        <Skeleton height={64} radius={16} />
        <Skeleton height={64} radius={16} />
      </div>
      <Skeleton width={160} height={12} style={{ marginBottom: 14 }} />
      <Skeleton height={16} style={{ marginBottom: 10 }} />
      <Skeleton height={16} style={{ marginBottom: 10 }} />
      <Skeleton height={16} style={{ marginBottom: 10 }} />
    </div>
  );
}
