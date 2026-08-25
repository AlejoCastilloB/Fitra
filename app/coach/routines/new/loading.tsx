import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton width={160} height={20} style={{ marginBottom: 18 }} />
      <Skeleton height={100} radius={20} style={{ marginBottom: 14 }} />
      <Skeleton height={60} radius={14} style={{ marginBottom: 8 }} />
      <Skeleton height={60} radius={14} />
    </div>
  );
}
