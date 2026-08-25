import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton width={100} height={20} style={{ marginBottom: 18 }} />
      <Skeleton height={44} radius={16} style={{ marginBottom: 10, width: "60%" }} />
      <Skeleton height={44} radius={16} style={{ marginBottom: 10, marginLeft: "auto", width: "50%" }} />
    </div>
  );
}
