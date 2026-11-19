const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { LocalRepository } = require("../.work/test-build/lib/storage/local");
const {
  normalizeGame,
  normalizeCharacter,
  normalizeAgentSignal,
  nextReset,
  defaultProfile,
  percent,
  koreaDate,
} = require("../.work/test-build/lib/model");
const {
  GAME_CATALOG,
  resolveGame,
  toSharedUserGame,
} = require("../.work/test-build/lib/catalog");
const {
  validUrl,
  getOtakuSServices,
} = require("../.work/test-build/lib/services");
const {
  validateBackup,
  prepareCloudBackup,
} = require("../.work/test-build/lib/storage/repository");
const { demoData } = require("../.work/test-build/lib/demo");
class MemoryStorage {
  data = new Map();
  fail = false;
  getItem(key) {
    return this.data.get(key) ?? null;
  }
  setItem(key, value) {
    if (this.fail) throw new Error("quota");
    this.data.set(key, value);
  }
  removeItem(key) {
    this.data.delete(key);
  }
}
beforeEach(() => {
  global.localStorage = new MemoryStorage();
});
const gameInput = (name = "원신") =>
  normalizeGame({
    id: "input",
    name,
    intensity: "main",
    weekly_tasks: ["보스 처치"],
    weekly_tasks_done: [true],
    party_memo: "기존 파티 메모",
    memo: "보존 메모",
  });
