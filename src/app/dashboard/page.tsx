"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GameCard } from "@/components/GameCard";
import { INTENSITY_ORDER } from "@/lib/constants";
import type { Game } from "@/types";

export default function DashboardPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadGames() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      setUserEmail(user.email ?? "");

      const { data } = await supabase
        .from("games")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (data) setGames(data as Game[]);
      setLoading(false);
    }
    loadGames();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const grouped = INTENSITY_ORDER.reduce<Record<string, Game[]>>((acc, key) => {
    acc[key] = games.filter((g) => g.intensity === key);
    return acc;
  }, {} as Record<string, Game[]>);

  const hasGames = games.length > 0;

  return (
    <div className="min-h-screen">
      <header
        className="border-b sticky top-0 z-10 px-4"
        style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
      >
        <div className="max-w-5xl mx-auto h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎮</span>
            <span className="font-bold text-white">씹성장</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/weekly"
              className="text-sm px-3 py-1.5 rounded-lg border transition-colors hover:border-purple-500/50"
              style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
            >
              📅 주간 로드맵
            </Link>
            <Link
              href="/games/new"
              className="text-sm px-3 py-1.5 rounded-lg font-medium text-white transition-opacity hover:opacity-80"
              style={{ background: "var(--accent)" }}
            >
              + 게임 추가
            </Link>
            <button
              onClick={handleSignOut}
              className="text-xs px-2 py-1.5 rounded-lg transition-colors"
              style={{ color: "var(--muted)" }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p style={{ color: "var(--muted)" }}>불러오는 중...</p>
          </div>
        ) : !hasGames ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-5xl">🎯</div>
            <p className="text-white font-medium">아직 등록된 게임이 없어요</p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              지금 플레이 중인 가챠 게임을 추가해보세요!
            </p>
            <Link
              href="/games/new"
              className="mt-2 px-5 py-2.5 rounded-xl font-medium text-white"
              style={{ background: "var(--accent)" }}
            >
              첫 번째 게임 추가하기
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {INTENSITY_ORDER.map((intensity) => {
              const list = grouped[intensity];
              if (!list || list.length === 0) return null;
              return (
                <section key={intensity}>
                  <h2 className="text-sm font-medium mb-3" style={{ color: "var(--muted)" }}>
                    {intensity === "main" && "🔥 메인 게임"}
                    {intensity === "sub" && "🌤 서브 게임"}
                    {intensity === "login-only" && "🌙 접속만"}
                    {intensity === "frozen" && "❄️ 냉동"}
                    {intensity === "abandoned" && "🪦 방치"}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {list.map((game) => (
                      <GameCard key={game.id} game={game} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
