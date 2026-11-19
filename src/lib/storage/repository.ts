import type {
  AgentSignal,
  Character,
  Game,
  UserProfile,
} from "../../types/index";
import { normalizeGame, normalizeCharacter, normalizeProfile } from "../model";
export type CreateGameInput = Omit<
  Game,
  "id" | "user_id" | "created_at" | "updated_at"
>;
export type CreateCharacterInput = Omit<Character, "id" | "created_at">;
export interface BackupData {
  version: number;
  exportedAt: string;
  games: Game[];
  characters: Character[];
  profile?: UserProfile;
}
export interface IRepository {
  getGames(): Promise<Game[]>;
  getGame(id: string): Promise<Game | null>;
  createGame(data: CreateGameInput): Promise<Game>;
  updateGame(id: string, data: Partial<Game>): Promise<Game>;
  deleteGame(id: string): Promise<void>;
  reorderGames(ids: string[]): Promise<void>;
  getCharacters(gameId?: string): Promise<Character[]>;
  addCharacter(data: CreateCharacterInput): Promise<Character>;
  updateCharacter(id: string, data: Partial<Character>): Promise<Character>;
  deleteCharacter(id: string): Promise<void>;
  getProfile(): Promise<UserProfile>;
  saveProfile(profile: UserProfile): Promise<void>;
  listAgentSignals(limit?: number): Promise<AgentSignal[]>;
  exportData(): Promise<BackupData>;
  importData(data: BackupData): Promise<void>;
}
/** Deterministic cloud document IDs prevent an import racing with registration. */
export function prepareCloudBackup(
  data: BackupData,
  userId: string,
): BackupData {
  const unique = mergeBackup(
    { version: 2, exportedAt: "", games: [], characters: [] },
    data,
    userId,
  );
  const ids = new Map(unique.games.map((g) => [g.id, g.game_id]));
  return {
    ...unique,
    games: unique.games.map((g) => ({ ...g, id: g.game_id })),
    characters: unique.characters.map((c) => ({
      ...c,
      game_id: ids.get(c.game_id)!,
    })),
  };
}
export function validateBackup(value: unknown): BackupData {
  if (!value || typeof value !== "object")
    throw new Error("올바른 수첩 백업 파일이 아닙니다.");
  const b = value as BackupData;
  if (
    ![1, 2].includes(b.version) ||
    !Array.isArray(b.games) ||
    !Array.isArray(b.characters)
  )
    throw new Error(
      "지원하지 않는 백업 형식입니다. V1 또는 V2 JSON 파일을 선택해 주세요.",
    );
  const safeId = (id: unknown) =>
    typeof id === "string" &&
    id.length > 0 &&
    id.length <= 1000 &&
    !id.includes("/") &&
    id !== "." &&
    id !== "..";
  if (
    b.games.some((g) => !g || !safeId(g.id)) ||
    b.characters.some((c) => !c || !safeId(c.id))
  )
    throw new Error("백업의 식별자가 올바르지 않습니다.");
  const games = b.games.map((g) => normalizeGame(g)),
    characters = b.characters.map((c) => normalizeCharacter(c));
  if (games.some((g) => !safeId(g.game_id)))
    throw new Error("공통 게임 식별자가 올바르지 않습니다.");
  if (
    new Set(games.map((g) => g.id)).size !== games.length ||
    new Set(characters.map((c) => c.id)).size !== characters.length ||
    characters.some((c) => !games.some((g) => g.id === c.game_id))
  )
    throw new Error("백업에 중복 식별자 또는 연결되지 않은 캐릭터가 있습니다.");
  return {
    version: 2,
    exportedAt:
      typeof b.exportedAt === "string"
        ? b.exportedAt
        : new Date().toISOString(),
    games,
    characters,
    ...(b.profile ? { profile: normalizeProfile(b.profile, "local") } : {}),
  };
}
/** Merge without overwriting existing records; remap character references by canonical game. */
export function mergeBackup(
  existing: BackupData,
  incoming: BackupData,
  userId: string,
): BackupData {
  const source = validateBackup(incoming),
    games = [...existing.games],
    characters = [...existing.characters];
  const idMap = new Map<string, string>();
  for (const game of source.games) {
    const match = games.find((g) => g.game_id === game.game_id);
    if (match) {
      idMap.set(game.id, match.id);
      continue;
    }
    const id = games.some((g) => g.id === game.id)
      ? crypto.randomUUID()
      : game.id;
    idMap.set(game.id, id);
    games.push({ ...game, id, user_id: userId });
  }
  for (const char of source.characters) {
    const game_id = idMap.get(char.game_id)!;
    if (characters.some((c) => c.game_id === game_id && c.name === char.name))
      continue;
    const id = characters.some((c) => c.id === char.id)
      ? crypto.randomUUID()
      : char.id;
    characters.push({ ...char, id, game_id });
  }
  for (const game of games)
    if (!existing.games.some((g) => g.id === game.id)) {
      game.parties = game.parties.map((p) => ({
        ...p,
        slots: p.slots.map((id) => {
          const sourceChar = source.characters.find((c) => c.id === id);
          return sourceChar
            ? (characters.find(
                (c) => c.game_id === game.id && c.name === sourceChar.name,
              )?.id ?? null)
            : null;
        }),
      }));
    }
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    games,
    characters,
    profile: existing.profile,
  };
}