test("canonical game IDs resolve Korean, English, punctuation aliases across services", () => {
  assert.equal(resolveGame(" 원신 ").id, resolveGame("GENSHIN IMPACT").id);
  assert.equal(
    resolveGame("붕괴 스타레일").id,
    resolveGame("Honkai: Star Rail").id,
  );
  assert.equal(resolveGame("사용자 게임").id, resolveGame("사용자게임").id);
  assert.notEqual(resolveGame("사용자게임A").id, resolveGame("사용자게임B").id);
});
test("V1 migration preserves IDs, task completion, notes and source keys", async () => {
  const legacy = {
    id: "legacy-1",
    user_id: "original-user",
    name: "원신",
    weekly_tasks: ["주간 보스", "재화 모으기"],
    weekly_tasks_done: [true, false],
    intensity: "frozen",
    party_memo: "기존 파티",
    memo: "이전 메모",
  };
  localStorage.setItem("sipsungjang_games", JSON.stringify([legacy]));
  localStorage.setItem(
    "sipsungjang_characters",
    JSON.stringify([
      {
        id: "char-1",
        game_id: "legacy-1",
        name: "기존 동료",
        priority_rank: "favorite",
      },
    ]),
  );
  const repo = new LocalRepository(),
    g = (await repo.getGames())[0];
  assert.equal(g.id, legacy.id);
  assert.equal(g.game_id, "genshin-impact");
  assert.equal(g.quests[0].done, true);
  assert.equal(g.quests[1].done, false);
  await repo.updateGame(g.id, { intensity: "sub", next_goal: "새 목표" });
  assert.deepEqual(JSON.parse(localStorage.getItem("sipsungjang_games")), [
    legacy,
  ]);
  assert.equal((await repo.getGame(g.id)).party_memo, "기존 파티");
  assert.equal((await repo.getCharacters())[0].priority_rank, "favorite");
});
test("full CRUD, quest completion/cancellation, character edit, party and reload persistence", async () => {
  let repo = new LocalRepository();
  const game = await repo.createGame(gameInput());
  const quest = {
    id: "new-quest",
    label: "재료 모으기",
    type: "weekly",
    current: 2,
    total: 5,
    done: false,
    deadline: null,
  };
  await repo.updateGame(game.id, {
    quests: [quest],
    next_goal: "90레벨",
    intensity: "login-only",
  });
  await repo.updateGame(game.id, {
    quests: [{ ...quest, done: true, current: 5 }],
  });
  repo = new LocalRepository();
  assert.equal((await repo.getGame(game.id)).quests[0].done, true);
  await repo.updateGame(game.id, {
    quests: [{ ...quest, current: 0, done: false }],
  });
  const char = await repo.addCharacter(
    normalizeCharacter({ id: "input", game_id: game.id, name: "테스트 동료" }),
  );
  await repo.updateCharacter(char.id, {
    priority_rank: "complete",
    current_level: 90,
    completed_nodes: 10,
  });
  await repo.updateGame(game.id, {
    parties: [
      {
        id: "party",
        name: "첫 파티",
        slots: [char.id, null],
        notes: "파티 전략",
      },
    ],
    last_access: "2026-09-11",
  });
  repo = new LocalRepository();
  const fresh = await repo.getGame(game.id);
  assert.equal(fresh.quests[0].done, false);
  assert.equal(fresh.next_goal, "90레벨");
  assert.equal(fresh.intensity, "login-only");
  assert.equal(fresh.parties[0].notes, "파티 전략");
  assert.equal(fresh.last_access, "2026-09-11");
  assert.equal(
    (await repo.getCharacters(game.id))[0].priority_rank,
    "complete",
  );
  await repo.deleteCharacter(char.id);
  assert.equal((await repo.getGame(game.id)).parties[0].slots[0], null);
  await repo.addCharacter(
    normalizeCharacter({ id: "input", game_id: game.id, name: "동료2" }),
  );
  await repo.deleteGame(game.id);
  assert.deepEqual(await repo.getGames(), []);
  assert.deepEqual(await repo.getCharacters(), []);
});
test("duplicate catalog registration is rejected and sorting is atomic with legacy equal order", async () => {
  const repo = new LocalRepository(),
    a = await repo.createGame(gameInput()),
    b = await repo.createGame(gameInput("명조"));
  await assert.rejects(repo.createGame(gameInput("Genshin Impact")), /이미/);
  await repo.updateGame(b.id, { display_order: 0 });
  await repo.reorderGames([b.id, a.id]);
  assert.deepEqual(
    (await repo.getGames()).map((g) => g.id),
    [b.id, a.id],
  );
  await assert.rejects(repo.reorderGames([a.id, a.id]), /목록/);
});
test("backup round trip, merge and reference remapping preserve current records", async () => {
  const repo = new LocalRepository();
  await repo.importData(demoData());
  const backup = await repo.exportData();
  assert.equal(backup.games.length, 5);
  assert.equal(backup.characters.length, 6);
  await repo.updateGame(backup.games[0].id, { next_goal: "내 수정 보존" });
  await repo.importData(backup);
  assert.equal((await repo.getGames()).length, 5);
  assert.equal((await repo.getCharacters()).length, 6);
  assert.equal(
    (await repo.getGame(backup.games[0].id)).next_goal,
    "내 수정 보존",
  );
  const target = new LocalRepository("other");
  await target.importData(backup);
  assert.equal(
    (await target.getGames())[0].parties[0].slots[0],
    backup.characters[0].id,
  );
  const shared = toSharedUserGame((await repo.getGames())[0]);
  assert.equal(shared.game_id, "genshin-impact");
  assert.equal("quests" in shared, false);
});
test("malformed data never silently wipes storage; failed writes leave previous records intact", async () => {
  const repo = new LocalRepository();
  const game = await repo.createGame(gameInput());
  const before = localStorage.getItem("sipsungjang_v2");
  localStorage.fail = true;
  await assert.rejects(repo.updateGame(game.id, { name: "저장 실패" }), /저장/);
  assert.equal(localStorage.getItem("sipsungjang_v2"), before);
  localStorage.fail = false;
  localStorage.setItem("sipsungjang_v2", "{corrupt");
  await assert.rejects(repo.getGames(), /원본/);
  await assert.rejects(repo.createGame(gameInput()), /원본/);
  assert.equal(localStorage.getItem("sipsungjang_v2"), "{corrupt");
});
test("backup validation rejects invalid versions, unsafe IDs, duplicate IDs and orphan references", () => {
  assert.throws(() =>
    validateBackup({ version: 99, games: [], characters: [] }),
  );
  assert.throws(() =>
    validateBackup({
      version: 2,
      games: [{ ...gameInput(), id: "../bad" }],
      characters: [],
    }),
  );
  assert.throws(() =>
    validateBackup({
      version: 2,
      games: [gameInput(), gameInput()],
      characters: [],
    }),
  );
  assert.throws(() =>
    validateBackup({
      version: 2,
      games: [],
      characters: [{ id: "c", game_id: "missing", name: "동료" }],
    }),
  );
});
test("Korean date and weekly reset work at midnight and exact rollover; empty progress is finite", () => {
  assert.equal(koreaDate(new Date("2026-09-10T15:01:00Z")), "2026-09-11");
  const p = defaultProfile();
  assert.equal(
    nextReset(p, new Date("2026-09-13T19:59:00Z")).toISOString(),
    "2026-09-13T20:00:00.000Z",
  );
  assert.equal(
    nextReset(p, new Date("2026-09-13T20:00:00Z")).toISOString(),
    "2026-09-20T20:00:00.000Z",
  );
  assert.equal(percent(0, 0), 0);
  assert.equal(percent(10, 2), 100);
});
test("profile and notification preferences persist; demo and real notebooks stay separate", async () => {
  const repo = new LocalRepository(),
    demo = new LocalRepository("sipsungjang_demo_v2");
  await demo.importData(demoData());
  assert.equal((await repo.getGames()).length, 0);
  await repo.saveProfile({
    ...defaultProfile(),
    display_name: "별빛 모험가",
    reset_day: 3,
    reset_hour: 10,
    reminders: { daily: true, weekly: false, events: false },
  });
  const saved = await new LocalRepository().getProfile();
  assert.equal(saved.display_name, "별빛 모험가");
  assert.equal(saved.reset_day, 3);
  assert.equal(saved.reminders.daily, true);
});
test("cloud backup IDs remain canonical and character/party references survive consolidation", () => {
  const original = demoData();
  const prepared = prepareCloudBackup(original, "uid");
  assert.ok(
    prepared.games.every((g) => g.id === g.game_id && g.user_id === "uid"),
  );
  const firstGame = prepared.games[0];
  const char = prepared.characters.find(
    (c) => c.id === firstGame.parties[0].slots[0],
  );
  assert.equal(char.game_id, firstGame.id);
  const duplicate = { ...original.games[0], id: "legacy-duplicate" };
  const merged = prepareCloudBackup(
    { ...original, games: [...original.games, duplicate] },
    "uid",
  );
  assert.equal(merged.games.length, original.games.length);
  assert.throws(() =>
    prepareCloudBackup(
      { ...original, games: [{ ...original.games[0], game_id: "../bad" }] },
      "uid",
    ),
  );
});
test("editing a display name cannot change the shared game identity", async () => {
  const repo = new LocalRepository();
  const game = await repo.createGame(gameInput());
  const edited = await repo.updateGame(game.id, {
    name: "나의 원신",
    game_id: "wrong",
  });
  assert.equal(edited.game_id, "genshin-impact");
  await assert.rejects(repo.createGame(gameInput("GENSHIN IMPACT")), /이미/);
});
test("validUrl and getOtakuSServices enforce HTTPS links and ecosystem launcher contract", () => {
  assert.equal(
    validUrl("https://otakuhub.example.com"),
    "https://otakuhub.example.com/",
  );
  assert.equal(
    validUrl("https://gachaguard.example.com/budget"),
    "https://gachaguard.example.com/budget",
  );
  assert.equal(validUrl("http://otakuhub.example.com"), null);
  assert.equal(validUrl("javascript:alert(1)"), null);
  assert.equal(validUrl("ftp://example.com"), null);
  assert.equal(validUrl(""), null);
  assert.equal(validUrl(undefined), null);

  const services = getOtakuSServices({
    NEXT_PUBLIC_OTAKUHUB_URL: "https://otakuhub.web.app",
    NEXT_PUBLIC_GACHAGUARD_URL: "http://insecure.example.com",
  });
  assert.equal(services.length, 3);
  assert.deepEqual(
    services.map((s) => s.id),
    ["sipsungjang", "otakuhub", "gachaguard"],
  );
  assert.deepEqual(services[0], {
    id: "sipsungjang",
    name: "SipSungJang",
    description: "육성 · 주간 목표 · 플레이 수첩",
    icon: "✦",
    color: "#c9a84c",
    href: "/dashboard",
    current: true,
  });
  assert.equal(services[1].href, "https://otakuhub.web.app/");
  assert.equal(services[1].current, false);
  assert.equal(services[2].href, null);
  assert.equal(services[2].current, false);
});
test("normalizeAgentSignal coerces Timestamp/ISO values, filters expired signals, and rejects invalid kinds", () => {
  const now = new Date("2026-11-19T12:00:00.000Z");
  const fromIso = normalizeAgentSignal(
    {
      kind: "spending_alert",
      source_app: "gachaguard",
      game_id: "honkai-star-rail",
      user_game_id: "honkai-star-rail",
      occurred_at: "2026-11-19T11:30:00.000Z",
      received_at: "2026-11-19T11:31:00.000Z",
      expires_at: "2026-11-20T11:31:00.000Z",
      message: "월간 예산 85% 도달",
      amount: 55000.9,
      currency: "krw",
    },
    "sig-1",
    now,
  );
  assert.deepEqual(fromIso, {
    id: "sig-1",
    kind: "spending_alert",
    source_app: "gachaguard",
    game_id: "honkai-star-rail",
    user_game_id: "honkai-star-rail",
    occurred_at: "2026-11-19T11:30:00.000Z",
    received_at: "2026-11-19T11:31:00.000Z",
    expires_at: "2026-11-20T11:31:00.000Z",
    message: "월간 예산 85% 도달",
    amount: 55000,
    currency: "KRW",
  });

  const fakeTimestamp = (iso) => ({ toDate: () => new Date(iso) });
  const fromTimestamp = normalizeAgentSignal(
    {
      id: "sig-ts",
      kind: "game_started",
      source_app: "sipsungjang",
      game_id: "genshin-impact",
      occurred_at: fakeTimestamp("2026-11-19T11:50:00.000Z"),
      received_at: { seconds: Math.floor(Date.parse("2026-11-19T11:51:00.000Z") / 1000), nanoseconds: 0 },
      expires_at: fakeTimestamp("2026-11-19T15:00:00.000Z"),
    },
    undefined,
    now,
  );
  assert.equal(fromTimestamp?.id, "sig-ts");
  assert.equal(fromTimestamp?.kind, "game_started");

  assert.equal(
    normalizeAgentSignal(
      {
        kind: "game_stopped",
        source_app: "sipsungjang",
        occurred_at: "2026-11-18T10:00:00.000Z",
        received_at: "2026-11-18T10:01:00.000Z",
        expires_at: "2026-11-19T12:00:00.000Z",
      },
      "sig-expired",
      now,
    ),
    null,
  );
  assert.equal(
    normalizeAgentSignal(
      {
        kind: "unknown_kind",
        source_app: "otakuhub",
        occurred_at: "2026-11-19T11:00:00.000Z",
        received_at: "2026-11-19T11:01:00.000Z",
        expires_at: "2026-11-20T11:01:00.000Z",
      },
      "sig-bad-kind",
      now,
    ),
    null,
  );
  assert.equal(
    normalizeAgentSignal(
      {
        kind: "manual_sync",
        source_app: "invalid_app",
        occurred_at: "2026-11-19T11:00:00.000Z",
        received_at: "2026-11-19T11:01:00.000Z",
        expires_at: "2026-11-20T11:01:00.000Z",
      },
      "sig-bad-app",
      now,
    ),
    null,
  );
});
test("LocalRepository.listAgentSignals returns demo preview signals and filters stored local signals without writing", async () => {
  const localRepo = new LocalRepository();
  assert.deepEqual(await localRepo.listAgentSignals(), []);

  const demoRepo = new LocalRepository("sipsungjang_demo_v2");
  const demoSignals = await demoRepo.listAgentSignals();
  assert.equal(demoSignals.length, 3);
  assert.equal(localStorage.getItem("sipsungjang_demo_v2_agent_signals"), null);

  const future = new Date(Date.now() + 3600_000).toISOString();
  const past = new Date(Date.now() - 3600_000).toISOString();
  localStorage.setItem(
    "sipsungjang_v2_agent_signals",
    JSON.stringify([
      {
        id: "older",
        kind: "manual_sync",
        source_app: "otakuhub",
        occurred_at: new Date(Date.now() - 600_000).toISOString(),
        received_at: new Date(Date.now() - 600_000).toISOString(),
        expires_at: future,
      },
      {
        id: "newer",
        kind: "game_started",
        source_app: "sipsungjang",
        game_id: "genshin-impact",
        occurred_at: new Date(Date.now() - 60_000).toISOString(),
        received_at: new Date(Date.now() - 60_000).toISOString(),
        expires_at: future,
      },
      {
        id: "expired",
        kind: "game_stopped",
        source_app: "sipsungjang",
        occurred_at: past,
        received_at: past,
        expires_at: past,
      },
    ]),
  );
  const stored = await localRepo.listAgentSignals(5);
  assert.deepEqual(
    stored.map((s) => s.id),
    ["newer", "older"],
  );
});
test("toSharedUserGame projects only shared UserGame fields and catalog aligns across OtakuS", () => {
  assert.deepEqual(
    GAME_CATALOG.map((g) => g.id),
    [
      "genshin-impact",
      "honkai-star-rail",
      "wuthering-waves",
      "blue-archive",
      "nikke",
      "arknights",
      "zenless-zone-zero",
      "limbus-company",
    ],
  );
  const fullGame = normalizeGame({
    id: "genshin-impact",
    user_id: "uid-1",
    game_id: "genshin-impact",
    name: "원신",
    intensity: "main",
    last_access: "2026-11-19",
    display_order: 2,
    created_at: "2026-11-01T00:00:00.000Z",
    updated_at: "2026-11-19T00:00:00.000Z",
    next_goal: "나선 36성",
    memo: "비공개 메모",
    quests: [{ id: "q1", label: "레진", current: 1, total: 2, type: "daily", done: false, deadline: null }],
    parties: [{ id: "p1", name: "기본", slots: [null, null], notes: "" }],
  });
  const shared = toSharedUserGame(fullGame);
  assert.deepEqual(Object.keys(shared).sort(), [
    "created_at",
    "display_order",
    "game_id",
    "id",
    "intensity",
    "last_access",
    "updated_at",
    "user_id",
  ]);
  assert.deepEqual(shared, {
    id: "genshin-impact",
    user_id: "uid-1",
    game_id: "genshin-impact",
    intensity: "main",
    last_access: "2026-11-19",
    display_order: 2,
    created_at: "2026-11-01T00:00:00.000Z",
    updated_at: "2026-11-19T00:00:00.000Z",
  });
});
