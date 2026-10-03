import type { Game, Character, UserProfile } from "../../types/index";
import {
  normalizeGame,
  normalizeCharacter,
  normalizeProfile,
  defaultProfile,
} from "../model";
import {
  mergeBackup,
  validateBackup,
  type IRepository,
  type CreateGameInput,
  type CreateCharacterInput,
  type BackupData,
} from "./repository";

export class LocalRepository implements IRepository {
  constructor(private key = "sipsungjang_v2") {}
  private read(): BackupData {
    const raw = localStorage.getItem(this.key);
    try {
      if (raw) return validateBackup(JSON.parse(raw));
      const games =
        this.key === "sipsungjang_v2"
          ? JSON.parse(localStorage.getItem("sipsungjang_games") ?? "[]")
          : [];
      const characters =
        this.key === "sipsungjang_v2"
          ? JSON.parse(localStorage.getItem("sipsungjang_characters") ?? "[]")
          : [];
      return validateBackup({
        version: 1,
        exportedAt: new Date().toISOString(),
        games,
        characters,
        profile: defaultProfile(),
      });
    } catch {
      throw new Error(
        "저장된 수첩을 읽을 수 없습니다. 원본은 보존되어 있습니다. 설정에서 원본 파일을 내려받아 복구해 주세요.",
      );
    }
  }
  private write(data: BackupData) {
    const raw = JSON.stringify(data);
    try {
      const previous = localStorage.getItem(this.key);
      if (previous) localStorage.setItem(this.key + "_recovery", previous);
      localStorage.setItem(this.key, raw);
    } catch {
      throw new Error(
        "기기에 저장하지 못했습니다. 저장 공간과 브라우저의 저장 권한을 확인한 뒤 다시 시도해 주세요.",
      );
    }
  }
  async getGames() {
    return this.read().games.sort((a, b) => a.display_order - b.display_order);
  }
  async getGame(id: string) {
    return this.read().games.find((g) => g.id === id) ?? null;
  }
  async createGame(data: CreateGameInput): Promise<Game> {
    const state = this.read();
    if (state.games.some((g) => g.game_id === data.game_id))
      throw new Error("이미 수첩에 등록한 게임입니다.");
    const game = normalizeGame({
      ...data,
      id: crypto.randomUUID(),
      display_order:
        Math.max(-1, ...state.games.map((g) => g.display_order)) + 1,
    });
    this.write({ ...state, games: [...state.games, game] });
    return game;
  }
  async updateGame(id: string, data: Partial<Game>): Promise<Game> {
    const state = this.read(),
      old = state.games.find((g) => g.id === id);
    if (!old) throw new Error("게임을 찾을 수 없습니다.");
    const game = normalizeGame({
      ...old,
      ...data,
      id,
      game_id: old.game_id,
      user_id: old.user_id,
      created_at: old.created_at,
      updated_at: new Date().toISOString(),
    });
    if (state.games.some((g) => g.id !== id && g.game_id === game.game_id))
      throw new Error("이미 등록한 게임과 중복됩니다.");
    this.write({
      ...state,
      games: state.games.map((g) => (g.id === id ? game : g)),
    });
    return game;
  }
  async deleteGame(id: string) {
    const state = this.read();
    this.write({
      ...state,
      games: state.games.filter((g) => g.id !== id),
      characters: state.characters.filter((c) => c.game_id !== id),
    });
  }
  async reorderGames(ids: string[]) {
    const state = this.read();
    if (
      new Set(ids).size !== ids.length ||
      ids.length !== state.games.length ||
      state.games.some((g) => !ids.includes(g.id))
    )
      throw new Error(
        "게임 목록이 변경됐습니다. 새로고침 후 다시 정렬해 주세요.",
      );
    this.write({
      ...state,
      games: state.games.map((g) => ({
        ...g,
        display_order: ids.indexOf(g.id),
      })),
    });
  }
  async getCharacters(gameId?: string) {
    return this.read().characters.filter(
      (c) => !gameId || c.game_id === gameId,
    );
  }
  async addCharacter(data: CreateCharacterInput): Promise<Character> {
    const state = this.read();
    if (!state.games.some((g) => g.id === data.game_id))
      throw new Error("먼저 게임을 등록해 주세요.");
    const char = normalizeCharacter({ ...data, id: crypto.randomUUID() });
    this.write({ ...state, characters: [...state.characters, char] });
    return char;
  }
  async updateCharacter(
    id: string,
    data: Partial<Character>,
  ): Promise<Character> {
    const state = this.read(),
      old = state.characters.find((c) => c.id === id);
    if (!old) throw new Error("캐릭터를 찾을 수 없습니다.");
    const char = normalizeCharacter({
      ...old,
      ...data,
      id,
      game_id: old.game_id,
    });
    this.write({
      ...state,
      characters: state.characters.map((c) => (c.id === id ? char : c)),
    });
    return char;
  }
  async deleteCharacter(id: string) {
    const state = this.read();
    this.write({
      ...state,
      characters: state.characters.filter((c) => c.id !== id),
      games: state.games.map((g) => ({
        ...g,
        parties: g.parties.map((p) => ({
          ...p,
          slots: p.slots.map((s) => (s === id ? null : s)),
        })),
      })),
    });
  }
  async getProfile() {
    return normalizeProfile(this.read().profile, "local");
  }
  async saveProfile(profile: UserProfile) {
    this.write({ ...this.read(), profile: normalizeProfile(profile, "local") });
  }
  async exportData() {
    return { ...this.read(), version: 2, exportedAt: new Date().toISOString() };
  }
  async importData(data: BackupData) {
    this.write(mergeBackup(this.read(), data, "local"));
  }
}
