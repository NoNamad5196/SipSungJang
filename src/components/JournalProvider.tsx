"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AgentSignal,
  Character,
  Game,
  Quest,
  UserProfile,
} from "@/types";
import { useSession } from "./AuthProvider";
import { defaultProfile } from "@/lib/model";

export type Editor =
  | { kind: "game"; game?: Game }
  | { kind: "quest"; game: Game; quest?: Quest }
  | { kind: "character"; character?: Character; gameId?: string }
  | { kind: "delete-game"; game: Game }
  | { kind: "delete-character"; character: Character }
  | null;
interface JournalState {
  games: Game[];
  characters: Character[];
  profile: UserProfile;
  agentSignals: AgentSignal[];
  loading: boolean;
  busy: boolean;
  error: string;
  notice: string;
  editor: Editor;
  setEditor: (e: Editor) => void;
  reload: () => Promise<void>;
  run: (action: () => Promise<unknown>, message?: string) => Promise<boolean>;
}
const JournalContext = createContext<JournalState | null>(null);
export function useJournal() {
  const state = useContext(JournalContext);
  if (!state) throw new Error("수첩이 준비되지 않았습니다.");
  return state;
}
export function JournalProvider({ children }: { children: ReactNode }) {
  const { repository } = useSession();
  const [games, setGames] = useState<Game[]>([]),
    [characters, setCharacters] = useState<Character[]>([]),
    [profile, setProfile] = useState(defaultProfile()),
    [agentSignals, setAgentSignals] = useState<AgentSignal[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [editor, setEditor] = useState<Editor>(null);
  const lock = useRef(false),
    generation = useRef(0);
  const fetchRecords = useCallback(async () => {
    const current = ++generation.current;
    try {
      const [g, c, p, signals] = await Promise.all([
        repository.getGames(),
        repository.getCharacters(),
        repository.getProfile(),
        repository.listAgentSignals(10).catch(() => [] as AgentSignal[]),
      ]);
      if (generation.current !== current) return;
      setGames(g);
      setCharacters(c);
      setProfile(p);
      setAgentSignals(signals);
      setError("");
    } finally {
      if (generation.current === current) setLoading(false);
    }
  }, [repository]);
  const reload = useCallback(async () => {
    try {
      await fetchRecords();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "기록을 불러오지 못했습니다. 연결 상태를 확인해 주세요.",
      );
    }
  }, [fetchRecords]);
  useEffect(() => {
    void Promise.resolve().then(reload);
    const refresh = () => {
      if (!lock.current) void reload();
    };
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
    };
  }, [reload]);
  async function run(
    action: () => Promise<unknown>,
    message = "기록을 저장했어요.",
  ) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await fetchRecords();
      setNotice(message);
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "저장하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.",
      );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <JournalContext.Provider
      value={{
        games,
        characters,
        profile,
        agentSignals,
        loading,
        busy,
        error,
        notice,
        editor,
        setEditor,
        reload,
        run,
      }}
    >
      {children}
    </JournalContext.Provider>
  );
}
