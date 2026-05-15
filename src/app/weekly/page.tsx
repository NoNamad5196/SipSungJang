"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IntensityBadge } from "@/components/IntensityBadge";
import { GOAL_CONFIG, INTENSITY_ORDER } from "@/lib/constants";
import type { Game } from "@/types";

export default function WeeklyPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      const { data } = await supabase
        .from("games")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (data) setGames(data as Game[]);
      setLoading(false);
    }
    load();
  }, []);

  const activeGames = games.filter((g) => !["frozen", "abandoned"].includes(g.intensity));
  const inactiveGames = games.filter((g) => ["frozen", "abandoned"].includes(g.intensity));

  const sorted = [...activeGames].sort(
    (a, b) =>
      INTENSITY_ORDER.indexOf(a.intensity) - INTENSITY_ORDER.indexOf(b.intensity)
  );

  return (
    <div className="min-h-screen">
      <header
        className="border-b sticky top-0 z-10 px-4"
        style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
      >
        <div className="max-w-2xl mx-auto h-14 flex items-center gap-3">
          <Link href="/dashboard" className="text-sm" style={{ color: "var(--muted)" }}>
            ← 대시보드
          </Link>
          <span className="font-semibold text-white">📅 이번 주 로드맵</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p style={{ color: "var(--muted)" }}>불러오는 중...</p>
          </div>
        ) : games.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="text-4xl">🎯</div>
            <p style={{ color: "var(--muted)" }}>등록된 게임이 없어요</p>
            <Link href="/games/new" className="text-sm text-purple-400 hover:underline">
              게임 추가하기 →
            </Link>
          </div>
        ) : (
          <>
            {sorted.map((game) => {
              const goal = game.current_goal ? GOAL_CONFIG[game.current_goal] : null;
              const hasTasks = game.weekly_tasks && game.weekly_tasks.length > 0;

              return (
                <Link key={game.id} href={`/games/${game.id}`}>
                  <div
                    className="rounded-xl border p-4 hover:border-purple-500/40 transition-colors"
                    style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        {game.icon && <span className="text-xl">{game.icon}</span>}
                        <span className="font-semibold text-white">{game.name}</span>
                        {goal && (
                          <span className="text-xs" style={{ color: "var(--muted)" }}>
                            {goal.emoji} {goal.label}
                          </span>
                        )}
                      </div>
                      <IntensityBadge intensity={game.intensity} size="sm" />
                    </div>

                    {hasTasks ? (
                      <ul className="space-y-1.5">
                        {game.weekly_tasks.map((task, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-white/80"
                          >
                            <span className="shrink-0 mt-0.5">📌</span>
                            <span>{task}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm" style={{ color: "var(--card-border)" }}>
                        이번 주 할 일 없음
                      </p>
                    )}

                    {game.next_goal && (
                      <p className="text-xs mt-3 pt-3 border-t" style={{ color: "var(--muted)", borderColor: "var(--card-border)" }}>
                        다음: {game.next_goal}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}

            {inactiveGames.length > 0 && (
              <details className="group">
                <summary
                  className="text-sm cursor-pointer select-none list-none flex items-center gap-2 py-2"
                  style={{ color: "var(--muted)" }}
                >
                  <span className="group-open:rotate-90 inline-block transition-transform">▶</span>
                  냉동 / 방치 게임 ({inactiveGames.length}개)
                </summary>
                <div className="mt-3 space-y-2">
                  {inactiveGames.map((game) => (
                    <Link key={game.id} href={`/games/${game.id}`}>
                      <div
                        className="rounded-xl border p-3 opacity-60 hover:opacity-80 transition-opacity flex items-center justify-between"
                        style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
                      >
                        <div className="flex items-center gap-2">
                          {game.icon && <span>{game.icon}</span>}
                          <span className="text-sm text-white">{game.name}</span>
                        </div>
                        <IntensityBadge intensity={game.intensity} size="sm" />
                      </div>
                    </Link>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </main>
    </div>
  );
}
