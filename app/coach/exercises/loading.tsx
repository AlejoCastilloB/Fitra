import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton width={110} height={22} style={{ marginBottom: 18 }} />
      <Skeleton height={54} radius={14} style={{ marginBottom: 8 }} />
      <Skeleton height={54} radius={14} style={{ marginBottom: 8 }} />
      <Skeleton height={54} radius={14} style={{ marginBottom: 8 }} />
      <Skeleton height={54} radius={14} />
    </div>
  );
}
