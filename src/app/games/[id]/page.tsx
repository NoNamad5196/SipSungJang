"use client";

import { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { repository } from "@/lib/storage";
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
type SaveStatus = "idle" | "pending" | "saved";

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [game, setGame] = useState<Game | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [tab, setTab] = useState<Tab>("weekly");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

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

  const [newCharName, setNewCharName] = useState("");
  const [newCharRank, setNewCharRank] = useState<PriorityRank>("priority1");
  const [newCharNotes, setNewCharNotes] = useState("");

  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      const g = await repository.getGame(id);
      if (!g) { router.push("/dashboard"); return; }
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
      const chars = await repository.getCharacters(id);
      setCharacters(chars);
      setLoading(false);
      hasLoadedRef.current = true;
    }
    load();
  }, [id]);

  // auto-save with 1.5s debounce
  useEffect(() => {
    if (!hasLoadedRef.current) return;

    setSaveStatus("pending");

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await repository.updateGame(id, {
        weekly_tasks: weeklyTasks,
        next_goal: nextGoal || null,
        last_access: lastAccess || null,
        current_goal: currentGoal ?? undefined,
        urgency,
        party_memo: partyMemo,
        memo,
      });

      setSaveStatus("saved");

      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    }, 1500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [weeklyTasks, nextGoal, lastAccess, currentGoal, urgency, partyMemo, memo]);

  async function handleSaveName() {
    if (!name.trim()) return;
    await repository.updateGame(id, { name: name.trim() });
    setEditingName(false);
  }

  async function handleDeleteGame() {
    if (!confirm(`"${game?.name}" 게임을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    await repository.deleteGame(id);
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
    const char = await repository.addCharacter({
      game_id: id,
      name: newCharName.trim(),
      priority_rank: newCharRank,
      notes: newCharNotes.trim() || null,
    });
    setCharacters([...characters, char]);
    setNewCharName("");
    setNewCharNotes("");
  }

  async function deleteCharacter(charId: string) {
    await repository.deleteCharacter(charId);
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
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard" className="text-sm shrink-0" style={{ color: "var(--muted)" }}>
              ← 대시보드
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              {game?.icon && <span className="text-xl shrink-0">{game.icon}</span>}
              {editingName ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-white font-semibold text-sm"
                  style={{ width: "160px", padding: "2px 6px" }}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  autoFocus
                />
              ) : (
                <button
                  className="font-semibold text-white text-sm hover:underline truncate"
                  onClick={() => setEditingName(true)}
                >
                  {name}
                </button>
              )}
              <IntensityBadge intensity={intensity} size="sm" />
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {saveStatus === "pending" && (
              <span className="text-xs" style={{ color: "var(--muted)" }}>저장 중...</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-xs text-green-400">✓ 저장됨</span>
            )}
            <button
              onClick={handleDeleteGame}
              className="text-xs px-2 py-1 rounded-lg border transition-colors hover:border-red-500/50"
              style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
            >
              삭제
            </button>
          </div>
        </div>
      </header>

      {/* 강도 빠른 전환 */}
      <div className="border-b px-4 py-3" style={{ borderColor: "var(--card-border)" }}>
        <div className="max-w-2xl mx-auto flex flex-wrap gap-2">
          {(Object.entries(INTENSITY_CONFIG) as [PlayIntensity, typeof INTENSITY_CONFIG[PlayIntensity]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={async () => {
                setIntensity(key);
                await repository.updateGame(id, { intensity: key });
              }}
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

      {/* 탭 바 */}
      <div className="border-b px-4" style={{ borderColor: "var(--card-border)" }}>
        <div className="max-w-2xl mx-auto flex">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                tab === t.key ? "border-purple-500 text-white" : "border-transparent"
              )}
              style={{ color: tab === t.key ? "white" : "var(--muted)" }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {tab === "weekly" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>현재 목표</label>
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
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>급한 정도</label>
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
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>마지막 접속일</label>
                  <input type="date" value={lastAccess} onChange={(e) => setLastAccess(e.target.value)} className="text-xs py-1.5" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: "var(--muted)" }}>이번 주 할 일</label>
              <div className="space-y-2 mb-3">
                {weeklyTasks.map((task, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
                    <span className="text-sm text-white flex-1">📌 {task}</span>
                    <button onClick={() => removeTask(idx)} className="text-xs hover:text-red-400 transition-colors" style={{ color: "var(--muted)" }}>✕</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="할 일 추가..." onKeyDown={(e) => e.key === "Enter" && addTask()} />
                <button onClick={addTask} className="px-4 py-2 rounded-xl text-white text-sm font-medium shrink-0 transition-opacity hover:opacity-80" style={{ background: "var(--accent)" }}>추가</button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>다음 목표</label>
              <input type="text" value={nextGoal} onChange={(e) => setNextGoal(e.target.value)} placeholder="다음에 달성할 목표..." />
            </div>
          </div>
        )}

        {tab === "characters" && (
          <div className="space-y-6">
            {(Object.entries(PRIORITY_RANK_CONFIG) as [PriorityRank, typeof PRIORITY_RANK_CONFIG[PriorityRank]][]).map(([rank, cfg]) => {
              const chars = charByRank(rank);
              return (
                <div key={rank}>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
                    {cfg.emoji} {cfg.label}
                    {chars.length > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--card-border)" }}>{chars.length}</span>}
                  </h3>
                  {chars.length === 0 ? (
                    <p className="text-xs" style={{ color: "var(--card-border)" }}>없음</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {chars.map((c) => (
                        <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
                          <span className="text-white">{c.name}</span>
                          {c.notes && <span className="text-xs" style={{ color: "var(--muted)" }}>({c.notes})</span>}
                          <button onClick={() => deleteCharacter(c.id)} className="text-xs hover:text-red-400 transition-colors" style={{ color: "var(--muted)" }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="rounded-xl border p-4 space-y-3" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
              <p className="text-sm font-medium text-white">캐릭터 추가</p>
              <input type="text" value={newCharName} onChange={(e) => setNewCharName(e.target.value)} placeholder="캐릭터 이름" />
              <div className="flex flex-wrap gap-1">
                {(Object.entries(PRIORITY_RANK_CONFIG) as [PriorityRank, typeof PRIORITY_RANK_CONFIG[PriorityRank]][]).map(([rank, cfg]) => (
                  <button key={rank} onClick={() => setNewCharRank(rank)} className="text-xs px-2 py-1 rounded-lg border transition-colors" style={{ borderColor: newCharRank === rank ? "var(--accent)" : "var(--card-border)", background: newCharRank === rank ? "rgba(124,58,237,0.15)" : "transparent", color: newCharRank === rank ? "white" : "var(--muted)" }}>
                    {cfg.emoji} {cfg.label}
                  </button>
                ))}
              </div>
              <input type="text" value={newCharNotes} onChange={(e) => setNewCharNotes(e.target.value)} placeholder="부가 메모 (선택)" />
              <button onClick={addCharacter} disabled={!newCharName.trim()} className="w-full py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-80" style={{ background: "var(--accent)" }}>
                캐릭터 추가
              </button>
            </div>
          </div>
        )}

        {tab === "party" && (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>파티 구조 메모</label>
            <p className="text-xs mb-3" style={{ color: "var(--card-border)" }}>이 게임의 파티 기준을 자유롭게 기록하세요.</p>
            <textarea value={partyMemo} onChange={(e) => setPartyMemo(e.target.value)} placeholder={"예:\n- 메인 딜러: 아리나\n- 버퍼: 코르니아\n- 힐러: 레나\n- 탱커: 테셀"} rows={10} style={{ resize: "vertical" }} />
          </div>
        )}

        {tab === "memo" && (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>기타 메모</label>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="공략 링크, 이벤트 일정, 재화 계획 등 자유롭게..." rows={12} style={{ resize: "vertical" }} />
          </div>
        )}
      </main>
    </div>
  );
}
