import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  writeBatch,
  DocumentSnapshot,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { Game, Character } from "@/types";
import type { IRepository, CreateGameInput, CreateCharacterInput, BackupData } from "./repository";

export class FirestoreRepository implements IRepository {
  private get userId(): string {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");
    return user.uid;
  }

  private gamesRef() {
    return collection(db, "users", this.userId, "games");
  }

  private charsRef() {
    return collection(db, "users", this.userId, "characters");
  }

  private docToGame(d: DocumentSnapshot): Game {
    const data = d.data()!;
    return {
      id: d.id,
      user_id: this.userId,
      name: data.name,
      icon: data.icon ?? null,
      intensity: data.intensity,
      current_goal: data.current_goal ?? null,
      weekly_tasks: data.weekly_tasks ?? [],
      weekly_tasks_done: data.weekly_tasks_done ?? [],
      next_goal: data.next_goal ?? null,
      urgency: data.urgency ?? "medium",
      last_access: data.last_access ?? null,
      party_memo: data.party_memo ?? null,
      memo: data.memo ?? null,
      display_order: data.display_order ?? 0,
      created_at: data.created_at ?? new Date().toISOString(),
      updated_at: data.updated_at ?? new Date().toISOString(),
    };
  }

  private docToChar(d: DocumentSnapshot): Character {
    const data = d.data()!;
    return {
      id: d.id,
      game_id: data.game_id,
      name: data.name,
      priority_rank: data.priority_rank,
      notes: data.notes ?? null,
      created_at: data.created_at ?? new Date().toISOString(),
    };
  }

  async getGames(): Promise<Game[]> {
    const snap = await getDocs(query(this.gamesRef(), orderBy("display_order")));
    return snap.docs.map((d) => this.docToGame(d));
  }

  async getGame(id: string): Promise<Game | null> {
    const snap = await getDoc(doc(this.gamesRef(), id));
    if (!snap.exists()) return null;
    return this.docToGame(snap);
  }

  async createGame(data: CreateGameInput): Promise<Game> {
    const now = new Date().toISOString();
    const games = await this.getGames();
    const payload = {
      ...data,
      user_id: this.userId,
      display_order: data.display_order ?? games.length,
      created_at: now,
      updated_at: now,
    };
    const ref = await addDoc(this.gamesRef(), payload);
    return { id: ref.id, ...payload } as Game;
  }

  async updateGame(
    id: string,
    data: Partial<Omit<Game, "id" | "user_id" | "created_at">>
  ): Promise<Game> {
    const ref = doc(this.gamesRef(), id);
    await updateDoc(ref, { ...data, updated_at: new Date().toISOString() });
    const snap = await getDoc(ref);
    return this.docToGame(snap);
  }

  async deleteGame(id: string): Promise<void> {
    await deleteDoc(doc(this.gamesRef(), id));
    // delete associated characters
    const chars = await getDocs(
      query(this.charsRef(), where("game_id", "==", id))
    );
    const batch = writeBatch(db);
    chars.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  async getCharacters(gameId: string): Promise<Character[]> {
    const snap = await getDocs(
      query(this.charsRef(), where("game_id", "==", gameId))
    );
    return snap.docs.map((d) => this.docToChar(d));
  }

  async addCharacter(data: CreateCharacterInput): Promise<Character> {
    const now = new Date().toISOString();
    const payload = { ...data, created_at: now };
    const ref = await addDoc(this.charsRef(), payload);
    return { id: ref.id, ...payload };
  }

  async deleteCharacter(id: string): Promise<void> {
    await deleteDoc(doc(this.charsRef(), id));
  }

  async exportData(): Promise<BackupData> {
    const [games, charsSnap] = await Promise.all([
      this.getGames(),
      getDocs(this.charsRef()),
    ]);
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      games,
      characters: charsSnap.docs.map((d) => this.docToChar(d)),
    };
  }

  async importData(data: BackupData): Promise<void> {
    // delete existing
    const [existingGames, existingChars] = await Promise.all([
      getDocs(this.gamesRef()),
      getDocs(this.charsRef()),
    ]);
    const batch = writeBatch(db);
    existingGames.docs.forEach((d) => batch.delete(d.ref));
    existingChars.docs.forEach((d) => batch.delete(d.ref));

    // write new (Firestore batch limit is 500)
    const allDocs = [
      ...(data.games ?? []).map((g) => ({ ref: doc(this.gamesRef(), g.id), data: g })),
      ...(data.characters ?? []).map((c) => ({ ref: doc(this.charsRef(), c.id), data: c })),
    ];
    for (let i = 0; i < allDocs.length; i++) {
      batch.set(allDocs[i].ref, allDocs[i].data);
    }
    await batch.commit();
  }
}
