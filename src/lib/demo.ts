import {
  normalizeGame,
  normalizeCharacter,
  koreaDate,
  defaultProfile,
} from "./model";
import type { BackupData } from "./storage/repository";
import type { Game, Quest } from "../types/index";
function quest(
  id: string,
  label: string,
  type: Quest["type"],
  current: number,
  total: number,
  days?: number,
): Quest {
  return {
    id,
    label,
    type,
    current,
    total,
    done: current === total,
    deadline:
      days === undefined
        ? null
        : koreaDate(new Date(Date.now() + days * 86400000)),
  };
}
export function demoData(): BackupData {
  const games = [
    {
      id: "demo-genshin",
      name: "원신",
      intensity: "main",
      estimated_minutes: 90,
      next_goal: "나선비경 36성 클리어",
      quests: [
        quest("g1", "일일 의뢰 4회 완료", "daily", 3, 4),
        quest("g2", "레진 160개 소모", "daily", 80, 160),
        quest("g3", "주간 보스 3회 처치", "weekly", 1, 3),
        quest("g4", "성유물 비경 4회 도전", "weekly", 2, 4),
        quest("g5", "나선비경 도전", "weekly", 0, 1),
        quest("g6", "이벤트 보상 모두 받기", "event", 5, 10, 3),
      ],
    },
    {
      id: "demo-starrail",
      name: "붕괴: 스타레일",
      intensity: "main",
      estimated_minutes: 60,
      next_goal: "망각의 정원 도전",
      quests: [
        quest("s1", "개척력 소모", "daily", 140, 240),
        quest("s2", "일일 훈련 완료", "daily", 2, 4),
        quest("s3", "시뮬레이션 우주 보상", "weekly", 1, 3),
        quest("s4", "망각의 정원 도전", "weekly", 1, 2),
        quest("s5", "접속 보상 받기", "daily", 1, 1),
      ],
    },
    {
      id: "demo-wuwa",
      name: "명조",
      intensity: "sub",
      estimated_minutes: 45,
      next_goal: "역경의 탑 도전",
      quests: [
        quest("w1", "결정 웨이브 플레이트 소모", "daily", 100, 240),
        quest("w2", "일일 임무 완료", "daily", 3, 4),
        quest("w3", "역경의 탑 도전", "weekly", 0, 1),
        quest("w4", "육성 재료 수집", "weekly", 2, 5),
      ],
    },
    {
      id: "demo-blue",
      name: "블루 아카이브",
      intensity: "login-only",
      estimated_minutes: 15,
      next_goal: "총력전 보상 받기",
      quests: [
        quest("b1", "일일 출석 체크", "daily", 1, 1),
        quest("b2", "카페 접속 보상", "daily", 1, 1),
        quest("b3", "스케줄 3회", "daily", 3, 3),
        quest("b4", "총력전 3회 도전", "weekly", 0, 3),
      ],
    },
    {
      id: "demo-nikke",
      name: "니케",
      intensity: "abandoned",
      estimated_minutes: 10,
      next_goal: "새로운 챕터 시작",
      quests: [
        quest("n1", "일일 접속 보상", "daily", 0, 1),
        quest("n2", "전초기지 자원 수령", "daily", 0, 1),
      ],
    },
  ].map((g, i) =>
    normalizeGame({
      ...g,
      display_order: i,
      last_access: koreaDate(new Date(Date.now() - (i % 3) * 86400000)),
    }),
  );
  const characters = [
    {
      id: "demo-c1",
      game_id: games[0].id,
      name: "클로린드",
      element: "번개",
      priority_rank: "priority1",
      current_level: 70,
      target_level: 90,
      completed_nodes: 6,
      notes: "메인 딜러. 무기 육성 후 성유물 파밍",
    },
    {
      id: "demo-c2",
      game_id: games[0].id,
      name: "나히다",
      element: "풀",
      priority_rank: "complete",
      current_level: 90,
      target_level: 90,
      completed_nodes: 10,
      notes: "목표 달성. 파티 조합을 시험해 보기",
    },
    {
      id: "demo-c3",
      game_id: games[0].id,
      name: "행추",
      element: "물",
      priority_rank: "priority2",
      current_level: 60,
      target_level: 80,
      completed_nodes: 4,
      notes: "원소 폭발 특성부터 올리기",
    },
    {
      id: "demo-c4",
      game_id: games[1].id,
      name: "아케론",
      element: "번개",
      priority_rank: "priority1",
      current_level: 70,
      target_level: 80,
      completed_nodes: 5,
      notes: "이번 주 우선 육성",
    },
    {
      id: "demo-c5",
      game_id: games[1].id,
      name: "링스",
      element: "양자",
      priority_rank: "on-hold",
      current_level: 60,
      target_level: 70,
      completed_nodes: 3,
      notes: "재료 여유가 생기면 육성",
    },
    {
      id: "demo-c6",
      game_id: games[2].id,
      name: "방랑자",
      element: "회절",
      priority_rank: "priority2",
      current_level: 50,
      target_level: 70,
      completed_nodes: 4,
      notes: "스킬 강화 재료를 모으는 중",
    },
  ].map((c) => normalizeCharacter(c));
  games[0].parties = [
    {
      id: "demo-party",
      name: "모험 파티",
      slots: ["demo-c1", "demo-c2", "demo-c3", null],
      notes: "원소 반응을 활용하고 회복 캐릭터를 보완하기",
    },
  ];
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    games: games as Game[],
    characters,
    profile: defaultProfile(),
  };
}
