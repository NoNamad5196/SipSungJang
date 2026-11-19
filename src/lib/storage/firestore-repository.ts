import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  runTransaction,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { getFirebase } from "../firebase/client";
import {
  normalizeAgentSignal,
  normalizeCharacter,
  normalizeGame,
  normalizeProfile,
} from "../model";
import type {
  AgentSignal,
  Character,
  Game,
  UserProfile,
} from "../../types/index";
import {
  mergeBackup,
  prepareCloudBackup,
  type IRepository,
  type CreateGameInput,
  type CreateCharacterInput,
  type BackupData,
} from "./repository";

export class FirestoreRepository implements IRepository {
  constructor(private uid: string) {}
  private get db() {
    const { auth, db } = getFirebase();
    if (auth.currentUser?.uid !== this.uid)
      throw new Error("로그인 상태가 변경되었습니다. 다시 로그인해 주세요.");
    return db;
  }
  private gamesRef() {
    return collection(this.db, "users", this.uid, "games");
  }
  private charsRef() {
    return collection(this.db, "users", this.uid, "characters");
  }
  private agentSignalsRef() {
    return collection(this.db, "users", this.uid, "agentSignals");
  }
  async getGames() {
    const snap = await getDocs(this.gamesRef());
    return snap.docs
      .filter((d) => !d.data().deleted_at)
      .map((d) => normalizeGame(d.data(), d.id, this.uid))
      .sort((a, b) => a.display_order - b.display_order);
  }
  async getGame(id: string) {
    const d = await getDoc(doc(this.gamesRef(), id));
    return d.exists() && !d.data().deleted_at
      ? normalizeGame(d.data(), d.id, this.uid)
      : null;
  }
  async createGame(data: CreateGameInput) {
    const games = await this.getGames();
    if (games.some((g) => g.game_id === data.game_id))
      throw new Error("이미 수첩에 등록한 게임입니다.");
    // Deterministic ID serializes concurrent registration of the same catalog game.
    const ref = doc(this.gamesRef(), data.game_id);
    const game = normalizeGame(
      {
        ...data,
        display_order: Math.max(-1, ...games.map((g) => g.display_order)) + 1,
      },
      ref.id,
      this.uid,
    );
    return runTransaction(this.db, async (tx) => {
      const old = await tx.get(ref);
      if (old.exists() && !old.data().deleted_at)
        throw new Error("이미 등록한 게임입니다.");
      if (old.exists()) {
        const restored = normalizeGame(
          {
            ...old.data(),
            intensity: game.intensity,
            display_order: game.display_order,
          },
          ref.id,
          this.uid,
        );
        tx.set(ref, { ...restored, deleted_at: null }, { merge: true });
        return restored;
      }
      tx.set(ref, game);
      return game;
    });
  }
  async updateGame(id: string, data: Partial<Game>): Promise<Game> {
    const ref = doc(this.gamesRef(), id);
    return runTransaction(this.db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists() || snap.data().deleted_at)
        throw new Error("게임을 찾을 수 없습니다.");
      const old = normalizeGame(snap.data(), id, this.uid);
      const game = normalizeGame(
        {
          ...old,
          ...data,
          game_id: old.game_id,
          created_at: old.created_at,
          updated_at: new Date().toISOString(),
        },
        id,
        this.uid,
      );
      tx.set(ref, game, { merge: true });
      return game;
    });
  }
  async deleteGame(id: string) {
    // Soft delete keeps production data recoverable, and hides linked characters in reads.
    const ref = doc(this.gamesRef(), id);
    await setDoc(
      ref,
      { deleted_at: new Date().toISOString() },
      { merge: true },
    );
  }
  async reorderGames(ids: string[]) {
    if (new Set(ids).size !== ids.length || ids.length > 450)
      throw new Error("정렬할 게임 목록을 확인해 주세요.");
    const batch = writeBatch(this.db);
    ids.forEach((id, i) =>
      batch.update(doc(this.gamesRef(), id), { display_order: i }),
    );
    await batch.commit();
  }
  async getCharacters(gameId?: string) {
    const [snap, games] = await Promise.all([
      getDocs(
        gameId
          ? query(this.charsRef(), where("game_id", "==", gameId))
          : this.charsRef(),
      ),
      this.getGames(),
    ]);
    return snap.docs
      .filter(
        (d) =>
          !d.data().deleted_at && games.some((g) => g.id === d.data().game_id),
      )
      .map((d) => normalizeCharacter(d.data(), d.id));
  }
  async addCharacter(data: CreateCharacterInput) {
    if (!(await this.getGame(data.game_id)))
      throw new Error("먼저 게임을 등록해 주세요.");
    const ref = doc(this.charsRef()),
      char = normalizeCharacter(data, ref.id);
    await setDoc(ref, char);
    return char;
  }
  async updateCharacter(id: string, data: Partial<Character>) {
    const ref = doc(this.charsRef(), id);
    return runTransaction(this.db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists() || snap.data().deleted_at)
        throw new Error("캐릭터를 찾을 수 없습니다.");
      const old = normalizeCharacter(snap.data(), id);
      const char = normalizeCharacter(
        { ...old, ...data, game_id: old.game_id },
        id,
      );
      tx.set(ref, char, { merge: true });
      return char;
    });
  }
  async deleteCharacter(id: string) {
    const games = await this.getGames(),
      batch = writeBatch(this.db);
    batch.set(
      doc(this.charsRef(), id),
      { deleted_at: new Date().toISOString() },
      { merge: true },
    );
    for (const game of games.filter((g) =>
      g.parties.some((p) => p.slots.includes(id)),
    )) {
      batch.update(doc(this.gamesRef(), game.id), {
        parties: game.parties.map((p) => ({
          ...p,
          slots: p.slots.map((s) => (s === id ? null : s)),
        })),
      });
    }
    await batch.commit();
  }
  async getProfile() {
    const d = await getDoc(doc(this.db, "users", this.uid));
    return normalizeProfile(d.data()?.profile, this.uid);
  }
  async saveProfile(profile: UserProfile) {
    await setDoc(
      doc(this.db, "users", this.uid),
      { profile: normalizeProfile(profile, this.uid) },
      { merge: true },
    );
  }
  async listAgentSignals(max = 10): Promise<AgentSignal[]> {
    const safeLimit = Math.min(50, Math.max(1, Math.trunc(max)));
    const snap = await getDocs(
      query(
        this.agentSignalsRef(),
        orderBy("received_at", "desc"),
        limit(safeLimit),
      ),
    );
    const now = new Date();
    return snap.docs
      .map((d) => normalizeAgentSignal(d.data(), d.id, now))
      .filter((s): s is AgentSignal => s !== null);
  }
  async exportData(): Promise<BackupData> {
    const [games, characters, profile] = await Promise.all([
      this.getGames(),
      this.getCharacters(),
      this.getProfile(),
    ]);
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      games,
      characters,
      profile,
    };
  }
  async importData(data: BackupData) {
    const canonical = prepareCloudBackup(data, this.uid);
    const existing = await this.exportData(),
      merged = mergeBackup(existing, canonical, this.uid);
    const games = merged.games.filter(
      (g) => !existing.games.some((e) => e.id === g.id),
    );
    const chars = merged.characters.filter(
      (c) => !existing.characters.some((e) => e.id === c.id),
    );
    if (games.length + chars.length > 450)
      throw new Error(
        "한 번에 450개까지 복원할 수 있습니다. 백업 파일을 나누어 주세요.",
      );
    // Only additions. Transaction fails rather than overwriting a concurrently created record.
    await runTransaction(this.db, async (tx) => {
      const entries = [
        ...games.map((g) => ({ ref: doc(this.gamesRef(), g.id), data: g })),
        ...chars.map((c) => ({ ref: doc(this.charsRef(), c.id), data: c })),
      ];
      const checks = await Promise.all(entries.map((e) => tx.get(e.ref)));
      if (checks.some((d) => d.exists()))
        throw new Error(
          "같은 식별자의 기록이 있습니다. 새로고침 후 백업을 다시 확인해 주세요.",
        );
      entries.forEach((e) => tx.set(e.ref, e.data));
    });
  }
}
