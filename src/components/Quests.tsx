"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Game, Quest } from "@/types";
import { gameColor } from "@/lib/catalog";
import {
  deadlineLabel,
  koreaDate,
  percent,
  relativeDate,
  INTENSITIES,
} from "@/lib/model";
import { useSession } from "./AuthProvider";
import { useJournal } from "./JournalProvider";
import {
  Panel,
  SectionHeader,
  Progress,
  Ring,
  Badge,
  Empty,
  STATUS_LABELS,
} from "./ui";
import { CharactersScreen } from "./Characters";
import { PartyScreen } from "./Party";

export function QuestRow({
  game,
  quest,
  compact = false,
}: {
  game: Game;
  quest: Quest;
  compact?: boolean;
}) {
  const { repository } = useSession(),
    { run, busy, setEditor } = useJournal();
  async function toggle() {
    await run(
      async () => {
        const fresh = await repository.getGame(game.id);
        if (!fresh) throw new Error("게임을 찾을 수 없습니다.");
        await repository.updateGame(game.id, {
          quests: fresh.quests.map((t) =>
            t.id !== quest.id
              ? t
              : { ...t, done: !t.done, current: t.done ? 0 : t.total },
          ),
        });
      },
      quest.done
        ? "퀘스트 완료를 취소했어요."
        : "퀘스트를 완료했어요. 좋은 여정이었네요!",
    );
  }
  return (
    <div
      className={`quest-row ${quest.done ? "is-done" : ""} ${compact ? "compact" : ""}`}
    >
      <input
        type="checkbox"
        className="quest-checkbox"
        checked={quest.done}
        disabled={busy}
        onChange={toggle}
        aria-label={`${quest.label} 완료`}
      />
      <div className="quest-body">
        <div className="quest-title">
          <span>{quest.label}</span>
          <span className={`task-badge task-${quest.type}`}>
            {{ daily: "일일", weekly: "주간", event: "이벤트" }[quest.type]}
          </span>
          {quest.deadline && !quest.done && (
            <span className="deadline-badge">
              ϟ {deadlineLabel(quest.deadline)}
            </span>
          )}
        </div>
        <div className="quest-progress">
          <Progress
            value={quest.current}
            max={quest.total}
            color={quest.done ? "#62c48a" : undefined}
            label={`${quest.label} 진행도`}
          />
          <span>
            {quest.current}/{quest.total}
          </span>
        </div>
      </div>
      <button
        className="icon-button"
        disabled={busy}
        aria-label={`${quest.label} 수정`}
        onClick={() => setEditor({ kind: "quest", game, quest })}
      >
        ⋯
      </button>
    </div>
  );
}
const DETAIL_TABS = ["weekly", "characters", "party", "memo"] as const;
type DetailTab = (typeof DETAIL_TABS)[number];
function isDetailTab(value: string | null): value is DetailTab {
  return DETAIL_TABS.includes(value as DetailTab);
}
export function GameQuestPanel({
  game,
  detail = false,
}: {
  game: Game;
  detail?: boolean;
}) {
  const { setEditor, run, busy } = useJournal(),
    { repository } = useSession();
  const done = game.quests.filter((t) => t.done).length,
    color = gameColor(game);
  const [tab, setTab] = useState<DetailTab>("weekly");
  useEffect(() => {
    if (!detail) return;
    let active = true;
    const syncFromLocation = () => {
      if (!active) return;
      const queryTab = new URLSearchParams(window.location.search).get("tab");
      const hashTab = window.location.hash.replace(/^#/, "");
      const next = isDetailTab(queryTab)
        ? queryTab
        : isDetailTab(hashTab)
          ? hashTab
          : "weekly";
      setTab(next);
    };
    const timer = setTimeout(syncFromLocation, 0);
    window.addEventListener("popstate", syncFromLocation);
    window.addEventListener("hashchange", syncFromLocation);
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener("popstate", syncFromLocation);
      window.removeEventListener("hashchange", syncFromLocation);
    };
  }, [detail]);
  function selectTab(next: DetailTab) {
    setTab(next);
    if (!detail || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (next === "weekly") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", next);
    }
    url.hash = "";
    window.history.replaceState(null, "", url.pathname + url.search);
  }
  async function resetWeekly() {
    await run(async () => {
      const fresh = await repository.getGame(game.id);
      if (fresh)
        await repository.updateGame(game.id, {
          quests: fresh.quests.map((q) =>
            q.type === "event" ? q : { ...q, done: false, current: 0 },
          ),
        });
    }, "일일·주간 퀘스트를 새로 시작했어요.");
  }
  return (
    <Panel className="quest-panel">
      <div className="game-header">
        <div>
          <div className="game-heading">
            <span className="gold">◆</span>
            <h2>
              {game.icon && <span>{game.icon} </span>}
              {game.name}
            </h2>
            <Badge status={game.intensity} />
          </div>
          <button
            className="next-goal"
            onClick={() => setEditor({ kind: "game", game })}
          >
            <span>◇ 다음 목표</span>
            <em>{game.next_goal || "다음 목적지를 정해 보세요"}</em>
          </button>
        </div>
        <div className="game-stats">
          <div>
            <small>이번 주 진행률</small>
            <div>
              <Progress value={done} max={game.quests.length} color={color} />
              <strong style={{ color }}>
                {percent(done, game.quests.length)}%
              </strong>
            </div>
          </div>
          <div>
            <small>예상 플레이</small>
            <strong className="gold">~{game.estimated_minutes}분</strong>
          </div>
        </div>
      </div>
      <div className="game-toolbar">
        <button
          className="text-button"
          onClick={() => setEditor({ kind: "game", game })}
        >
          기록 수정
        </button>
        <button
          className="text-button"
          disabled={busy}
          onClick={() =>
            run(
              () =>
                repository.updateGame(game.id, { last_access: koreaDate() }),
              "오늘 접속을 기록했어요.",
            )
          }
        >
          오늘 접속 기록
        </button>
        {!detail && (
          <Link href={`/games/${game.id}`} className="text-button">
            모험 기록 →
          </Link>
        )}
        {detail && (
          <button
            className="text-button danger"
            onClick={() => setEditor({ kind: "delete-game", game })}
          >
            게임 삭제
          </button>
        )}
      </div>
      {detail && (
        <div className="detail-tabs" role="tablist" aria-label="게임 기록">
          {(
            [
              ["weekly", "이번 주"],
              ["characters", "캐릭터"],
              ["party", "파티"],
              ["memo", "메모"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={tab === key ? "selected" : ""}
              onClick={() => selectTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {tab === "weekly" && (
        <>
          <div className="quest-list-heading">
            <span>── 주간 할 일 ──</span>
            <button
              className="text-button"
              onClick={() => setEditor({ kind: "quest", game })}
            >
              ＋ 퀘스트 추가
            </button>
          </div>
          <div className="quest-list">
            {game.quests.length ? (
              game.quests.map((quest) => (
                <QuestRow key={quest.id} game={game} quest={quest} />
              ))
            ) : (
              <Empty
                title="아직 적어 둔 퀘스트가 없어요"
                description="이번 주에 꼭 챙길 일부터 하나씩 적어 보세요."
                action={
                  <button
                    className="button"
                    onClick={() => setEditor({ kind: "quest", game })}
                  >
                    첫 퀘스트 추가
                  </button>
                }
              />
            )}
          </div>
          <footer className="quest-footer">
            <span>
              {done}/{game.quests.length} 완료
            </span>
            <span>최근 접속: {relativeDate(game.last_access)}</span>
          </footer>
          {detail && (
            <div className="panel-pad">
              <button
                className="button"
                disabled={
                  busy ||
                  !game.quests.some((q) => q.type !== "event" && q.current > 0)
                }
                onClick={resetWeekly}
              >
                일일·주간 퀘스트 다시 시작
              </button>
              <p className="hint">
                완료 체크를 새로 시작해요. 이벤트 진행도는 유지됩니다.
              </p>
            </div>
          )}
        </>
      )}
      {tab === "characters" && (
        <div className="panel-pad">
          <CharactersScreen gameId={game.id} />
        </div>
      )}
      {tab === "party" && (
        <div className="panel-pad">
          <PartyScreen gameId={game.id} />
        </div>
      )}
      {tab === "memo" && <MemoEditor key={game.id} game={game} />}
    </Panel>
  );
}
function MemoEditor({ game }: { game: Game }) {
  const { repository } = useSession(),
    { run, busy } = useJournal();
  return (
    <form
      className="panel-pad form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        void run(() =>
          repository.updateGame(game.id, {
            memo: String(data.get("memo") ?? ""),
          }),
        );
      }}
    >
      <label>
        모험 메모
        <textarea
          name="memo"
          rows={12}
          maxLength={20000}
          defaultValue={game.memo ?? ""}
          placeholder="공략 링크, 이벤트 일정, 재화 계획을 자유롭게 기록하세요."
        />
      </label>
      <button className="button primary" disabled={busy}>
        메모 저장
      </button>
    </form>
  );
}
function GamePriority({
  game,
  index,
  selected,
  onSelect,
}: {
  game: Game;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const done = game.quests.filter((t) => t.done).length;
  return (
    <button
      className={`side-game ${selected ? "selected" : ""}`}
      style={{ borderLeftColor: selected ? gameColor(game) : "transparent" }}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="game-rank" style={{ color: gameColor(game) }}>
        {index + 1}
      </span>
      <div>
        <div className="side-game-name">
          <strong>{game.name}</strong>
          <Badge status={game.intensity} />
        </div>
        <Progress
          value={done}
          max={game.quests.length}
          color={gameColor(game)}
        />
        <div className="side-game-meta">
          <span>최근: {relativeDate(game.last_access)}</span>
          <span style={{ color: gameColor(game) }}>
            {done}/{game.quests.length}
          </span>
        </div>
      </div>
    </button>
  );
}
export function Summary({ onSelect }: { onSelect: (id: string) => void }) {
  const { games, profile } = useJournal(),
    tasks = games.flatMap((g) => g.quests),
    done = tasks.filter((t) => t.done).length;
  const urgent = games.flatMap((game) =>
    game.quests
      .filter(
        (t) =>
          !t.done &&
          t.deadline &&
          Date.parse(t.deadline) - Date.parse(koreaDate()) <= 3 * 86400000,
      )
      .map((quest) => ({ game, quest })),
  );
  const active = games.filter(
    (g) => !["frozen", "abandoned"].includes(g.intensity),
  );
  const recommended = [...active]
    .filter((g) => g.quests.some((q) => !q.done))
    .sort((a, b) => {
      const urgency = { high: 0, medium: 1, low: 2 };
      return (
        urgency[a.urgency] - urgency[b.urgency] ||
        INTENSITIES.indexOf(a.intensity) - INTENSITIES.indexOf(b.intensity) ||
        a.display_order - b.display_order
      );
    });
  return (
    <aside className="summary-column">
      <Panel className="panel-pad">
        <SectionHeader>주간 요약</SectionHeader>
        <div className="summary-count">
          <Ring value={percent(done, tasks.length)} />
          <div>
            <small>전체 할 일</small>
            <p>
              <strong>{done}</strong>/{tasks.length}
            </p>
            <small>할 일 완료</small>
          </div>
        </div>
      </Panel>
      {profile.reminders.events && urgent.length > 0 && (
        <Panel className="panel-pad">
          <SectionHeader>마감 임박</SectionHeader>
          <div className="stack">
            {urgent.map(({ game, quest }) => (
              <button
                className="urgent-quest"
                key={`${game.id}-${quest.id}`}
                onClick={() => onSelect(game.id)}
              >
                <span>ϟ</span>
                <div>
                  <strong>{quest.label}</strong>
                  <small>
                    {game.name} · {deadlineLabel(quest.deadline!)}
                  </small>
                </div>
              </button>
            ))}
          </div>
        </Panel>
      )}
      <Panel className="panel-pad recommendation">
        <SectionHeader>추천 플레이 순서</SectionHeader>
        {recommended.length ? (
          recommended.map((g, i) => (
            <button
              className="recommendation-row"
              key={g.id}
              onClick={() => onSelect(g.id)}
            >
              <span style={{ color: gameColor(g) }}>{i + 1}</span>
              <div>
                <strong>{g.name}</strong>
                <Progress
                  value={g.quests.filter((t) => t.done).length}
                  max={g.quests.length}
                  color={gameColor(g)}
                />
              </div>
              <small>~{g.estimated_minutes}분</small>
            </button>
          ))
        ) : (
          <p className="hint">
            급한 여정은 모두 마쳤어요.
            <br />
            편안히 쉬어도 괜찮아요.
          </p>
        )}
        <div className="status-counts">
          <small>상태별 게임</small>
          {INTENSITIES.map((s) => (
            <div key={s}>
              <span className={`status-text-${s}`}>◆ {STATUS_LABELS[s]}</span>
              <span>{games.filter((g) => g.intensity === s).length}개</span>
            </div>
          ))}
        </div>
      </Panel>
    </aside>
  );
}
export function TodayScreen({ gameId }: { gameId?: string }) {
  const router = useRouter();
  const { games, setEditor, busy, run } = useJournal(),
    { repository } = useSession();
  const [selected, setSelected] = useState(""),
    [reorder, setReorder] = useState(false);
  const game =
    games.find((g) => g.id === (gameId ?? selected)) ??
    (gameId ? undefined : games[0]);
  async function move(g: Game, delta: number) {
    const index = games.findIndex((item) => item.id === g.id),
      next = games[index + delta];
    if (!next) return;
    const ids = games.map((game) => game.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    await run(() => repository.reorderGames(ids), "게임 우선순위를 바꿨어요.");
  }
  if (!game)
    return (
      <Panel>
        <Empty
          title={
            gameId
              ? "이 모험 기록을 찾을 수 없어요"
              : "새로운 여정이 기다리고 있어요"
          }
          description={
            gameId
              ? "삭제되었거나 다른 수첩에 있는 기록일 수 있어요."
              : "지금 플레이하는 게임을 추가하고 이번 주의 목적지를 정해 보세요."
          }
          action={
            gameId ? (
              <Link href="/dashboard" className="button">
                오늘의 여정으로
              </Link>
            ) : (
              <button
                className="button primary"
                onClick={() => setEditor({ kind: "game" })}
              >
                첫 번째 게임 등록
              </button>
            )
          }
        />
      </Panel>
    );
  if (gameId)
    return (
      <div className="detail-layout">
        <GameQuestPanel game={game} detail />
        <Summary
          onSelect={(id) => {
            router.push(`/games/${id}`);
          }}
        />
      </div>
    );
  return (
    <div className="today-layout">
      <div className="priority-column">
        <Panel>
          <div className="panel-pad priority-heading">
            <SectionHeader
              action={
                <button
                  className="icon-button"
                  aria-label="게임 순서 편집"
                  aria-pressed={reorder}
                  onClick={() => setReorder((v) => !v)}
                >
                  ↕
                </button>
              }
            >
              게임 우선순위
            </SectionHeader>
          </div>
          <div className="priority-list">
            {games.map((g, i) => (
              <div key={g.id}>
                <GamePriority
                  game={g}
                  index={i}
                  selected={g.id === game.id}
                  onSelect={() => setSelected(g.id)}
                />
                {reorder && (
                  <div className="reorder-actions">
                    <button
                      className="button"
                      disabled={busy || i === 0}
                      onClick={() => move(g, -1)}
                      aria-label={`${g.name} 우선순위 올리기`}
                    >
                      ↑
                    </button>
                    <button
                      className="button"
                      disabled={busy || i === games.length - 1}
                      onClick={() => move(g, 1)}
                      aria-label={`${g.name} 우선순위 내리기`}
                    >
                      ↓
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="priority-add">
            <button
              className="button full"
              onClick={() => setEditor({ kind: "game" })}
            >
              ＋ 게임 추가
            </button>
          </div>
        </Panel>
      </div>
      <GameQuestPanel key={game.id} game={game} />
      <Summary onSelect={setSelected} />
    </div>
  );
}
