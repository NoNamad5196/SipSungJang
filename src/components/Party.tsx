"use client";
import { useState, type FormEvent } from "react";
import type { Game, Party } from "@/types";
import { gameColor } from "@/lib/catalog";
import { useSession } from "./AuthProvider";
import { useJournal } from "./JournalProvider";
import { Panel, SectionHeader, Empty, PRIORITY_LABELS } from "./ui";
function PartyEditor({
  game,
  party,
  onSaved,
}: {
  game: Game;
  party?: Party;
  onSaved: (id: string) => void;
}) {
  const { repository } = useSession(),
    { characters, run, busy } = useJournal();
  const [slots, setSlots] = useState<(string | null)[]>(
    party?.slots ?? [null, null, null, null],
  );
  const chars = characters.filter((c) => c.game_id === game.id);
  const [validation, setValidation] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget),
      selected = slots.filter(Boolean);
    if (new Set(selected).size !== selected.length) {
      setValidation("같은 캐릭터를 두 슬롯에 편성할 수 없어요.");
      return;
    }
    const next = {
      id: party?.id ?? crypto.randomUUID(),
      name: String(data.get("name")).trim(),
      slots,
      notes: String(data.get("notes") ?? ""),
    };
    if (!next.name) {
      setValidation("파티 이름을 입력해 주세요.");
      return;
    }
    if (
      await run(async () => {
        const fresh = await repository.getGame(game.id);
        if (!fresh) throw new Error("게임을 찾을 수 없습니다.");
        await repository.updateGame(game.id, {
          parties: party
            ? fresh.parties.map((p) => (p.id === party.id ? next : p))
            : [...fresh.parties, next],
        });
      }, "파티 편성을 저장했어요.")
    ) {
      setValidation("");
      onSaved(next.id);
    }
  }
  return (
    <div className="party-layout">
      <Panel className="panel-pad">
        <SectionHeader>파티 구성</SectionHeader>
        <form onSubmit={submit} className="form-stack">
          <div className="form-grid">
            <label>
              파티 이름
              <input
                name="name"
                defaultValue={party?.name ?? "새 모험 파티"}
                maxLength={100}
                required
              />
            </label>
            <label>
              편성 인원
              <select
                value={slots.length}
                onChange={(e) => {
                  const length = Number(e.target.value);
                  setSlots((old) =>
                    Array.from({ length }, (_, i) => old[i] ?? null),
                  );
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}명
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="party-slots">
            {slots.map((id, i) => {
              const char = chars.find((c) => c.id === id);
              return (
                <label className={`party-slot ${char ? "filled" : ""}`} key={i}>
                  <span className="slot-index">{i + 1}번 슬롯</span>
                  <span
                    className="character-avatar"
                    style={{
                      color: gameColor(game),
                      borderColor: gameColor(game) + "40",
                    }}
                  >
                    {char?.name.charAt(0) ?? "○"}
                  </span>
                  <strong>{char?.name ?? "빈 슬롯"}</strong>
                  <small>
                    {char
                      ? `${char.element} · 레벨 ${char.current_level}`
                      : "함께할 동료를 선택하세요"}
                  </small>
                  <select
                    aria-label={`${i + 1}번 슬롯 캐릭터`}
                    value={id ?? ""}
                    onChange={(e) =>
                      setSlots((old) =>
                        old.map((s, idx) =>
                          idx === i ? e.target.value || null : s,
                        ),
                      )
                    }
                  >
                    <option value="">빈 슬롯</option>
                    {chars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
          <label>
            ◇ 조합 메모
            <textarea
              name="notes"
              rows={4}
              maxLength={10000}
              defaultValue={party?.notes ?? ""}
              placeholder="파티 조합 전략과 운용 방식을 기록해 보세요."
            />
          </label>
          {validation && (
            <p role="alert" className="error-notice">
              {validation}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            파티 저장
          </button>
        </form>
      </Panel>
      <Panel className="panel-pad">
        <SectionHeader>보유 캐릭터</SectionHeader>
        {chars.length ? (
          <div className="roster-list">
            {chars.map((c) => (
              <div className="roster-row" key={c.id}>
                <span
                  className="character-avatar small"
                  style={{ color: gameColor(game) }}
                >
                  {c.name.charAt(0)}
                </span>
                <div>
                  <strong>{c.name}</strong>
                  <small>
                    레벨 {c.current_level} · {c.element}
                  </small>
                </div>
                <span className={`badge priority-${c.priority_rank}`}>
                  {PRIORITY_LABELS[c.priority_rank]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="hint">
            등록한 캐릭터가 없어요.
            <br />
            캐릭터 육성에서 동료를 추가하세요.
          </p>
        )}
      </Panel>
    </div>
  );
}
export function PartyScreen({ gameId }: { gameId?: string }) {
  const { games, setEditor, run, busy } = useJournal(),
    { repository } = useSession();
  const [activeId, setActiveId] = useState(gameId ?? ""),
    [partyId, setPartyId] = useState("");
  const game = games.find((g) => g.id === (gameId ?? activeId)) ?? games[0];
  if (!game)
    return (
      <Panel>
        <Empty
          title="파티의 여정을 시작해 볼까요?"
          description="게임과 캐릭터를 등록하면 나만의 조합을 만들 수 있어요."
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
    );
  const party =
    game.parties.find((p) => p.id === partyId) ??
    (partyId === "new" ? undefined : game.parties[0]);
  return (
    <div className="stack">
      {!gameId && (
        <div className="game-tabs">
          {games.map((g) => (
            <button
              key={g.id}
              className={game.id === g.id ? "selected" : ""}
              onClick={() => {
                setActiveId(g.id);
                setPartyId("");
              }}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}
      <div className="toolbar">
        <div className="filter-group">
          {game.parties.map((p) => (
            <button
              key={p.id}
              className={`filter-button ${party?.id === p.id ? "selected" : ""}`}
              onClick={() => setPartyId(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
        <button className="button" onClick={() => setPartyId("new")}>
          ＋ 새 파티
        </button>
        {party && (
          <button
            className="text-button danger"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  repository.updateGame(game.id, {
                    parties: game.parties.filter((p) => p.id !== party.id),
                  }),
                "파티를 삭제했어요.",
              )
            }
          >
            파티 삭제
          </button>
        )}
      </div>
      <PartyEditor
        key={`${game.id}-${party?.id ?? "new"}`}
        game={game}
        party={party}
        onSaved={setPartyId}
      />
      {game.party_memo && (
        <Panel className="panel-pad">
          <SectionHeader>기존 파티 메모</SectionHeader>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const memo = String(
                new FormData(e.currentTarget).get("party_memo") ?? "",
              );
              void run(() =>
                repository.updateGame(game.id, { party_memo: memo }),
              );
            }}
          >
            <label>
              자유 형식 메모
              <textarea
                name="party_memo"
                rows={4}
                defaultValue={game.party_memo}
              />
            </label>
            <button className="button" disabled={busy}>
              기존 메모 저장
            </button>
          </form>
        </Panel>
      )}
    </div>
  );
}
