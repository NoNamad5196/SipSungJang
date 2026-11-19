"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type { UserProfile } from "@/types";
import { validateBackup, type BackupData } from "@/lib/storage/repository";
import {
  getOtakuSServices,
  validUrl,
  type OtakuSService,
} from "@/lib/services";
import { useSession } from "./AuthProvider";
import { useJournal } from "./JournalProvider";
import { Panel, SectionHeader, Modal } from "./ui";

export { getOtakuSServices, validUrl };

export function AppLauncher({
  compact = false,
  services,
  onNavigate,
}: {
  compact?: boolean;
  services?: readonly OtakuSService[];
  onNavigate?: () => void;
}) {
  const items = services ?? getOtakuSServices();
  return (
    <div className={`app-launcher ${compact ? "compact-launcher" : ""}`}>
      {items.map((s) => {
        const content = (
          <>
            <span
              className="service-icon"
              style={{
                color: s.color,
                borderColor: s.color + "40",
                background: s.color + "12",
              }}
            >
              {s.icon}
            </span>
            <strong>{s.name}</strong>
            <small>{s.description}</small>
            <span className="service-status">
              {s.current
                ? "◆ 현재 서비스"
                : s.href
                  ? "서비스 열기 ↗"
                  : "연결 준비 중"}
            </span>
          </>
        );
        return s.href ? (
          s.current ? (
            <Link
              key={s.id}
              className="service-card current"
              href={s.href}
              onClick={onNavigate}
            >
              {content}
            </Link>
          ) : (
            <a
              key={s.id}
              className="service-card"
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onNavigate}
            >
              {content}
            </a>
          )
        ) : (
          <div
            key={s.id}
            className="service-card unavailable"
            aria-disabled="true"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
function download(value: unknown, name: string) {
  const blob = new Blob(
    [typeof value === "string" ? value : JSON.stringify(value, null, 2)],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function SettingsScreen() {
  const { repository, mode, leave } = useSession(),
    { profile, games, characters, run, busy, error } = useJournal();
  const [importing, setImporting] = useState<BackupData | null>(null),
    [fileError, setFileError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const next: UserProfile = {
      ...profile,
      display_name: String(d.get("display_name")).trim(),
      reset_day: Number(d.get("reset_day")),
      reset_hour: Number(d.get("reset_hour")),
      reminders: {
        weekly: d.has("weekly"),
        events: d.has("events"),
        daily: d.has("daily"),
      },
    };
    await run(() => repository.saveProfile(next), "수첩 설정을 저장했어요.");
  }
  async function fileChosen(file?: File) {
    setFileError("");
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("10MB 이하의 백업 파일을 선택해 주세요.");
      setImporting(validateBackup(JSON.parse(await file.text())));
    } catch (e) {
      setFileError(
        e instanceof SyntaxError
          ? "JSON 파일을 읽을 수 없습니다. 올바른 백업을 선택해 주세요."
          : e instanceof Error
            ? e.message
            : "백업을 읽을 수 없습니다.",
      );
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  const key = mode === "demo" ? "sipsungjang_demo_v2" : "sipsungjang_v2";
  return (
    <div className="settings-screen stack">
      <form onSubmit={saveProfile} className="stack">
        <Panel className="panel-pad">
          <SectionHeader>프로필 설정</SectionHeader>
          <div className="form-stack">
            <label className="setting-field">
              닉네임
              <input
                name="display_name"
                required
                maxLength={40}
                defaultValue={profile.display_name}
                key={profile.display_name}
              />
            </label>
            <div className="setting-field">
              <span>주간 갱신 기준</span>
              <div className="form-grid">
                <label>
                  요일
                  <select name="reset_day" defaultValue={profile.reset_day}>
                    {["일", "월", "화", "수", "목", "금", "토"].map(
                      (day, i) => (
                        <option key={day} value={i}>
                          {day}요일
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  시간
                  <select name="reset_hour" defaultValue={profile.reset_hour}>
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i}시
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="setting-field">
              <span>시간대</span>
              <p>서울 · 한국 표준시 (UTC+9)</p>
            </div>
            <p className="hint">
              수첩의 공통 기준 시간이에요. 퀘스트 진행도는 게임 기록에서 직접
              다시 시작할 수 있어요.
            </p>
          </div>
        </Panel>
        <Panel className="panel-pad">
          <SectionHeader>수첩 안 알림</SectionHeader>
          <div className="stack">
            {(
              [
                ["weekly", "주간 갱신 1시간 전 안내"],
                ["events", "이벤트 마감 임박 안내"],
                ["daily", "일일 퀘스트 미완료 안내"],
              ] as const
            ).map(([key, label]) => (
              <label className="switch-row" key={key}>
                <span>{label}</span>
                <input
                  type="checkbox"
                  role="switch"
                  name={key}
                  defaultChecked={profile.reminders[key]}
                />
              </label>
            ))}
          </div>
          <p className="hint">
            수첩을 열었을 때 보여주는 안내입니다. 기기 푸시 알림은 아직 제공하지
            않아요.
          </p>
          <div className="form-actions">
            <button className="button primary" disabled={busy}>
              설정 저장
            </button>
          </div>
        </Panel>
      </form>
      <Panel className="panel-pad">
        <SectionHeader>서비스 런처</SectionHeader>
        <p className="hint">
          같은 게임을 중심으로 육성, 이벤트, 소비 기록을 이어갈 공간이에요.
        </p>
        <AppLauncher />
      </Panel>
      <Panel className="panel-pad">
        <SectionHeader>기록 보관함</SectionHeader>
        <p className="hint">
          {mode === "cloud"
            ? "계정에 연결된 수첩"
            : mode === "demo"
              ? "내 기록과 별도로 저장된 예시 수첩"
              : "이 브라우저에 저장된 기기 수첩"}{" "}
          · 게임 {games.length}개 · 캐릭터 {characters.length}명
        </p>
        <div className="toolbar">
          <button
            className="button"
            disabled={busy}
            onClick={() =>
              run(
                async () =>
                  download(
                    await repository.exportData(),
                    `sipsungjang-v2-${new Date().toISOString().slice(0, 10)}.json`,
                  ),
                "백업 파일을 내려받았어요.",
              )
            }
          >
            ↓ 백업 내보내기
          </button>
          <button
            className="button"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            ↑ 백업 가져오기
          </button>
          <input
            className="sr-only"
            ref={input}
            type="file"
            accept=".json,application/json"
            aria-label="수첩 백업 파일"
            onChange={(e) => void fileChosen(e.target.files?.[0])}
          />
        </div>
        <p className="hint">
          가져오기는 없는 기록만 추가해요. 이미 등록한 게임과 캐릭터는 덮어쓰지
          않아요.
        </p>
        {fileError && (
          <p className="error-notice" role="alert">
            {fileError}
          </p>
        )}
        {mode !== "cloud" && (
          <details className="recovery-details">
            <summary>저장 오류가 있을 때 원본 보관</summary>
            <p className="hint">
              읽기에 실패한 원본과 직전 저장본을 내려받아 보관할 수 있어요.
            </p>
            <button
              className="button"
              onClick={() =>
                download(
                  {
                    current: localStorage.getItem(key),
                    recovery: localStorage.getItem(key + "_recovery"),
                    legacyGames: localStorage.getItem("sipsungjang_games"),
                    legacyCharacters: localStorage.getItem(
                      "sipsungjang_characters",
                    ),
                  },
                  "sipsungjang-recovery-original.json",
                )
              }
            >
              원본 파일 내려받기
            </button>
          </details>
        )}
      </Panel>
      <div className="toolbar">
        <button
          className="button"
          disabled={busy}
          onClick={() => run(leave, "")}
        >
          {mode === "cloud" ? "로그아웃" : "수첩 선택으로 돌아가기"}
        </button>
        <span className="hint">저장한 기록은 유지됩니다.</span>
      </div>
      {importing && (
        <Modal
          title="백업 기록 가져오기"
          description={`파일의 게임 ${importing.games.length}개, 캐릭터 ${importing.characters.length}명을 확인했어요. 새 기록만 현재 수첩에 추가합니다.`}
          onClose={() => setImporting(null)}
        >
          <p className="hint">
            기존 게임의 퀘스트·파티와 프로필 설정은 유지됩니다.
          </p>
          {error && (
            <p className="error-notice" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button
              className="button"
              disabled={busy}
              onClick={() => setImporting(null)}
            >
              취소
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                if (
                  await run(
                    () => repository.importData(importing),
                    "백업의 새 기록을 가져왔어요.",
                  )
                )
                  setImporting(null);
              }}
            >
              기록 가져오기
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
