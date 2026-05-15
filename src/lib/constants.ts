import type { CurrentGoal, PlayIntensity, PriorityRank, Urgency } from "@/types";

export const INTENSITY_CONFIG: Record<
  PlayIntensity,
  { label: string; emoji: string; color: string; order: number }
> = {
  main: { label: "메인", emoji: "🔥", color: "bg-orange-500/20 text-orange-300 border-orange-500/30", order: 0 },
  sub: { label: "서브", emoji: "🌤", color: "bg-blue-500/20 text-blue-300 border-blue-500/30", order: 1 },
  "login-only": { label: "접속만", emoji: "🌙", color: "bg-purple-500/20 text-purple-300 border-purple-500/30", order: 2 },
  frozen: { label: "냉동", emoji: "❄️", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", order: 3 },
  abandoned: { label: "방치", emoji: "🪦", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30", order: 4 },
};

export const GOAL_CONFIG: Record<CurrentGoal, { label: string; emoji: string }> = {
  story: { label: "스토리 밀기", emoji: "📖" },
  "gear-farming": { label: "장비 파밍", emoji: "⚔️" },
  "character-leveling": { label: "캐릭터 육성", emoji: "⬆️" },
  "currency-saving": { label: "재화 존버", emoji: "💰" },
  "event-only": { label: "이벤트만", emoji: "🎪" },
  rest: { label: "휴식", emoji: "😴" },
};

export const URGENCY_CONFIG: Record<Urgency, { label: string; color: string }> = {
  high: { label: "급함", color: "text-red-400" },
  medium: { label: "보통", color: "text-yellow-400" },
  low: { label: "여유", color: "text-green-400" },
};

export const PRIORITY_RANK_CONFIG: Record<PriorityRank, { label: string; emoji: string; color: string }> = {
  priority1: { label: "1순위 육성", emoji: "⭐", color: "bg-yellow-500/20 border-yellow-500/30" },
  priority2: { label: "2순위 육성", emoji: "🌟", color: "bg-blue-500/20 border-blue-500/30" },
  "on-hold": { label: "보류", emoji: "⏸️", color: "bg-zinc-500/20 border-zinc-500/30" },
  favorite: { label: "애정캐", emoji: "💖", color: "bg-pink-500/20 border-pink-500/30" },
  "bad-investment": { label: "투자 손해", emoji: "⚠️", color: "bg-red-500/20 border-red-500/30" },
};

export const INTENSITY_ORDER: PlayIntensity[] = ["main", "sub", "login-only", "frozen", "abandoned"];
