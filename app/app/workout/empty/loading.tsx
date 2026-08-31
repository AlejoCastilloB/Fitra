import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton height={90} radius={16} style={{ marginBottom: 16 }} />
      <Skeleton height={140} radius={16} style={{ marginBottom: 14 }} />
      <Skeleton height={140} radius={16} />
    </div>
  );
}
