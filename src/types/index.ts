/** Shared ecosystem contracts. IDs are independent of a user's library entry. */
export interface Franchise {
  id: string;
  name: string;
}
export interface GameMaster {
  id: string;
  name: string;
  aliases: string[];
  franchise_id: string | null;
  color: string;
}
export interface User {
  id: string;
  display_name: string;
}
export type PlayIntensity =
  "main" | "sub" | "login-only" | "frozen" | "abandoned";
export type CurrentGoal =
  | "story"
  | "gear-farming"
  | "character-leveling"
  | "currency-saving"
  | "event-only"
  | "rest";
export type Urgency = "high" | "medium" | "low";
export type PriorityRank =
  | "priority1"
  | "priority2"
  | "on-hold"
  | "favorite"
  | "bad-investment"
  | "complete";
export interface UserGame {
  id: string;
  user_id: string;
  game_id: string;
  intensity: PlayIntensity;
  last_access: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}
export interface Quest {
  id: string;
  label: string;
  current: number;
  total: number;
  type: "daily" | "weekly" | "event";
  deadline: string | null;
  done: boolean;
}
/** Stored alongside UserGame for a minimal, backwards-compatible Firestore rollout. */
export interface Game extends UserGame {
  name: string;
  icon: string | null;
  current_goal: CurrentGoal | null;
  weekly_tasks: string[];
  weekly_tasks_done: boolean[];
  quests: Quest[];
  next_goal: string | null;
  urgency: Urgency;
  party_memo: string | null;
  memo: string | null;
  estimated_minutes: number;
  parties: Party[];
}
export interface Character {
  id: string;
  /** Historical field: references UserGame.id, NOT GameMaster.id. */
  game_id: string;
  name: string;
  priority_rank: PriorityRank;
  notes: string | null;
  created_at: string;
  element: string;
  current_level: number;
  target_level: number;
  completed_nodes: number;
  total_nodes: number;
}
export interface Party {
  id: string;
  name: string;
  slots: (string | null)[];
  notes: string;
}
export interface UserProfile {
  user_id: string;
  display_name: string;
  timezone: "Asia/Seoul";
  reset_day: number;
  reset_hour: number;
  reminders: { weekly: boolean; events: boolean; daily: boolean };
}
