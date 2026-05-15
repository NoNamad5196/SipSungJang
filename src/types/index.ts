export type PlayIntensity = "main" | "sub" | "login-only" | "frozen" | "abandoned";

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
  | "bad-investment";

export interface Game {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  intensity: PlayIntensity;
  current_goal: CurrentGoal | null;
  weekly_tasks: string[];
  next_goal: string | null;
  urgency: Urgency;
  last_access: string | null;
  party_memo: string | null;
  memo: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  game_id: string;
  name: string;
  priority_rank: PriorityRank;
  notes: string | null;
  created_at: string;
}
