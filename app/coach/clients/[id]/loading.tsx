import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton width={140} height={20} style={{ marginBottom: 18 }} />
      <Skeleton height={90} radius={16} style={{ marginBottom: 16 }} />
      <Skeleton height={160} radius={16} style={{ marginBottom: 16 }} />
      <Skeleton height={100} radius={16} />
    </div>
  );
}
