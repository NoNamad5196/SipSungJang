import type {
  AgentSignal,
  AgentSignalKind,
  AgentSourceApp,
  Character,
  Game,
  Quest,
  UserProfile,
} from "../types/index";
import { resolveGame } from "./catalog";
export const INTENSITIES = [
  "main",
  "sub",
  "login-only",
  "frozen",
  "abandoned",
] as const;
export const PRIORITIES = [
  "priority1",
  "priority2",
  "on-hold",
  "favorite",
  "bad-investment",
  "complete",
] as const;
export const AGENT_SIGNAL_KINDS = [
  "game_started",
  "game_stopped",
  "manual_sync",
  "spending_alert",
] as const;
export const AGENT_SOURCE_APPS = [
  "sipsungjang",
  "gachaguard",
  "otakuhub",
] as const;
export const defaultProfile = (user_id = "local"): UserProfile => ({
  user_id,
  display_name: "모험가",
  timezone: "Asia/Seoul",
  reset_day: 1,
  reset_hour: 5,
  reminders: { weekly: true, events: true, daily: false },
});
export const percent = (current: number, total: number) =>
  total > 0
    ? Math.min(100, Math.max(0, Math.round((current / total) * 100)))
    : 0;
export function koreaDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function relativeDate(date: string | null) {
  if (!date) return "기록 없음";
  const days = Math.round(
    (Date.parse(koreaDate()) - Date.parse(date)) / 86400000,
  );
  return days === 0
    ? "오늘"
    : days === 1
      ? "어제"
      : days > 1
        ? `${days}일 전`
        : date;
}
export function deadlineLabel(date: string) {
  const days = Math.round(
    (Date.parse(date) - Date.parse(koreaDate())) / 86400000,
  );
  return days < 0
    ? `${-days}일 지남`
    : days === 0
      ? "오늘 마감"
      : `${days}일 후`;
}
export function nextReset(profile: UserProfile, now = new Date()): Date {
  const kst = new Date(now.getTime() + 9 * 3600000);
  const target = new Date(
    Date.UTC(
      kst.getUTCFullYear(),
      kst.getUTCMonth(),
      kst.getUTCDate(),
      profile.reset_hour - 9,
    ),
  );
  const delta = (profile.reset_day - kst.getUTCDay() + 7) % 7;
  target.setUTCDate(target.getUTCDate() + delta);
  if (target <= now) target.setUTCDate(target.getUTCDate() + 7);
  return target;
}
export function resetLabel(profile: UserProfile, now = new Date()) {
  const minutes = Math.max(
    0,
    Math.ceil((nextReset(profile, now).getTime() - now.getTime()) / 60000),
  );
  return `${Math.floor(minutes / 1440)}일 ${Math.floor((minutes % 1440) / 60)}시간 ${minutes % 60}분`;
}
const str = (v: unknown, fallback = "") =>
  typeof v === "string" ? v : fallback;
