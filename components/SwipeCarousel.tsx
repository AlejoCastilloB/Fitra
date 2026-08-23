"use client";

import { useRef, useState } from "react";
import { usePalette } from "@/lib/theme";

export default function SwipeCarousel({ children }: { children: React.ReactNode[] }) {
  const palette = usePalette();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActive(idx);
  }

  return (
    <div>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
        className="ft-carousel-scroller"
      >
        <style>{`.ft-carousel-scroller::-webkit-scrollbar { display: none; }`}</style>
        {children.map((child, i) => (
          <div key={i} style={{ flex: "0 0 100%", scrollSnapAlign: "start" }}>
            {child}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
        {children.map((_, i) => (
          <div key={i} style={{
            width: i === active ? 16 : 6, height: 6, borderRadius: 999,
            background: i === active ? palette.accent : palette.panelBorder,
            transition: "all .25s ease",
          }} />
        ))}
      </div>
    </div>
  );
}
