import { Suspense } from "react";
import ProgressTabs from "@/components/ProgressTabs";

export default function ProgressPage() {
  return (
    <Suspense fallback={null}>
      <ProgressTabs />
    </Suspense>
  );
}
