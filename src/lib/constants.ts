import type { CurrentGoal } from "@/types";
export const GOAL_CONFIG: Record<CurrentGoal, { label: string }> = {
  story: { label: "스토리 진행" },
  "gear-farming": { label: "장비 파밍" },
  "character-leveling": { label: "캐릭터 육성" },
  "currency-saving": { label: "재화 모으기" },
  "event-only": { label: "이벤트 참여" },
  rest: { label: "휴식" },
};
