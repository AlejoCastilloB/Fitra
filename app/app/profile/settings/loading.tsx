import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton width={90} height={20} style={{ marginBottom: 20 }} />
      <Skeleton width={90} height={11} style={{ marginBottom: 10 }} />
      <Skeleton height={100} radius={14} style={{ marginBottom: 20 }} />
      <Skeleton width={90} height={11} style={{ marginBottom: 10 }} />
      <Skeleton height={100} radius={14} style={{ marginBottom: 20 }} />
      <Skeleton width={90} height={11} style={{ marginBottom: 10 }} />
      <Skeleton height={140} radius={14} />
    </div>
  );
}
