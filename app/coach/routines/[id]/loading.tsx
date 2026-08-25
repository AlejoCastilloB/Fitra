import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton width={140} height={20} style={{ marginBottom: 18 }} />
      <Skeleton height={70} radius={16} style={{ marginBottom: 10 }} />
      <Skeleton height={70} radius={16} style={{ marginBottom: 10 }} />
      <Skeleton height={70} radius={16} />
    </div>
  );
}
