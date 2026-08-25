import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton width={90} height={22} style={{ marginBottom: 20 }} />
      <Skeleton height={120} radius={16} style={{ marginBottom: 16 }} />
      <Skeleton height={120} radius={16} />
    </div>
  );
}
