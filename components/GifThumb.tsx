"use client";

import { useEffect, useRef } from "react";
import { palette } from "@/lib/theme";

export default function GifThumb({ src, size = 40 }: { src?: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      // dibuja el primer frame antes de que el gif empiece a animar
      ctx?.drawImage(img, 0, 0, size, size);
    };
    img.src = src;
  }, [src, size]);

  if (!src) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 8, background: palette.inputBg,
        flexShrink: 0,
      }} />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: 8, background: palette.inputBg, objectFit: "cover", flexShrink: 0 }}
    />
  );
}
