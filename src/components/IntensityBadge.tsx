import { INTENSITY_CONFIG } from "@/lib/constants";
import type { PlayIntensity } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  intensity: PlayIntensity;
  size?: "sm" | "md";
}

export function IntensityBadge({ intensity, size = "md" }: Props) {
  const config = INTENSITY_CONFIG[intensity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        config.color,
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1"
      )}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  );
}
