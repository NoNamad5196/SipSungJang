"use client";
import { useState } from "react";
import { useJournal } from "./JournalProvider";
import { Panel, Empty, SectionHeader, Progress, PRIORITY_LABELS } from "./ui";
import { gameColor } from "@/lib/catalog";
import { PRIORITIES } from "@/lib/model";
export function CharactersScreen({ gameId }: { gameId?: string }) {
  const { games, characters, setEditor } = useJournal();
  const [gameFilter, setGameFilter] = useState("all"),
    [priority, setPriority] = useState("all");
  if (!games.length)
    return (
      <Panel>
        <Empty
          title="함께할 게임을 먼저 등록하세요"
          description="게임을 등록하면 캐릭터의 성장 여정을 기록할 수 있어요."
          action={
            <button
              className="button primary"
              onClick={() => setEditor({ kind: "game" })}
            >
              게임 등록
            </button>
          }
        />
      </Panel>
    );
  const shown = characters
    .filter(
      (c) =>
        (!gameId || c.game_id === gameId) &&
        (gameFilter === "all" || c.game_id === gameFilter) &&
        (priority === "all" || c.priority_rank === priority),
    )
    .sort(
      (a, b) =>
        PRIORITIES.indexOf(a.priority_rank) -
        PRIORITIES.indexOf(b.priority_rank),
    );
  return (
    <div className="stack">
      <Panel className="filter-panel">
        <div className="filter-group">
          {!gameId && (
            <label>
              게임
              <select
                aria-label="캐릭터 게임 필터"
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
              >
                <option value="all">전체 게임</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            우선순위
            <select
              aria-label="육성 우선순위 필터"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="all">전체</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          className="button"
          onClick={() =>
            setEditor({
              kind: "character",
              gameId: gameId ?? (gameFilter !== "all" ? gameFilter : undefined),
            })
          }
        >
          ＋ 캐릭터 추가
        </button>
      </Panel>
      <div className="character-grid">
        {shown.map((c) => {
          const game = games.find((g) => g.id === c.game_id);
          const color = game ? gameColor(game) : "#c9a84c";
          return (
            <Panel key={c.id} className="character-card">
              <button
                className="card-edit-area"
                onClick={() => setEditor({ kind: "character", character: c })}
                aria-label={`${c.name} 육성 기록 수정`}
              >
                <div className="character-heading">
                  <div>
                    <span
                      className="element-badge"
                      style={{
                        color,
                        borderColor: color + "50",
                        background: color + "16",
                      }}
                    >
                      {c.element}
                    </span>
                    <h2>{c.name}</h2>
                    <small>{game?.name}</small>
                  </div>
                  <span className={`badge priority-${c.priority_rank}`}>
                    {PRIORITY_LABELS[c.priority_rank]}
                  </span>
                </div>
                <div className="character-stat">
                  <div>
                    <span>레벨</span>
                    <span>
                      <strong>{c.current_level}</strong> / {c.target_level}
                    </span>
                  </div>
                  <Progress
                    value={c.current_level}
                    max={c.target_level}
                    color={color}
                    label={`${c.name} 레벨`}
                  />
                </div>
                <div className="character-stat">
                  <div>
                    <span>육성 단계</span>
                    <span>
                      <strong>{c.completed_nodes}</strong> / {c.total_nodes}
                    </span>
                  </div>
                  <Progress
                    value={c.completed_nodes}
                    max={c.total_nodes}
                    label={`${c.name} 육성 단계`}
                  />
                </div>
                <p className="character-note">
                  {c.notes || "다음 육성 계획을 기록해 보세요."}
                </p>
                <span className="card-edit-hint">육성 기록 수정 →</span>
              </button>
            </Panel>
          );
        })}
        <button
          className="add-character-card"
          onClick={() => setEditor({ kind: "character", gameId })}
        >
          <span>＋</span>캐릭터 추가
        </button>
      </div>
      {!shown.length && (
        <Empty
          title="아직 캐릭터 기록이 없어요"
          description="함께 성장할 첫 번째 캐릭터를 등록해 보세요."
        />
      )}
      <div className="sr-only">
        <SectionHeader>캐릭터 육성 기록</SectionHeader>
      </div>
    </div>
  );
}
