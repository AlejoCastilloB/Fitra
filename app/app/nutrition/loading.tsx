import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton width={110} height={22} style={{ marginBottom: 8 }} />
      <Skeleton width={220} height={12} style={{ marginBottom: 18 }} />

      <Skeleton height={220} radius={20} style={{ marginBottom: 14 }} />
      <Skeleton height={64} radius={16} style={{ marginBottom: 14 }} />
      <Skeleton height={100} style={{ marginBottom: 16 }} />
      <Skeleton height={52} radius={14} style={{ marginBottom: 8 }} />

      <Skeleton width={120} height={12} style={{ marginBottom: 10, marginTop: 24 }} />
      <Skeleton height={60} style={{ marginBottom: 8 }} />
      <Skeleton height={60} style={{ marginBottom: 8 }} />
    </div>
  );
}
