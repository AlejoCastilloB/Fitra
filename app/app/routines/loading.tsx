import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <Skeleton width={100} height={22} />
        <Skeleton width={80} height={32} radius={11} />
      </div>
      <Skeleton height={64} style={{ marginBottom: 10 }} />
      <Skeleton height={64} style={{ marginBottom: 10 }} />
      <Skeleton height={64} style={{ marginBottom: 10 }} />
    </div>
  );
}
