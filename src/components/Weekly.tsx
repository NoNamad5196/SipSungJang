"use client";
import { useState } from "react";
import Link from "next/link";
import { useJournal } from "./JournalProvider";
import { Panel, Progress, Ring, Badge, Empty, STATUS_LABELS } from "./ui";
import { percent, INTENSITIES } from "@/lib/model";
import { gameColor } from "@/lib/catalog";
import { QuestRow } from "./Quests";
export function WeeklyScreen() {
  const { games, setEditor } = useJournal(),
    [filter, setFilter] = useState("all");
  const tasks = games.flatMap((g) => g.quests),
    done = tasks.filter((t) => t.done).length;
  const shown = games.filter((g) => filter === "all" || g.intensity === filter);
  return (
    <div className="stack">
      <Panel className="weekly-overview">
        <div>
          <small>이번 주 전체 완료율</small>
          <div className="weekly-overall-progress">
            <Progress value={done} max={tasks.length} />
            <strong>{percent(done, tasks.length)}%</strong>
            <span>
              ({done}/{tasks.length})
            </span>
          </div>
        </div>
        <div className="weekly-estimate">
          <small>진행 중인 게임의 예상 플레이량</small>
          <strong>
            {games
              .filter((g) => !["frozen", "abandoned"].includes(g.intensity))
              .reduce((sum, g) => sum + g.estimated_minutes, 0)}
            분
          </strong>
        </div>
        <div className="filter-group">
          {["all", ...INTENSITIES].map((s) => (
            <button
              key={s}
              className={`filter-button ${filter === s ? "selected" : ""}`}
              aria-pressed={filter === s}
              onClick={() => setFilter(s)}
            >
              {s === "all"
                ? "전체"
                : STATUS_LABELS[s as keyof typeof STATUS_LABELS]}
            </button>
          ))}
        </div>
      </Panel>
      {shown.map((game) => {
        const done = game.quests.filter((q) => q.done).length;
        return (
          <Panel key={game.id} className="weekly-game">
            <Ring
              value={percent(done, game.quests.length)}
              color={gameColor(game)}
            />
            <div className="weekly-game-content">
              <div className="weekly-game-heading">
                <Link href={`/games/${game.id}`}>{game.name}</Link>
                <Badge status={game.intensity} />
                <span>~{game.estimated_minutes}분</span>
                <button
                  className="text-button"
                  onClick={() => setEditor({ kind: "quest", game })}
                >
                  ＋ 퀘스트
                </button>
              </div>
              <div className="weekly-quests">
                {game.quests.map((quest) => (
                  <QuestRow key={quest.id} game={game} quest={quest} compact />
                ))}
              </div>
              {!game.quests.length && (
                <p className="hint">이번 주에 적어 둔 퀘스트가 없어요.</p>
              )}
            </div>
            <button
              className="weekly-next-goal"
              onClick={() => setEditor({ kind: "game", game })}
            >
              <small>◇ 다음 목표</small>
              <em>{game.next_goal || "다음 목적지를 정해 보세요"}</em>
              <small>남은 할 일 {game.quests.length - done}개</small>
            </button>
          </Panel>
        );
      })}
      {!shown.length && (
        <Panel>
          <Empty
            title={
              games.length
                ? "이 상태의 게임이 없어요"
                : "이번 주의 여정을 채워 보세요"
            }
            description="게임을 등록하고 이번 주 퀘스트를 한눈에 살펴보세요."
            action={
              <button
                className="button"
                onClick={() => setEditor({ kind: "game" })}
              >
                게임 등록
              </button>
            }
          />
        </Panel>
      )}
    </div>
  );
}
