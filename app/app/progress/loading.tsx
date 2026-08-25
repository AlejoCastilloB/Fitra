import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton width={100} height={22} style={{ marginBottom: 14 }} />
      <Skeleton height={40} radius={12} style={{ marginBottom: 20 }} />
      <Skeleton height={60} radius={14} style={{ marginBottom: 10 }} />
      <Skeleton height={60} radius={14} style={{ marginBottom: 10 }} />
      <Skeleton height={60} radius={14} style={{ marginBottom: 10 }} />
    </div>
  );
}
