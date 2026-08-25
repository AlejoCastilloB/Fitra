import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton width={110} height={22} style={{ marginBottom: 18 }} />
      <Skeleton height={64} radius={14} style={{ marginBottom: 10 }} />
      <Skeleton height={64} radius={14} style={{ marginBottom: 10 }} />
      <Skeleton height={64} radius={14} style={{ marginBottom: 10 }} />
    </div>
  );
}
