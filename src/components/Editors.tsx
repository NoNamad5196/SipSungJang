"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type {
  Game,
  Quest,
  Character,
  CurrentGoal,
  PlayIntensity,
  PriorityRank,
} from "@/types";
import { GAME_CATALOG, resolveGame } from "@/lib/catalog";
import {
  normalizeGame,
  normalizeCharacter,
  koreaDate,
  INTENSITIES,
  PRIORITIES,
} from "@/lib/model";
import { GOAL_CONFIG } from "@/lib/constants";
import { useSession } from "./AuthProvider";
import { useJournal } from "./JournalProvider";
import { Modal, STATUS_LABELS, PRIORITY_LABELS } from "./ui";

function Footer({ label = "기록 저장" }: { label?: string }) {
  const { busy, error, setEditor } = useJournal();
  return (
    <>
      {error && (
        <p className="error-notice" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={() => setEditor(null)}
        >
          취소
        </button>
        <button className="button primary" disabled={busy}>
          {busy ? "저장 중…" : label}
        </button>
      </div>
    </>
  );
}
const text = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();
const number = (data: FormData, key: string) => Number(data.get(key));
function GameEditor({ game }: { game?: Game }) {
  const { repository } = useSession(),
    { run, setEditor } = useJournal();
  const [name, setName] = useState(game?.name ?? "");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    await run(
      async () => {
        const master = game
          ? { id: game.game_id, name: name.trim() }
          : resolveGame(name);
        const input = normalizeGame({
          ...game,
          id: game?.id ?? "new",
          game_id: master.id,
          name: master.name,
          icon: text(data, "icon") || null,
          intensity: text(data, "intensity") as PlayIntensity,
          current_goal: (text(data, "current_goal") as CurrentGoal) || null,
          next_goal: text(data, "next_goal") || null,
          urgency: text(data, "urgency"),
          estimated_minutes: number(data, "estimated_minutes"),
          last_access: text(data, "last_access") || null,
        });
        return game
          ? repository.updateGame(game.id, input)
          : repository.createGame(input);
      },
      game ? "게임 정보를 저장했어요." : "새로운 여정을 수첩에 등록했어요.",
    ).then((success) => {
      if (success) setEditor(null);
    });
  }
  return (
    <Modal
      title={game ? "게임 기록 수정" : "새로운 게임 등록"}
      description={
        game
          ? "플레이 강도와 다음 목적지를 정리해 보세요."
          : "게임을 검색하거나 이름을 직접 입력해 주세요."
      }
      onClose={() => setEditor(null)}
    >
      <form onSubmit={submit} className="form-stack">
        <label>
          게임 이름
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            list="game-catalog"
            required
            maxLength={120}
            autoFocus
          />
          <datalist id="game-catalog">
            {GAME_CATALOG.map((g) => (
              <option key={g.id} value={g.name} />
            ))}
          </datalist>
        </label>
        {!game && (
          <div className="catalog-options">
            {GAME_CATALOG.filter(
              (g) =>
                !name ||
                [g.name, ...g.aliases].some((a) =>
                  a.toLowerCase().includes(name.toLowerCase()),
                ),
            )
              .slice(0, 8)
              .map((g) => (
                <button
                  type="button"
                  key={g.id}
                  className="filter-button"
                  onClick={() => setName(g.name)}
                >
                  {g.name}
                </button>
              ))}
          </div>
        )}
        <div className="form-grid">
          <label>
            플레이 강도
            <select name="intensity" defaultValue={game?.intensity ?? "sub"}>
              {INTENSITIES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            예상 플레이 시간 (분)
            <input
              name="estimated_minutes"
              type="number"
              min={0}
              max={10080}
              defaultValue={game?.estimated_minutes ?? 30}
              required
            />
          </label>
          <label>
            현재 목표
            <select name="current_goal" defaultValue={game?.current_goal ?? ""}>
              <option value="">아직 정하지 않음</option>
              {Object.entries(GOAL_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            우선 처리 정도
            <select name="urgency" defaultValue={game?.urgency ?? "medium"}>
              <option value="high">급함</option>
              <option value="medium">보통</option>
              <option value="low">여유</option>
            </select>
          </label>
          <label>
            최근 접속일
            <input
              type="date"
              name="last_access"
              max={koreaDate()}
              defaultValue={game?.last_access ?? ""}
            />
          </label>
          <label>
            나만의 아이콘
            <input
              name="icon"
              maxLength={8}
              defaultValue={game?.icon ?? ""}
              placeholder="예: ✦"
            />
          </label>
        </div>
        <label>
          다음 목표
          <input
            name="next_goal"
            maxLength={500}
            defaultValue={game?.next_goal ?? ""}
            placeholder="이번 여정에서 이루고 싶은 목표"
          />
        </label>
        <Footer label={game ? "변경 내용 저장" : "게임 등록"} />
      </form>
    </Modal>
  );
}
function QuestEditor({ game, quest }: { game: Game; quest?: Quest }) {
  const { repository } = useSession(),
    { run, setEditor } = useJournal();
  const [validation, setValidation] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget),
      current = number(data, "current"),
      total = number(data, "total");
    if (!text(data, "label")) {
      setValidation("퀘스트 이름을 입력해 주세요.");
      return;
    }
    if (current > total) {
      setValidation("현재 진행량은 목표 진행량보다 클 수 없어요.");
      return;
    }
    const next: Quest = {
      id: quest?.id ?? crypto.randomUUID(),
      label: text(data, "label"),
      current,
      total,
      done: current === total,
      type: text(data, "type") as Quest["type"],
      deadline: text(data, "deadline") || null,
    };
    if (
      await run(async () => {
        const fresh = await repository.getGame(game.id);
        if (!fresh) throw new Error("게임을 찾을 수 없습니다.");
        await repository.updateGame(game.id, {
          quests: quest
            ? fresh.quests.map((t) => (t.id === quest.id ? next : t))
            : [...fresh.quests, next],
        });
      })
    )
      setEditor(null);
  }
  async function remove() {
    if (
      await run(async () => {
        const fresh = await repository.getGame(game.id);
        if (fresh)
          await repository.updateGame(game.id, {
            quests: fresh.quests.filter((t) => t.id !== quest?.id),
          });
      }, "퀘스트를 삭제했어요.")
    )
      setEditor(null);
  }
  return (
    <Modal
      title={quest ? "퀘스트 수정" : "새 퀘스트"}
      description={`${game.name}에서 이번에 해야 할 일을 적어 주세요.`}
      onClose={() => setEditor(null)}
    >
      <form onSubmit={submit} className="form-stack">
        <label>
          퀘스트 이름
          <input
            name="label"
            required
            maxLength={300}
            defaultValue={quest?.label ?? ""}
            autoFocus
          />
        </label>
        <div className="form-grid">
          <label>
            종류
            <select name="type" defaultValue={quest?.type ?? "weekly"}>
              <option value="daily">일일</option>
              <option value="weekly">주간</option>
              <option value="event">이벤트</option>
            </select>
          </label>
          <label>
            마감일 (선택)
            <input
              name="deadline"
              type="date"
              defaultValue={quest?.deadline ?? ""}
            />
          </label>
          <label>
            현재 진행량
            <input
              type="number"
              name="current"
              min={0}
              max={999999}
              defaultValue={quest?.current ?? 0}
              required
            />
          </label>
          <label>
            목표 진행량
            <input
              type="number"
              name="total"
              min={1}
              max={999999}
              defaultValue={quest?.total ?? 1}
              required
            />
          </label>
        </div>
        {validation && (
          <p role="alert" className="error-notice">
            {validation}
          </p>
        )}
        <Footer label="퀘스트 저장" />
        {quest && (
          <button type="button" className="text-button danger" onClick={remove}>
            이 퀘스트 삭제
          </button>
        )}
      </form>
    </Modal>
  );
}
function CharacterEditor({
  character,
  gameId,
}: {
  character?: Character;
  gameId?: string;
}) {
  const { repository } = useSession(),
    { games, run, setEditor } = useJournal();
  const [validation, setValidation] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    if (!text(d, "name")) {
      setValidation("캐릭터 이름을 입력해 주세요.");
      return;
    }
    if (
      number(d, "completed_nodes") > number(d, "total_nodes") ||
      number(d, "current_level") > number(d, "target_level")
    ) {
      setValidation("현재 진행도는 목표보다 클 수 없어요.");
      return;
    }
    const data = normalizeCharacter({
      ...character,
      id: character?.id ?? "new",
      game_id: character?.game_id ?? text(d, "game_id"),
      name: text(d, "name"),
      priority_rank: text(d, "priority_rank") as PriorityRank,
      element: text(d, "element") || "미지정",
      current_level: number(d, "current_level"),
      target_level: number(d, "target_level"),
      completed_nodes: number(d, "completed_nodes"),
      total_nodes: number(d, "total_nodes"),
      notes: text(d, "notes"),
    });
    if (
      await run(() =>
        character
          ? repository.updateCharacter(character.id, data)
          : repository.addCharacter(data),
      )
    )
      setEditor(null);
  }
  return (
    <Modal
      title={character ? "육성 기록 수정" : "캐릭터 추가"}
      description="육성의 우선순위와 다음 성장 단계를 기록하세요."
      onClose={() => setEditor(null)}
    >
      <form onSubmit={submit} className="form-stack">
        <div className="form-grid">
          <label>
            게임
            <select
              name="game_id"
              defaultValue={character?.game_id ?? gameId ?? games[0]?.id}
              disabled={Boolean(character)}
              required
            >
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            캐릭터 이름
            <input
              name="name"
              required
              maxLength={80}
              defaultValue={character?.name ?? ""}
              autoFocus
            />
          </label>
          <label>
            우선순위
            <select
              name="priority_rank"
              defaultValue={character?.priority_rank ?? "priority1"}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label>
            속성 / 역할
            <input
              name="element"
              maxLength={40}
              defaultValue={character?.element ?? ""}
              placeholder="예: 번개, 회복"
            />
          </label>
          <label>
            현재 레벨
            <input
              name="current_level"
              type="number"
              min={1}
              max={9999}
              defaultValue={character?.current_level ?? 1}
              required
            />
          </label>
          <label>
            목표 레벨
            <input
              name="target_level"
              type="number"
              min={1}
              max={9999}
              defaultValue={character?.target_level ?? 90}
              required
            />
          </label>
          <label>
            완료한 육성 단계
            <input
              name="completed_nodes"
              type="number"
              min={0}
              max={9999}
              defaultValue={character?.completed_nodes ?? 0}
              required
            />
          </label>
          <label>
            전체 육성 단계
            <input
              name="total_nodes"
              type="number"
              min={1}
              max={9999}
              defaultValue={character?.total_nodes ?? 10}
              required
            />
          </label>
        </div>
        <label>
          육성 메모
          <textarea
            name="notes"
            rows={3}
            maxLength={5000}
            defaultValue={character?.notes ?? ""}
          />
        </label>
        {validation && (
          <p role="alert" className="error-notice">
            {validation}
          </p>
        )}
        <Footer />
        {character && (
          <button
            type="button"
            className="text-button danger"
            onClick={() => setEditor({ kind: "delete-character", character })}
          >
            캐릭터 삭제
          </button>
        )}
      </form>
    </Modal>
  );
}
export function Editors() {
  const { editor, setEditor, run, busy, error } = useJournal(),
    { repository } = useSession(),
    router = useRouter();
  if (!editor) return null;
  if (editor.kind === "game")
    return <GameEditor key={editor.game?.id ?? "new"} game={editor.game} />;
  if (editor.kind === "quest")
    return (
      <QuestEditor
        key={editor.quest?.id ?? "new"}
        game={editor.game}
        quest={editor.quest}
      />
    );
  if (editor.kind === "character")
    return (
      <CharacterEditor
        key={editor.character?.id ?? "new"}
        character={editor.character}
        gameId={editor.gameId}
      />
    );
  const name =
    editor.kind === "delete-game" ? editor.game.name : editor.character.name;
  async function remove() {
    if (!editor || !("game" in editor || "character" in editor)) return;
    const success = await run(
      () =>
        editor.kind === "delete-game"
          ? repository.deleteGame(editor.game.id)
          : repository.deleteCharacter(
              (editor as { character: Character }).character.id,
            ),
      "기록을 삭제했어요.",
    );
    if (success) {
      setEditor(null);
      if (editor.kind === "delete-game") router.push("/dashboard");
    }
  }
  return (
    <Modal
      title="기록 삭제"
      description={`${name} 기록을 삭제할까요? ${editor.kind === "delete-game" ? "이 게임의 퀘스트, 캐릭터, 파티도 수첩에서 사라집니다." : "편성된 파티 슬롯에서도 제외됩니다."}`}
      onClose={() => setEditor(null)}
    >
      {error && (
        <p role="alert" className="error-notice">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button
          className="button"
          disabled={busy}
          onClick={() => setEditor(null)}
        >
          취소
        </button>
        <button className="button danger" disabled={busy} onClick={remove}>
          기록 삭제
        </button>
      </div>
    </Modal>
  );
}