const num = (v: unknown, fallback = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
export function normalizeGame(
  value: unknown,
  id?: string,
  userId?: string,
): Game {
  const g = record(value),
    name = str(g.name).trim();
  if (!name || name.length > 120 || !str(id ?? g.id))
    throw new Error("게임 이름 또는 식별자가 올바르지 않습니다.");
  const oldTasks = Array.isArray(g.weekly_tasks)
    ? g.weekly_tasks.map((t) => str(t))
    : [];
  const oldDone = Array.isArray(g.weekly_tasks_done) ? g.weekly_tasks_done : [];
  const quests: Quest[] = Array.isArray(g.quests)
    ? g.quests.map((value, index) => {
        const t = record(value),
          total = Math.max(1, num(t.total, 1));
        const current = Math.max(0, Math.min(total, num(t.current)));
        return {
          id: str(t.id, `${id ?? g.id}-q-${index}`),
          label: str(t.label),
          total,
          current: t.done ? total : current,
          type: t.type === "daily" || t.type === "event" ? t.type : "weekly",
          deadline:
            typeof t.deadline === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(t.deadline)
              ? t.deadline
              : null,
          done: Boolean(t.done) || current === total,
        };
      })
    : oldTasks.map((label, i) => ({
        id: `${id ?? g.id}-legacy-${i}`,
        label,
        total: 1,
        current: oldDone[i] ? 1 : 0,
        done: Boolean(oldDone[i]),
        type: "weekly",
        deadline: null,
      }));
  const now = new Date().toISOString(),
    goals = [
      "story",
      "gear-farming",
      "character-leveling",
      "currency-saving",
      "event-only",
      "rest",
    ];
  return {
    id: str(id ?? g.id),
    user_id: userId ?? str(g.user_id, "local"),
    game_id: str(g.game_id) || resolveGame(name).id,
    name,
    icon: typeof g.icon === "string" ? g.icon : null,
    intensity: INTENSITIES.includes(g.intensity as Game["intensity"])
      ? (g.intensity as Game["intensity"])
      : "sub",
    current_goal: goals.includes(str(g.current_goal))
      ? (g.current_goal as Game["current_goal"])
      : null,
    weekly_tasks: quests.map((t) => t.label),
    weekly_tasks_done: quests.map((t) => t.done),
    quests,
    next_goal: typeof g.next_goal === "string" ? g.next_goal : null,
    urgency: g.urgency === "high" || g.urgency === "low" ? g.urgency : "medium",
    last_access: typeof g.last_access === "string" ? g.last_access : null,
    party_memo: typeof g.party_memo === "string" ? g.party_memo : null,
    memo: typeof g.memo === "string" ? g.memo : null,
    display_order: num(g.display_order),
    created_at: str(g.created_at, now),
    updated_at: str(g.updated_at, now),
    estimated_minutes: Math.max(0, num(g.estimated_minutes, 30)),
    parties: Array.isArray(g.parties)
      ? g.parties.map((value, i) => {
          const p = record(value);
          return {
            id: str(p.id, `party-${i}`),
            name: str(p.name, "기본 파티"),
            slots: Array.isArray(p.slots)
              ? p.slots
                  .slice(0, 8)
                  .map((s) => (typeof s === "string" ? s : null))
              : [null, null, null, null],
            notes: str(p.notes),
          };
        })
      : [],
  };
}
export function normalizeCharacter(value: unknown, id?: string): Character {
  const c = record(value);
  if (!str(c.name).trim() || !str(c.game_id) || !str(id ?? c.id))
    throw new Error("캐릭터 정보가 올바르지 않습니다.");
  return {
    id: str(id ?? c.id),
    game_id: str(c.game_id),
    name: str(c.name).trim(),
    priority_rank: PRIORITIES.includes(
      c.priority_rank as Character["priority_rank"],
    )
      ? (c.priority_rank as Character["priority_rank"])
      : "on-hold",
    notes: typeof c.notes === "string" ? c.notes : null,
    created_at: str(c.created_at, new Date().toISOString()),
    element: str(c.element, "미지정"),
    current_level: Math.max(1, num(c.current_level, 1)),
    target_level: Math.max(1, num(c.target_level, 90)),
    completed_nodes: Math.max(0, num(c.completed_nodes)),
    total_nodes: Math.max(1, num(c.total_nodes, 10)),
  };
}
export function normalizeProfile(value: unknown, userId: string): UserProfile {
  const p = record(value),
    d = defaultProfile(userId),
    r = record(p.reminders);
  return {
    ...d,
    display_name: str(p.display_name).trim().slice(0, 40) || d.display_name,
    reset_day: Math.min(6, Math.max(0, Math.trunc(num(p.reset_day, 1)))),
    reset_hour: Math.min(23, Math.max(0, Math.trunc(num(p.reset_hour, 5)))),
    reminders: {
      weekly: typeof r.weekly === "boolean" ? r.weekly : true,
      events: typeof r.events === "boolean" ? r.events : true,
      daily: typeof r.daily === "boolean" ? r.daily : false,
    },
  };
}
function toIsoTimestamp(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const ms = Date.parse(trimmed);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  }
  if (value && typeof value === "object") {
    const maybeTimestamp = value as {
      toDate?: () => unknown;
      seconds?: unknown;
      nanoseconds?: unknown;
    };
    if (typeof maybeTimestamp.toDate === "function") {
      const converted = maybeTimestamp.toDate();
      return converted instanceof Date && Number.isFinite(converted.getTime())
        ? converted.toISOString()
        : null;
    }
    if (
      typeof maybeTimestamp.seconds === "number" &&
      Number.isFinite(maybeTimestamp.seconds)
    ) {
      const nanos =
        typeof maybeTimestamp.nanoseconds === "number" &&
        Number.isFinite(maybeTimestamp.nanoseconds)
          ? maybeTimestamp.nanoseconds
          : 0;
      const ms = maybeTimestamp.seconds * 1000 + Math.trunc(nanos / 1_000_000);
      return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
    }
  }
  return null;
}
export function normalizeAgentSignal(
  value: unknown,
  id?: string,
  now = new Date(),
): AgentSignal | null {
  const s = record(value);
  const signalId = str(id ?? s.id).trim();
  if (!signalId) return null;
  if (!AGENT_SIGNAL_KINDS.includes(s.kind as AgentSignalKind)) return null;
  if (!AGENT_SOURCE_APPS.includes(s.source_app as AgentSourceApp)) return null;
  const occurredAt = toIsoTimestamp(s.occurred_at);
  const receivedAt = toIsoTimestamp(s.received_at);
  const expiresAt = toIsoTimestamp(s.expires_at);
  if (!occurredAt || !receivedAt || !expiresAt) return null;
  if (Date.parse(expiresAt) <= now.getTime()) return null;
  const gameId =
    typeof s.game_id === "string" && s.game_id.trim() ? s.game_id.trim() : null;
  const userGameId =
    typeof s.user_game_id === "string" && s.user_game_id.trim()
      ? s.user_game_id.trim()
      : null;
  const message =
    typeof s.message === "string" && s.message.trim()
      ? s.message.trim().slice(0, 500)
      : null;
  const amount =
    typeof s.amount === "number" && Number.isFinite(s.amount) && s.amount >= 0
      ? Math.trunc(s.amount)
      : null;
  const currency =
    typeof s.currency === "string" && s.currency.trim()
      ? s.currency.trim().toUpperCase().slice(0, 12)
      : null;
  return {
    id: signalId,
    kind: s.kind as AgentSignalKind,
    source_app: s.source_app as AgentSourceApp,
    game_id: gameId,
    user_game_id: userGameId,
    occurred_at: occurredAt,
    received_at: receivedAt,
    expires_at: expiresAt,
    message,
    amount,
    currency,
  };
}
