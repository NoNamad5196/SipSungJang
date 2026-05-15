"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { IntensityBadge } from "@/components/IntensityBadge";
import {
  INTENSITY_CONFIG,
  GOAL_CONFIG,
  URGENCY_CONFIG,
  PRIORITY_RANK_CONFIG,
} from "@/lib/constants";
import type { Game, Character, PlayIntensity, CurrentGoal, Urgency, PriorityRank } from "@/types";
import { cn } from "@/lib/utils";

type Tab = "weekly" | "characters" | "party" | "memo";

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [game, setGame] = useState<Game | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [tab, setTab] = useState<Tab>("weekly");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 편집 상태
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [intensity, setIntensity] = useState<PlayIntensity>("sub");
  const [currentGoal, setCurrentGoal] = useState<CurrentGoal | null>(null);
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [weeklyTasks, setWeeklyTasks] = useState<string[]>([]);
  const [newTask, setNewTask] = useState("");
  const [nextGoal, setNextGoal] = useState("");
  const [lastAccess, setLastAccess] = useState("");
  const [partyMemo, setPartyMemo] = useState("");
  const [memo, setMemo] = useState("");

  // 캐릭터 추가
  const [newCharName, setNewCharName] = useState("");
  const [newCharRank, setNewCharRank] = useState<PriorityRank>("priority1");
  const [newCharNotes, setNewCharNotes] = useState("");

  useEffect(() => {
    async function load() {
      const { data: gameData } = await supabase.from("games").select("*").eq("id", id).single();
      if (!gameData) { router.push("/dashboard"); return; }

      const g = gameData as Game;
      setGame(g);
      setName(g.name);
      setIntensity(g.intensity);
      setCurrentGoal(g.current_goal ?? null);
      setUrgency(g.urgency);
      setWeeklyTasks(g.weekly_tasks ?? []);
      setNextGoal(g.next_goal ?? "");
      setLastAccess(g.last_access ?? "");
      setPartyMemo(g.party_memo ?? "");
      setMemo(g.memo ?? "");

      const { data: chars } = await supabase
        .from("characters")
        .select("*")
        .eq("game_id", id)
        .order("created_at", { ascending: true });
      if (chars) setCharacters(chars as Character[]);

      setLoading(false);
    }
    load();
  }, [id]);

  async function saveGame(partial: Partial<Game>) {
    setSaving(true);
    await supabase.from("games").update(partial).eq("id", id);
    setSaving(false);
  }

  async function handleSaveWeekly() {
    await saveGame({
      weekly_tasks: weeklyTasks,
      next_goal: nextGoal || null,
      last_access: lastAccess || null,
      current_goal: currentGoal ?? undefined,
      urgency,
      intensity,
    });
  }

  async function handleSaveParty() {
    await saveGame({ party_memo: partyMemo });
  }

  async function handleSaveMemo() {
    await saveGame({ memo });
  }

  async function handleSaveName() {
    if (!name.trim()) return;
    await saveGame({ name: name.trim() });
    setEditingName(false);
  }

  async function handleDeleteGame() {
    if (!confirm(`"${game?.name}" 게임을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    await supabase.from("games").delete().eq("id", id);
    router.push("/dashboard");
  }

  async function addTask() {
    if (!newTask.trim()) return;
    setWeeklyTasks([...weeklyTasks, newTask.trim()]);
    setNewTask("");
  }

  function removeTask(idx: number) {
    setWeeklyTasks(weeklyTasks.filter((_, i) => i !== idx));
  }

  async function addCharacter() {
    if (!newCharName.trim()) return;
    const { data } = await supabase
      .from("characters")
      .insert({ game_id: id, name: newCharName.trim(), priority_rank: newCharRank, notes: newCharNotes.trim() || null })
      .select()
      .single();
    if (data) setCharacters([...characters, data as Character]);
    setNewCharName("");
    setNewCharNotes("");
  }

  async function deleteCharacter(charId: string) {
    await supabase.from("characters").delete().eq("id", charId);
    setCharacters(characters.filter((c) => c.id !== charId));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: "var(--muted)" }}>불러오는 중...</p>
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "weekly", label: "📅 이번 주" },
    { key: "characters", label: "🧑‍🤝‍🧑 캐릭터" },
    { key: "party", label: "⚔️ 파티" },
    { key: "memo", label: "📝 메모" },
  ];

  const charByRank = (rank: PriorityRank) => characters.filter((c) => c.priority_rank === rank);

  return (
    <div className="min-h-screen">
      <header
        className="border-b sticky top-0 z-10 px-4"
        style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
      >
        <div className="max-w-2xl mx-auto h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm" style={{ color: "var(--muted)" }}>
              ← 대시보드
            </Link>
            <div className="flex items-center gap-2">
              {game?.icon && <span className="text-xl">{game.icon}</span>}
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-white font-semibold text-sm"
                    style={{ width: "160px", padding: "2px 6px" }}
                    onBlur={handleSaveName}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  className="font-semibold text-white text-sm hover:underline"
                  onClick={() => setEditingName(true)}
                >
                  {name}
                </button>
              )}
              <IntensityBadge intensity={intensity} size="sm" />
            </div>
          </div>
          <button
            onClick={handleDeleteGame}
            className="text-xs px-2 py-1 rounded-lg border transition-colors hover:border-red-500/50"
            style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
          >
            삭제
          </button>
        </div>
      </header>

      {/* 빠른 설정 바 */}
      <div
        className="border-b px-4 py-3"
        style={{ borderColor: "var(--card-border)" }}
      >
        <div className="max-w-2xl mx-auto flex flex-wrap gap-2">
          {(Object.entries(INTENSITY_CONFIG) as [PlayIntensity, typeof INTENSITY_CONFIG[PlayIntensity]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={async () => { setIntensity(key); await saveGame({ intensity: key }); }}
              className="text-xs px-2 py-1 rounded-full border transition-colors"
              style={{
                borderColor: intensity === key ? "var(--accent)" : "var(--card-border)",
                background: intensity === key ? "rgba(124,58,237,0.15)" : "transparent",
                color: intensity === key ? "white" : "var(--muted)",
              }}
            >
              {cfg.emoji} {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <div
        className="border-b px-4"
        style={{ borderColor: "var(--card-border)" }}
      >
        <div className="max-w-2xl mx-auto flex gap-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                tab === t.key
                  ? "border-purple-500 text-white"
                  : "border-transparent"
              )}
              style={{ color: tab === t.key ? "white" : "var(--muted)" }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 이번 주 탭 */}
        {tab === "weekly" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>
                  현재 목표
                </label>
                <div className="flex flex-col gap-1">
                  {(Object.entries(GOAL_CONFIG) as [CurrentGoal, typeof GOAL_CONFIG[CurrentGoal]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setCurrentGoal(key)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors text-left"
                      style={{
                        borderColor: currentGoal === key ? "var(--accent)" : "var(--card-border)",
                        background: currentGoal === key ? "rgba(124,58,237,0.15)" : "var(--card)",
                        color: currentGoal === key ? "white" : "var(--muted)",
                      }}
                    >
                      {cfg.emoji} {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>
                    급한 정도
                  </label>
                  <div className="flex flex-col gap-1">
                    {(Object.entries(URGENCY_CONFIG) as [Urgency, typeof URGENCY_CONFIG[Urgency]][]).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => setUrgency(key)}
                        className="px-3 py-1.5 rounded-lg border text-xs transition-colors"
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
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>
                    마지막 접속일
                  </label>
                  <input
                    type="date"
                    value={lastAccess}
                    onChange={(e) => setLastAccess(e.target.value)}
                    className="text-xs py-1.5"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: "var(--muted)" }}>
                이번 주 할 일
              </label>
              <div className="space-y-2 mb-3">
                {weeklyTasks.map((task, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                    style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
                  >
                    <span className="text-sm text-white flex-1">📌 {task}</span>
                    <button
                      onClick={() => removeTask(idx)}
                      className="text-xs hover:text-red-400 transition-colors"
                      style={{ color: "var(--muted)" }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="할 일 추가..."
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                />
                <button
                  onClick={addTask}
                  className="px-4 py-2 rounded-xl text-white text-sm font-medium shrink-0 transition-opacity hover:opacity-80"
                  style={{ background: "var(--accent)" }}
                >
                  추가
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>
                다음 목표
              </label>
              <input
                type="text"
                value={nextGoal}
                onChange={(e) => setNextGoal(e.target.value)}
                placeholder="다음에 달성할 목표..."
              />
            </div>

            <button
              onClick={handleSaveWeekly}
              disabled={saving}
              className="w-full py-2.5 rounded-xl font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-80"
              style={{ background: "var(--accent)" }}
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        )}

        {/* 캐릭터 탭 */}
        {tab === "characters" && (
          <div className="space-y-6">
            {(Object.entries(PRIORITY_RANK_CONFIG) as [PriorityRank, typeof PRIORITY_RANK_CONFIG[PriorityRank]][]).map(([rank, cfg]) => {
              const chars = charByRank(rank);
              return (
                <div key={rank}>
                  <h3
                    className="text-sm font-medium mb-2 flex items-center gap-1.5"
                    style={{ color: "var(--muted)" }}
                  >
                    {cfg.emoji} {cfg.label}
                    {chars.length > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--card-border)" }}>
                        {chars.length}
                      </span>
                    )}
                  </h3>
                  {chars.length === 0 ? (
                    <p className="text-xs" style={{ color: "var(--card-border)" }}>
                      없음
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {chars.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm"
                          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
                        >
                          <span className="text-white">{c.name}</span>
                          {c.notes && (
                            <span className="text-xs" style={{ color: "var(--muted)" }}>
                              ({c.notes})
                            </span>
                          )}
                          <button
                            onClick={() => deleteCharacter(c.id)}
                            className="text-xs hover:text-red-400 transition-colors"
                            style={{ color: "var(--muted)" }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div
              className="rounded-xl border p-4 space-y-3"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
            >
              <p className="text-sm font-medium text-white">캐릭터 추가</p>
              <input
                type="text"
                value={newCharName}
                onChange={(e) => setNewCharName(e.target.value)}
                placeholder="캐릭터 이름"
              />
              <div className="flex flex-wrap gap-1">
                {(Object.entries(PRIORITY_RANK_CONFIG) as [PriorityRank, typeof PRIORITY_RANK_CONFIG[PriorityRank]][]).map(([rank, cfg]) => (
                  <button
                    key={rank}
                    onClick={() => setNewCharRank(rank)}
                    className="text-xs px-2 py-1 rounded-lg border transition-colors"
                    style={{
                      borderColor: newCharRank === rank ? "var(--accent)" : "var(--card-border)",
                      background: newCharRank === rank ? "rgba(124,58,237,0.15)" : "transparent",
                      color: newCharRank === rank ? "white" : "var(--muted)",
                    }}
                  >
                    {cfg.emoji} {cfg.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={newCharNotes}
                onChange={(e) => setNewCharNotes(e.target.value)}
                placeholder="부가 메모 (선택)"
              />
              <button
                onClick={addCharacter}
                disabled={!newCharName.trim()}
                className="w-full py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-80"
                style={{ background: "var(--accent)" }}
              >
                캐릭터 추가
              </button>
            </div>
          </div>
        )}

        {/* 파티 탭 */}
        {tab === "party" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>
                파티 구조 메모
              </label>
              <p className="text-xs mb-3" style={{ color: "var(--card-border)" }}>
                이 게임의 파티 기준을 자유롭게 기록하세요. (예: 메인딜러/버퍼/힐러/탱커)
              </p>
              <textarea
                value={partyMemo}
                onChange={(e) => setPartyMemo(e.target.value)}
                placeholder="예:&#10;- 메인 딜러: 아리나&#10;- 버퍼: 코르니아&#10;- 힐러: 레나&#10;- 탱커: 테셀&#10;&#10;다음 파티: 속성 파티 전환 예정"
                rows={10}
                style={{ resize: "vertical" }}
              />
            </div>
            <button
              onClick={handleSaveParty}
              disabled={saving}
              className="w-full py-2.5 rounded-xl font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-80"
              style={{ background: "var(--accent)" }}
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        )}

        {/* 메모 탭 */}
        {tab === "memo" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>
                기타 메모
              </label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="공략 링크, 이벤트 일정, 재화 계획 등 자유롭게..."
                rows={12}
                style={{ resize: "vertical" }}
              />
            </div>
            <button
              onClick={handleSaveMemo}
              disabled={saving}
              className="w-full py-2.5 rounded-xl font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-80"
              style={{ background: "var(--accent)" }}
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
