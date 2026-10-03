import type { Franchise, GameMaster, Game, UserGame } from "../types/index";
export const FRANCHISES: Franchise[] = [
  { id: "genshin", name: "원신" },
  { id: "honkai", name: "붕괴" },
  { id: "wuthering-waves", name: "명조" },
  { id: "blue-archive", name: "블루 아카이브" },
  { id: "nikke", name: "승리의 여신: 니케" },
  { id: "arknights", name: "명일방주" },
];
export const GAME_CATALOG: GameMaster[] = [
  {
    id: "genshin-impact",
    name: "원신",
    aliases: ["genshin", "genshin impact"],
    franchise_id: "genshin",
    color: "#5bbfdb",
  },
  {
    id: "honkai-star-rail",
    name: "붕괴: 스타레일",
    aliases: ["붕괴 스타레일", "스타레일", "honkai star rail", "starrail"],
    franchise_id: "honkai",
    color: "#a882e8",
  },
  {
    id: "wuthering-waves",
    name: "명조",
    aliases: ["명조: 워더링 웨이브", "wuthering waves", "wuwa"],
    franchise_id: "wuthering-waves",
    color: "#62c48a",
  },
  {
    id: "blue-archive",
    name: "블루 아카이브",
    aliases: ["블루아카이브", "blue archive"],
    franchise_id: "blue-archive",
    color: "#6ab0f0",
  },
  {
    id: "nikke",
    name: "승리의 여신: 니케",
    aliases: ["니케", "nikke", "승리의 여신 니케"],
    franchise_id: "nikke",
    color: "#e87090",
  },
  {
    id: "arknights",
    name: "명일방주",
    aliases: ["arknights"],
    franchise_id: "arknights",
    color: "#e8a870",
  },
  {
    id: "zenless-zone-zero",
    name: "젠레스 존 제로",
    aliases: ["젠레스", "zzz", "zenless zone zero"],
    franchise_id: null,
    color: "#b6d56a",
  },
  {
    id: "limbus-company",
    name: "림버스 컴퍼니",
    aliases: ["림버스", "limbus company"],
    franchise_id: null,
    color: "#df976a",
  },
];
export const normalizeGameName = (name: string) =>
  name
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[\s:：·._-]+/g, "");
export function resolveGame(name: string): GameMaster {
  const normalized = normalizeGameName(name.trim());
  const known = GAME_CATALOG.find((g) =>
    [g.name, g.id, ...g.aliases].some(
      (a) => normalizeGameName(a) === normalized,
    ),
  );
  if (known) return known;
  // Reversible UTF-8 key: deterministic across services, with no hash collisions.
  const id =
    "custom-" +
    Array.from(new TextEncoder().encode(normalized), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  return {
    id,
    name: name.trim(),
    aliases: [],
    franchise_id: null,
    color: "#c9a84c",
  };
}
export const gameColor = (game: Game) =>
  GAME_CATALOG.find((g) => g.id === game.game_id)?.color ?? "#c9a84c";
export function toSharedUserGame(g: Game): UserGame {
  const {
    id,
    user_id,
    game_id,
    intensity,
    last_access,
    display_order,
    created_at,
    updated_at,
  } = g;
  return {
    id,
    user_id,
    game_id,
    intensity,
    last_access,
    display_order,
    created_at,
    updated_at,
  };
}
