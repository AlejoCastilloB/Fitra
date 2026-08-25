import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton width={140} height={22} style={{ marginBottom: 18 }} />
      <Skeleton height={80} radius={16} style={{ marginBottom: 12 }} />
      <Skeleton height={80} radius={16} style={{ marginBottom: 12 }} />
      <Skeleton height={80} radius={16} />
    </div>
  );
}
