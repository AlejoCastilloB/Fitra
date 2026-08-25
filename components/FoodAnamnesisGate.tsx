"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import FoodAnamnesisFlow from "@/components/FoodAnamnesisFlow";

export default function FoodAnamnesisGate({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [status, setStatus] = useState<"loading" | "needed" | "done">("loading");

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setStatus("done"); return; }
      const { data } = await supabase.from("clients").select("food_anamnesis_completed_at").eq("user_id", auth.user.id).single();
      setStatus(data?.food_anamnesis_completed_at ? "done" : "needed");
    })();
  }, []);

  if (status === "loading") return null;
  if (status === "needed") return <FoodAnamnesisFlow onDone={() => setStatus("done")} />;
  return <>{children}</>;
}
