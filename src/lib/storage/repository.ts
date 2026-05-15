import type { Game, Character } from "@/types";

export type CreateGameInput = Omit<Game, "id" | "user_id" | "created_at" | "updated_at">;
export type CreateCharacterInput = Omit<Character, "id" | "created_at">;

export interface IRepository {
  getGames(): Promise<Game[]>;
  getGame(id: string): Promise<Game | null>;
  createGame(data: CreateGameInput): Promise<Game>;
  updateGame(id: string, data: Partial<Omit<Game, "id" | "user_id" | "created_at">>): Promise<Game>;
  deleteGame(id: string): Promise<void>;

  getCharacters(gameId: string): Promise<Character[]>;
  addCharacter(data: CreateCharacterInput): Promise<Character>;
  deleteCharacter(id: string): Promise<void>;
}
