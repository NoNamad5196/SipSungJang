"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { INTENSITY_CONFIG, GOAL_CONFIG, URGENCY_CONFIG } from "@/lib/constants";
import type { PlayIntensity, CurrentGoal, Urgency } from "@/types";

const EMOJI_OPTIONS = ["🎮", "⚔️", "🏹", "🧙", "🔮", "🌸", "🐉", "🤖", "👾", "💎", "🌊", "🔥", "⭐", "🎯", "🎲"];

export default function NewGamePage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🎮");
  const [intensity, setIntensity] = useState<PlayIntensity>("sub");
  const [currentGoal, setCurrentGoal] = useState<CurrentGoal>("story");
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [weeklyTask, setWeeklyTask] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const weeklyTasks = weeklyTask.trim() ? [weeklyTask.trim()] : [];

    const { data, error } = await supabase
      .from("games")
      .insert({
        user_id: user.id,
        name,
        icon,
        intensity,
        current_goal: currentGoal,
        urgency,
        weekly_tasks: weeklyTasks,
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(`/games/${data.id}`);
  }

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
          <span className="text-white font-semibold">게임 추가</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>
              아이콘 선택
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className="text-xl w-10 h-10 rounded-lg border transition-colors"
                  style={{
                    borderColor: icon === emoji ? "var(--accent)" : "var(--card-border)",
                    background: icon === emoji ? "rgba(124,58,237,0.2)" : "var(--card)",
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>
              게임 이름 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 명일방주, 블루 아카이브, 니케..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: "var(--muted)" }}>
              플레이 강도 *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.entries(INTENSITY_CONFIG) as [PlayIntensity, typeof INTENSITY_CONFIG[PlayIntensity]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIntensity(key)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors"
                  style={{
                    borderColor: intensity === key ? "var(--accent)" : "var(--card-border)",
                    background: intensity === key ? "rgba(124,58,237,0.15)" : "var(--card)",
                    color: intensity === key ? "white" : "var(--muted)",
                  }}
                >
                  <span>{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: "var(--muted)" }}>
              현재 목표
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.entries(GOAL_CONFIG) as [CurrentGoal, typeof GOAL_CONFIG[CurrentGoal]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCurrentGoal(key)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors"
                  style={{
                    borderColor: currentGoal === key ? "var(--accent)" : "var(--card-border)",
                    background: currentGoal === key ? "rgba(124,58,237,0.15)" : "var(--card)",
                    color: currentGoal === key ? "white" : "var(--muted)",
                  }}
                >
                  <span>{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: "var(--muted)" }}>
              급한 정도
            </label>
            <div className="flex gap-2">
              {(Object.entries(URGENCY_CONFIG) as [Urgency, typeof URGENCY_CONFIG[Urgency]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setUrgency(key)}
                  className="flex-1 py-2 rounded-xl border text-sm font-medium transition-colors"
                  style={{
                    borderColor: urgency === key ? "var(--accent)" : "var(--card-border)",
                    background: urgency === key ? "rgba(124,58,237,0.15)" : "var(--card)",
                  }}
                >
                  <span className={urgency === key ? cfg.color : ""}>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>
              이번 주 첫 번째 할 일 (선택)
            </label>
            <input
              type="text"
              value={weeklyTask}
              onChange={(e) => setWeeklyTask(e.target.value)}
              placeholder="예: 이벤트 상점 핵심 보상 교환"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Link
              href="/dashboard"
              className="flex-1 py-2.5 rounded-xl border text-center text-sm font-medium transition-colors"
              style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-2.5 rounded-xl font-medium text-white disabled:opacity-50 transition-opacity"
              style={{ background: "var(--accent)" }}
            >
              {loading ? "저장 중..." : "게임 추가"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
