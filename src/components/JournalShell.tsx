"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "./AuthProvider";
import { JournalProvider, useJournal } from "./JournalProvider";
import { Editors } from "./Editors";
import { Progress, Loading } from "./ui";
import { percent, resetLabel, nextReset } from "@/lib/model";
import { AppLauncher } from "./Settings";
import { AgentSignalBar } from "./AgentSignalBar";

const NAV = [
  ["/dashboard", "◆", "오늘의 여정"],
  ["/weekly", "◈", "주간 로드맵"],
  ["/characters", "✦", "캐릭터 육성"],
  ["/party", "⊞", "파티 편성"],
  ["/settings", "⚙", "설정"],
];
function Shell({ children }: { children: ReactNode }) {
  const path = usePathname(),
    { mode } = useSession(),
    { games, profile, loading, busy, error, notice, reload } = useJournal();
  const [now, setNow] = useState<Date | null>(null),
    [launcher, setLauncher] = useState(false);
  const launcherRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const initial = setTimeout(tick, 0);
    const timer = setInterval(tick, 60000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!launcher) return;
    const onPointerDown = (e: PointerEvent) => {
      if (
        launcherRef.current &&
        e.target instanceof Node &&
        !launcherRef.current.contains(e.target)
      ) {
        setLauncher(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLauncher(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [launcher]);
  const tasks = games.flatMap((g) => g.quests),
    done = tasks.filter((t) => t.done).length;
  const daily = tasks.filter((t) => t.type === "daily" && !t.done).length;
  const weeklySoon =
    now &&
    profile.reminders.weekly &&
    nextReset(profile, now).getTime() - now.getTime() <= 3600000;
  const current = NAV.find((n) => n[0] === path) ?? NAV[0];
  return (
    <div className="journal-shell">
      <a href="#journal-main" className="skip-link">
        본문으로 건너뛰기
      </a>
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">
          <span className="brand-mark">✦</span>
          <div>
            <strong>SipSungJang</strong>
            <small>나의 모험 수첩</small>
          </div>
        </Link>
        <nav aria-label="주 메뉴">
          {NAV.map(([href, icon, label]) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${current[0] === href ? "active" : ""}`}
              aria-current={current[0] === href ? "page" : undefined}
            >
              <span aria-hidden="true">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom" ref={launcherRef}>
          <button
            type="button"
            className="launcher-button"
            onClick={() => setLauncher((v) => !v)}
            aria-expanded={launcher}
            aria-label="연결된 OtakuS 서비스"
          >
            ⊞ 연결된 서비스 <span>{launcher ? "⌄" : "⌃"}</span>
          </button>
          {launcher && (
            <>
              <div
                className="launcher-scrim"
                aria-hidden="true"
                onClick={() => setLauncher(false)}
              />
              <AppLauncher compact onNavigate={() => setLauncher(false)} />
            </>
          )}
          <div className="mini-progress">
            <div>
              <span>이번 주 진행</span>
              <strong>
                {done}/{tasks.length}
              </strong>
            </div>
            <Progress value={done} max={tasks.length} />
            <div>
              <span>
                {now ? resetLabel(profile, now) + " 후" : "기록을 불러오는 중"}
              </span>
              <span>{percent(done, tasks.length)}%</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <h1>
            <span aria-hidden="true">◆</span>
            {path.startsWith("/games/") ? "게임 모험 기록" : current[2]}
          </h1>
          <div className="topbar-meta">
            <span className="today-date">
              {now?.toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                weekday: "short",
                timeZone: "Asia/Seoul",
              })}
            </span>
            <span className="reset-count">
              주간 갱신까지{" "}
              <strong>{now ? resetLabel(profile, now) : "…"}</strong>
            </span>
            <span className="mode-badge">
              {mode === "cloud"
                ? "계정 수첩"
                : mode === "demo"
                  ? "예시 수첩"
                  : "기기 수첩"}
            </span>
          </div>
        </header>
        <div className="status-line" role="status" aria-live="polite">
          <span>
            {busy
              ? "기록을 저장하는 중…"
              : notice ||
                `${profile.display_name}님, 오늘도 나만의 속도로 모험하세요.`}
          </span>
          <span>
            {games.filter((g) => g.intensity === "main").length}개 메인 게임
            관리 중
          </span>
        </div>
        <main id="journal-main" className="screen-content">
          {error && (
            <div className="error-notice" role="alert">
              <p>{error}</p>
              <button
                className="button"
                disabled={busy}
                onClick={() => void reload()}
              >
                다시 불러오기
              </button>
              <Link className="button" href="/settings">
                백업 / 복구
              </Link>
            </div>
          )}
          {!loading &&
            (weeklySoon || (profile.reminders.daily && daily > 0)) && (
              <div className="reminder-notice" role="status">
                {weeklySoon && (
                  <p>
                    ◈ 주간 갱신까지 1시간이 남지 않았어요. 이번 주 기록을 확인해
                    보세요.
                  </p>
                )}
                {profile.reminders.daily && daily > 0 && (
                  <p>◇ 아직 끝내지 않은 일일 퀘스트가 {daily}개 있어요.</p>
                )}
              </div>
            )}
          {!loading && <AgentSignalBar now={now} />}
          {loading ? <Loading /> : children}
        </main>
        <Editors />
      </div>
    </div>
  );
}
export function JournalShell({ children }: { children: ReactNode }) {
  const { mode, userId } = useSession();
  return (
    <JournalProvider key={`${mode}:${userId}`}>
      <Shell>{children}</Shell>
    </JournalProvider>
  );
}
