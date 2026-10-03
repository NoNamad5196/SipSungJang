"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from "firebase/auth";
import { firebaseConfigured, getFirebase } from "@/lib/firebase/client";
import { LocalRepository } from "@/lib/storage/local";
import { FirestoreRepository } from "@/lib/storage/firestore-repository";
import type { IRepository } from "@/lib/storage/repository";
import { demoData } from "@/lib/demo";
import { Loading } from "./ui";

type Mode = "local" | "cloud" | "demo";
interface Session {
  repository: IRepository;
  mode: Mode;
  userId: string;
  userName: string;
  leave: () => Promise<void>;
}
const SessionContext = createContext<Session | null>(null);
export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("수첩을 먼저 열어 주세요.");
  return session;
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    async function leave() {
      if (firebaseConfigured && getFirebase().auth.currentUser)
        await signOut(getFirebase().auth);
      localStorage.removeItem("sipsungjang_mode");
      setSession(null);
    }
    async function init() {
      try {
        const mode = localStorage.getItem("sipsungjang_mode");
        if (mode === "local" || mode === "demo") {
          setSession({
            repository: new LocalRepository(
              mode === "demo" ? "sipsungjang_demo_v2" : undefined,
            ),
            mode,
            userId: mode,
            userName: "모험가",
            leave,
          });
          setReady(true);
          return;
        }
        if (!firebaseConfigured) {
          setReady(true);
          return;
        }
        const { auth } = getFirebase();
        await getRedirectResult(auth);
        if (!active) return;
        unsubscribe = onAuthStateChanged(
          auth,
          (user) => {
            if (!active) return;
            setSession(
              user
                ? {
                    repository: new FirestoreRepository(user.uid),
                    mode: "cloud",
                    userId: user.uid,
                    userName: user.displayName ?? "모험가",
                    leave,
                  }
                : null,
            );
            setReady(true);
          },
          () => {
            setError(
              "로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
            );
            setReady(true);
          },
        );
      } catch {
        if (active) {
          setError(
            "로그인을 연결하지 못했습니다. 기기 수첩을 이용하거나 다시 로그인해 주세요.",
          );
          setReady(true);
        }
      }
    }
    void init();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);
  async function start(mode: "local" | "demo") {
    setBusy(true);
    setError("");
    try {
      const repository = new LocalRepository(
        mode === "demo" ? "sipsungjang_demo_v2" : undefined,
      );
      if (mode === "demo" && !(await repository.getGames()).length)
        await repository.importData(demoData());
      localStorage.setItem("sipsungjang_mode", mode);
      setSession({
        repository,
        mode,
        userId: mode,
        userName: "모험가",
        leave: async () => {
          localStorage.removeItem("sipsungjang_mode");
          setSession(null);
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "수첩을 열 수 없습니다.");
    } finally {
      setBusy(false);
    }
  }
  async function login() {
    setBusy(true);
    setError("");
    try {
      const { auth } = getFirebase();
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      localStorage.removeItem("sipsungjang_mode");
      setSession({
        repository: new FirestoreRepository(result.user.uid),
        mode: "cloud",
        userId: result.user.uid,
        userName: result.user.displayName ?? "모험가",
        leave: async () => {
          await signOut(auth);
          setSession(null);
        },
      });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "auth/popup-blocked") {
        try {
          await signInWithRedirect(
            getFirebase().auth,
            new GoogleAuthProvider(),
          );
        } catch {
          setError(
            "Google 로그인 페이지를 열지 못했습니다. 다시 시도해 주세요.",
          );
        }
      } else
        setError(
          code === "auth/popup-closed-by-user"
            ? "로그인이 취소됐습니다. 원할 때 다시 시작해 주세요."
            : "Google 로그인에 실패했습니다. 연결 상태와 로그인 도메인을 확인해 주세요.",
        );
    } finally {
      setBusy(false);
    }
  }
  if (!ready)
    return (
      <div className="welcome">
        <Loading />
      </div>
    );
  if (session)
    return (
      <SessionContext.Provider value={session}>
        {children}
      </SessionContext.Provider>
    );
  return (
    <main className="welcome">
      <div className="welcome-card panel">
        <span className="welcome-emblem">✦</span>
        <p className="brand-word">SipSungJang</p>
        <h1>
          당신의 모험을
          <br />한 권의 수첩에.
        </h1>
        <p className="welcome-copy">
          이번 주에 어떤 게임을 얼마나 챙겨야 하지?
          <br />
          퀘스트부터 캐릭터 육성까지, 나만의 여정을 기록하세요.
        </p>
        <div className="stack">
          <button
            className="button primary"
            disabled={busy || !firebaseConfigured}
            onClick={login}
          >
            Google로 모험 이어가기
          </button>
          <button
            className="button"
            disabled={busy}
            onClick={() => start("local")}
          >
            이 기기에서 새 수첩 열기
          </button>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => start("demo")}
          >
            예시 수첩 둘러보기 →
          </button>
        </div>
        <p className="hint">
          기기 수첩은 이 브라우저에 저장돼요.
          <br />
          예시 수첩은 내 기록과 별도로 보관됩니다.
        </p>
        {error && (
          <p role="alert" className="error-notice">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
