"use client";

import Link from "next/link";
import type { Game } from "@/types";
import { IntensityBadge } from "./IntensityBadge";
import { GOAL_CONFIG, URGENCY_CONFIG } from "@/lib/constants";

interface Props {
  game: Game;
}

export function GameCard({ game }: Props) {
  const goal = game.current_goal ? GOAL_CONFIG[game.current_goal] : null;
  const urgency = URGENCY_CONFIG[game.urgency];

  const topTask = game.weekly_tasks?.[0];

  return (
    <Link href={`/games/${game.id}`}>
      <div
        className="rounded-xl border p-4 hover:border-purple-500/50 transition-colors cursor-pointer h-full flex flex-col gap-3"
        style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {game.icon && <span className="text-2xl shrink-0">{game.icon}</span>}
            <h3 className="font-semibold text-white truncate">{game.name}</h3>
          </div>
          <IntensityBadge intensity={game.intensity} size="sm" />
        </div>

        {goal && (
          <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--muted)" }}>
            <span>{goal.emoji}</span>
            <span>{goal.label}</span>
            <span className="mx-1">·</span>
            <span className={urgency.color}>{urgency.label}</span>
          </div>
        )}

        {topTask && (
          <div
            className="rounded-lg px-3 py-2 text-sm text-white/80 border"
            style={{ background: "#1e1e26", borderColor: "var(--card-border)" }}
          >
            📌 {topTask}
          </div>
        )}

        {game.weekly_tasks?.length > 1 && (
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            +{game.weekly_tasks.length - 1}개 더
          </p>
        )}

        {game.last_access && (
          <p className="text-xs mt-auto" style={{ color: "var(--muted)" }}>
            마지막 접속: {game.last_access}
          </p>
        )}
      </div>
    </Link>
  );
}
