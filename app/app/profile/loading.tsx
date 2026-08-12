import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton height={120} radius={20} style={{ marginBottom: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        <Skeleton height={70} radius={14} />
        <Skeleton height={70} radius={14} />
        <Skeleton height={70} radius={14} />
      </div>
      <Skeleton height={80} radius={16} style={{ marginBottom: 22 }} />
      <Skeleton width={100} height={12} style={{ marginBottom: 10 }} />
      <Skeleton height={140} radius={16} style={{ marginBottom: 22 }} />
      <Skeleton width={100} height={12} style={{ marginBottom: 10 }} />
      <Skeleton height={54} style={{ marginBottom: 8 }} />
      <Skeleton height={54} style={{ marginBottom: 8 }} />
    </div>
  );
}
