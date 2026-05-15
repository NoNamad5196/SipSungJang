"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { repository } from "@/lib/storage";
import { GameCard } from "@/components/GameCard";
import { INTENSITY_ORDER } from "@/lib/constants";
import type { Game } from "@/types";

export default function DashboardPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const backupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    repository.getGames().then((data) => {
      setGames(data);
      setLoading(false);
    });
  }, []);

  // 백업 드롭다운 외부 클릭 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (backupRef.current && !backupRef.current.contains(e.target as Node)) {
        setShowBackup(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // JSON 내보내기
  async function handleExport() {
    const data = await repository.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sipsungjang-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowBackup(false);
  }

  // JSON 가져오기
  function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.games || !Array.isArray(data.games)) {
          alert("올바른 씹성장 백업 파일이 아닙니다.");
          return;
        }
        if (!confirm(`기존 데이터를 모두 덮어씁니다. 계속할까요?\n(게임 ${data.games.length}개)`)) return;
        await repository.importData(data);
        const fresh = await repository.getGames();
        setGames(fresh);
        setShowBackup(false);
      } catch {
        alert("파일을 읽는 중 오류가 발생했습니다.");
      }
    };
    input.click();
  }

  // 같은 intensity 그룹 내 순서 변경
  async function reorderGame(gameId: string, direction: "up" | "down") {
    const game = games.find((g) => g.id === gameId);
    if (!game) return;

    const grouped = games
      .filter((g) => g.intensity === game.intensity)
      .sort((a, b) => a.display_order - b.display_order);

    const idx = grouped.findIndex((g) => g.id === gameId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= grouped.length) return;

    const target = grouped[swapIdx];
    const newOrderA = target.display_order;
    const newOrderB = game.display_order;

    await Promise.all([
      repository.updateGame(gameId, { display_order: newOrderA }),
      repository.updateGame(target.id, { display_order: newOrderB }),
    ]);

    setGames((prev) =>
      prev.map((g) => {
        if (g.id === gameId) return { ...g, display_order: newOrderA };
        if (g.id === target.id) return { ...g, display_order: newOrderB };
        return g;
      })
    );
  }

  const sorted = [...games].sort((a, b) => a.display_order - b.display_order);
  const grouped = INTENSITY_ORDER.reduce<Record<string, Game[]>>((acc, key) => {
    acc[key] = sorted.filter((g) => g.intensity === key);
    return acc;
  }, {} as Record<string, Game[]>);

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
          <div className="flex items-center gap-2">
            <Link
              href="/weekly"
              className="text-sm px-3 py-1.5 rounded-lg border transition-colors hover:border-purple-500/50"
              style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
            >
              📅 주간 로드맵
            </Link>

            {/* 편집 모드 토글 */}
            <button
              onClick={() => setEditMode((v) => !v)}
              className="text-sm px-3 py-1.5 rounded-lg border transition-colors"
              style={{
                borderColor: editMode ? "var(--accent)" : "var(--card-border)",
                color: editMode ? "white" : "var(--muted)",
                background: editMode ? "rgba(124,58,237,0.15)" : "transparent",
              }}
            >
              {editMode ? "✓ 완료" : "↕ 순서"}
            </button>

            {/* 백업 드롭다운 */}
            <div className="relative" ref={backupRef}>
              <button
                onClick={() => setShowBackup((v) => !v)}
                className="text-sm px-3 py-1.5 rounded-lg border transition-colors hover:border-purple-500/50"
                style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
              >
                📦 백업
              </button>
              {showBackup && (
                <div
                  className="absolute right-0 top-full mt-1 rounded-xl border overflow-hidden z-20 min-w-36"
                  style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
                >
                  <button
                    onClick={handleExport}
                    className="w-full text-left text-sm px-4 py-2.5 hover:bg-white/5 text-white transition-colors"
                  >
                    ⬇️ 내보내기 (JSON)
                  </button>
                  <button
                    onClick={handleImport}
                    className="w-full text-left text-sm px-4 py-2.5 hover:bg-white/5 transition-colors border-t"
                    style={{ color: "var(--muted)", borderColor: "var(--card-border)" }}
                  >
                    ⬆️ 가져오기 (JSON)
                  </button>
                </div>
              )}
            </div>

            <Link
              href="/games/new"
              className="text-sm px-3 py-1.5 rounded-xl font-medium text-white transition-opacity hover:opacity-80"
              style={{ background: "var(--accent)" }}
            >
              + 게임 추가
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p style={{ color: "var(--muted)" }}>불러오는 중...</p>
          </div>
        ) : games.length === 0 ? (
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
            {editMode && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                ↑ ↓ 버튼으로 같은 그룹 내 순서를 바꿀 수 있습니다.
              </p>
            )}
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
                    {list.map((game, idx) => (
                      <div key={game.id} className="relative">
                        <GameCard game={game} />
                        {editMode && (
                          <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                            <button
                              onClick={(e) => { e.preventDefault(); reorderGame(game.id, "up"); }}
                              disabled={idx === 0}
                              className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center disabled:opacity-30 transition-opacity"
                              style={{ background: "var(--card-border)", color: "white" }}
                            >
                              ↑
                            </button>
                            <button
                              onClick={(e) => { e.preventDefault(); reorderGame(game.id, "down"); }}
                              disabled={idx === list.length - 1}
                              className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center disabled:opacity-30 transition-opacity"
                              style={{ background: "var(--card-border)", color: "white" }}
                            >
                              ↓
                            </button>
                          </div>
                        )}
                      </div>
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
