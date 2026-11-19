"use client";
import { useState } from "react";
import Link from "next/link";
import type { AgentSignal, AgentSignalKind, AgentSourceApp, Game } from "@/types";
import { GAME_CATALOG } from "@/lib/catalog";
import { useJournal } from "./JournalProvider";

const KIND_META: Record<
  AgentSignalKind,
  { icon: string; label: string; tone: string }
> = {
  game_started: { icon: "▶", label: "플레이 감지", tone: "started" },
  game_stopped: { icon: "■", label: "플레이 종료", tone: "stopped" },
  manual_sync: { icon: "◈", label: "생태계 동기화", tone: "sync" },
  spending_alert: { icon: "⚠", label: "과금 주의 알림", tone: "alert" },
};

const SOURCE_LABELS: Record<AgentSourceApp, string> = {
  sipsungjang: "SipSungJang",
  otakuhub: "OtakuHub",
  gachaguard: "GachaGuard",
};

function resolveSignalGame(signal: AgentSignal, games: Game[]) {
  const matched =
    (signal.user_game_id &&
      games.find((g) => g.id === signal.user_game_id)) ||
    (signal.game_id && games.find((g) => g.game_id === signal.game_id)) ||
    null;
  const catalogName =
    signal.game_id &&
    GAME_CATALOG.find((item) => item.id === signal.game_id)?.name;
  return {
    matched,
    name: matched?.name ?? catalogName ?? signal.game_id ?? null,
  };
}

function formatSignalAge(iso: string, now: Date | null): string {
  if (!now) return "";
  const diffMin = Math.max(
    0,
    Math.round((now.getTime() - Date.parse(iso)) / 60000),
  );
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${Math.floor(diffHours / 24)}일 전`;
}

function formatAmount(signal: AgentSignal): string | null {
  if (signal.amount === null) return null;
  const formatted = signal.amount.toLocaleString("ko-KR");
  return signal.currency ? `${formatted} ${signal.currency}` : formatted;
}

export function AgentSignalBar({ now }: { now: Date | null }) {
  const { agentSignals, games } = useJournal();
  const [expanded, setExpanded] = useState(false);

  if (!agentSignals.length) return null;

  const latest = agentSignals[0];
  const latestMeta = KIND_META[latest.kind];
  const latestGame = resolveSignalGame(latest, games);
  const latestAmount = formatAmount(latest);
  const alertCount = agentSignals.filter(
    (s) => s.kind === "spending_alert",
  ).length;

  return (
    <section
      className={`agent-signal-bar signal-${latestMeta.tone}`}
      aria-label="OtakuS 에이전트 신호"
    >
      <div className="agent-signal-summary">
        <div className="agent-signal-main">
          <span className={`signal-pill signal-${latestMeta.tone}`}>
            <span aria-hidden="true">{latestMeta.icon}</span>
            {latestMeta.label}
          </span>
          <span className="signal-source">
            {SOURCE_LABELS[latest.source_app]}
          </span>
          {latestGame.name &&
            (latestGame.matched ? (
              <Link
                href={`/games/${latestGame.matched.id}`}
                className="signal-game-link"
              >
                {latestGame.name}
              </Link>
            ) : (
              <strong className="signal-game-name">{latestGame.name}</strong>
            ))}
          {latestAmount && (
            <span className="signal-amount">{latestAmount}</span>
          )}
          {latest.message && (
            <span className="signal-message">{latest.message}</span>
          )}
        </div>
        <div className="agent-signal-actions">
          {alertCount > 0 && latest.kind !== "spending_alert" && (
            <span className="signal-pill signal-alert">
              ⚠ 주의 {alertCount}
            </span>
          )}
          <span className="signal-time">
            {formatSignalAge(latest.occurred_at, now)}
          </span>
          <button
            type="button"
            className="signal-toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded
              ? "접기 ▴"
              : agentSignals.length > 1
                ? `신호 ${agentSignals.length}건 ▾`
                : "상세 ▾"}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="agent-signal-feed">
          <div className="agent-signal-feed-head">
            <span>◈ OtakuS Agent 최근 신호</span>
            <small>읽기 전용 수신 피드</small>
          </div>
          <ul className="agent-signal-list">
            {agentSignals.map((signal) => {
              const meta = KIND_META[signal.kind];
              const game = resolveSignalGame(signal, games);
              const amount = formatAmount(signal);
              return (
                <li key={signal.id} className="agent-signal-item">
                  <span className={`signal-pill signal-${meta.tone}`}>
                    <span aria-hidden="true">{meta.icon}</span>
                    {meta.label}
                  </span>
                  <span className="signal-source">
                    {SOURCE_LABELS[signal.source_app]}
                  </span>
                  <div className="agent-signal-item-body">
                    <div>
                      {game.name &&
                        (game.matched ? (
                          <Link
                            href={`/games/${game.matched.id}`}
                            className="signal-game-link"
                          >
                            {game.name}
                          </Link>
                        ) : (
                          <strong className="signal-game-name">
                            {game.name}
                          </strong>
                        ))}
                      {amount && (
                        <span className="signal-amount">{amount}</span>
                      )}
                    </div>
                    {signal.message && (
                      <p className="signal-item-message">{signal.message}</p>
                    )}
                  </div>
                  <span className="signal-time">
                    {formatSignalAge(signal.occurred_at, now)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
