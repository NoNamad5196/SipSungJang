import type { Game, Character } from "@/types";
import type { IRepository, CreateGameInput, CreateCharacterInput } from "./repository";

const GAMES_KEY = "sipsungjang_games";
const CHARS_KEY = "sipsungjang_characters";

export class LocalRepository implements IRepository {
  private readGames(): Game[] {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(GAMES_KEY) ?? "[]");
    } catch {
      return [];
    }
  }

  private writeGames(games: Game[]): void {
    localStorage.setItem(GAMES_KEY, JSON.stringify(games));
  }

  private readChars(): Character[] {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(CHARS_KEY) ?? "[]");
    } catch {
      return [];
    }
  }

  private writeChars(chars: Character[]): void {
    localStorage.setItem(CHARS_KEY, JSON.stringify(chars));
  }

  async getGames(): Promise<Game[]> {
    return this.readGames().sort((a, b) => a.display_order - b.display_order);
  }

  async getGame(id: string): Promise<Game | null> {
    return this.readGames().find((g) => g.id === id) ?? null;
  }

  async createGame(data: CreateGameInput): Promise<Game> {
    const games = this.readGames();
    const game: Game = {
      ...data,
      id: crypto.randomUUID(),
      user_id: "local",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      display_order: data.display_order ?? games.length,
    };
    this.writeGames([...games, game]);
    return game;
  }

  async updateGame(
    id: string,
    data: Partial<Omit<Game, "id" | "user_id" | "created_at">>
  ): Promise<Game> {
    const games = this.readGames();
    const idx = games.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error("Game not found");
    games[idx] = { ...games[idx], ...data, updated_at: new Date().toISOString() };
    this.writeGames(games);
    return games[idx];
  }

  async deleteGame(id: string): Promise<void> {
    this.writeGames(this.readGames().filter((g) => g.id !== id));
    this.writeChars(this.readChars().filter((c) => c.game_id !== id));
  }

  async getCharacters(gameId: string): Promise<Character[]> {
    return this.readChars().filter((c) => c.game_id === gameId);
  }

  async addCharacter(data: CreateCharacterInput): Promise<Character> {
    const char: Character = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.writeChars([...this.readChars(), char]);
    return char;
  }

  async deleteCharacter(id: string): Promise<void> {
    this.writeChars(this.readChars().filter((c) => c.id !== id));
  }

  async exportData(): Promise<import("./repository").BackupData> {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      games: this.readGames(),
      characters: this.readChars(),
    };
  }

  async importData(data: import("./repository").BackupData): Promise<void> {
    this.writeGames(data.games ?? []);
    this.writeChars(data.characters ?? []);
  }
}
