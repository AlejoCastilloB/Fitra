import { ImageResponse } from "next/og";
import { BarbellIcon } from "@/lib/brandIcon";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(<BarbellIcon size={192} />, { width: 192, height: 192 });
}
