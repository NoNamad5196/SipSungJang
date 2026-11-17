import { readFile } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

// Never fall through to a real Firebase endpoint, even when run outside the npm script.
const emulator = process.env.FIRESTORE_EMULATOR_HOST;
if (!emulator || !/^127\.0\.0\.1:\d+$/.test(emulator)) {
  throw new Error(
    "Run npm run test:rules with the loopback demo emulator only.",
  );
}
const [host, port] = emulator.split(":");
let env;
const uid = "alice";
const root = `users/${uid}`;
const gamePath = `${root}/games/genshin-impact`;
const charPath = `${root}/characters/character-1`;
const game = {
  id: "genshin-impact",
  user_id: uid,
  game_id: "genshin-impact",
  name: "원신",
  icon: null,
  intensity: "sub",
  last_access: null,
  display_order: 0,
  created_at: "2026-11-02T00:00:00.000Z",
  updated_at: "2026-11-02T00:00:00.000Z",
  current_goal: null,
  weekly_tasks: ["주간"],
  weekly_tasks_done: [false],
  quests: [
    {
      id: "q1",
      label: "주간",
      current: 0,
      total: 1,
      type: "weekly",
      deadline: null,
      done: false,
    },
  ],
  next_goal: null,
  urgency: "medium",
  party_memo: null,
  memo: null,
  estimated_minutes: 30,
  parties: [
    { id: "p1", name: "기본", slots: ["character-1", null], notes: "" },
  ],
};
const character = {
  id: "character-1",
  game_id: "genshin-impact",
  name: "캐릭터",
  priority_rank: "on-hold",
  notes: null,
  created_at: "2026-11-02T00:00:00.000Z",
  element: "미지정",
  current_level: 1,
  target_level: 90,
  completed_nodes: 0,
  total_nodes: 10,
};
const profile = {
  user_id: uid,
  display_name: "모험가",
  timezone: "Asia/Seoul",
  reset_day: 1,
  reset_hour: 5,
  reminders: { weekly: true, events: true, daily: false },
};
const privatePaths = [
  "userFranchises/genshin",
  "agentSignals/signal-1",
  ...[
    "settings",
    "gameStates",
    "budgets",
    "payments",
    "paymentTemplates",
    "banners",
    "userBanners",
    "pullSessions",
    "pulls",
    "gachaLogs",
    "guardrailRules",
  ].map((kind) => `gacha/main/${kind}/record`),
  ...["userEvents", "collections", "reminders"].map(
    (kind) => `hub/main/${kind}/record`,
  ),
];
const publicPaths = [
  "games/genshin-impact",
  "franchises/genshin",
  "events/event-1",
  "modules/gacha/gameConfigs/genshin-impact",
  "modules/gacha/banners/banner-1",
];
const serverPaths = [
  "identityMappings/record",
  ...["crawlSources", "crawledPosts", "eventSuggestions", "crawlRuns"].map(
    (kind) => `modules/hub/${kind}/record`,
  ),
];
const db = (user = uid) =>
  user
    ? env.authenticatedContext(user).firestore()
    : env.unauthenticatedContext().firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-otakus",
    firestore: {
      host,
      port: Number(port),
      rules: await readFile(
        new URL("../firestore.rules", import.meta.url),
        "utf8",
      ),
    },
  });
});
after(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const store = context.firestore();
    const batch = writeBatch(store);
    batch.set(doc(store, root), {
      profile,
      account: { email: "private@example.invalid" },
    });
    batch.set(doc(store, gamePath), game);
    batch.set(doc(store, charPath), character);
    for (const path of [
      ...publicPaths,
      ...serverPaths,
      ...privatePaths.map((p) => `${root}/${p}`),
    ]) {
      batch.set(doc(store, path), { marker: "server-owned fixture" });
    }
    await batch.commit();
  });
});

test("owner reads and creates normalized SipSungJang games and characters", async () => {
  const store = db();
  await assertSucceeds(getDoc(doc(store, gamePath)));
  await assertSucceeds(getDoc(doc(store, charPath)));
  await assertSucceeds(
    setDoc(doc(store, `${root}/games/custom-61`), {
      ...game,
      id: "custom-61",
      game_id: "custom-61",
    }),
  );
  await assertSucceeds(
    setDoc(doc(store, `${root}/characters/new`), { ...character, id: "new" }),
  );
  await assertSucceeds(getDocs(collection(store, `${root}/games`)));
  await assertSucceeds(
    getDocs(
      query(
        collection(store, `${root}/characters`),
        where("game_id", "==", "genshin-impact"),
      ),
    ),
  );
});

test("repository transaction update, reorder, character delete cleanup and game restore", async () => {
  const store = db();
  await assertSucceeds(
    runTransaction(store, async (tx) => {
      const ref = doc(store, gamePath);
      const snap = await tx.get(ref);
      tx.set(ref, { ...snap.data(), memo: "수정" }, { merge: true });
    }),
  );
  const batch = writeBatch(store);
  batch.update(doc(store, gamePath), { display_order: 2, parties: [] });
  batch.set(
    doc(store, charPath),
    { deleted_at: "2026-11-02" },
    { merge: true },
  );
  await assertSucceeds(batch.commit());
  await assertSucceeds(
    setDoc(doc(store, gamePath), { deleted_at: "2026-11-02" }, { merge: true }),
  );
  await assertSucceeds(
    runTransaction(store, async (tx) => {
      const ref = doc(store, gamePath);
      const snap = await tx.get(ref);
      tx.set(
        ref,
        { ...snap.data(), intensity: "main", deleted_at: null },
        { merge: true },
      );
    }),
  );
  await assertSucceeds(
    updateDoc(doc(store, charPath), { current_level: 50, notes: "육성" }),
  );
});

test("legacy sparse documents retain IDs and unknown fields through partial writes", async () => {
  const store = db();
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), `${root}/games/v1-random`), {
      name: "원신",
      legacy: "보존",
    });
    await setDoc(doc(context.firestore(), `${root}/characters/v1-char`), {
      name: "구 캐릭터",
      game_id: "v1-random",
    });
  });
  await assertSucceeds(
    updateDoc(doc(store, `${root}/games/v1-random`), {
      display_order: 3,
      deleted_at: "2026-11-02",
    }),
  );
  await assertSucceeds(
    setDoc(
      doc(store, `${root}/games/v1-random`),
      { ...game, id: "v1-random" },
      { merge: true },
    ),
  );
  await assertSucceeds(
    setDoc(
      doc(store, `${root}/characters/v1-char`),
      { ...character, id: "v1-char", game_id: "v1-random" },
      { merge: true },
    ),
  );
  assert.equal(
    (await getDoc(doc(store, `${root}/games/v1-random`))).data().legacy,
    "보존",
  );
});

test("450-document repository-style backup transaction needs no per-document rules lookups", async () => {
  const store = db();
  await assertSucceeds(
    runTransaction(store, async (tx) => {
      const refs = Array.from({ length: 450 }, (_, i) =>
        doc(store, `${root}/games/backup-${i}`),
      );
      await Promise.all(refs.map((ref) => tx.get(ref)));
      refs.forEach((ref) =>
        tx.set(ref, { ...game, id: ref.id, game_id: ref.id }),
      );
    }),
  );
});

for (const user of ["bob", null]) {
  test(`${user ?? "anonymous"} cannot access another user's legacy data or profile`, async () => {
    const store = db(user);
    for (const path of [root, gamePath, charPath]) {
      await assertFails(getDoc(doc(store, path)));
      await assertFails(
        setDoc(doc(store, path), path === root ? { profile } : game),
      );
      await assertFails(deleteDoc(doc(store, path)));
    }
    await assertFails(getDocs(collection(store, `${root}/games`)));
  });
}

test("profile merge preserves server account; client cannot grant privileges or alter account", async () => {
  const store = db();
  await assertSucceeds(
    setDoc(
      doc(store, root),
      { profile: { ...profile, reset_hour: 9 } },
      { merge: true },
    ),
  );
  assert.equal(
    (await getDoc(doc(store, root))).data().account.email,
    "private@example.invalid",
  );
  await assertFails(updateDoc(doc(store, root), { account: {} }));
  await assertFails(updateDoc(doc(store, root), { role: "moderator" }));
  await assertFails(
    updateDoc(doc(store, root), { profile: { ...profile, reset_hour: "9" } }),
  );
  await assertFails(
    updateDoc(doc(store, root), {
      profile: { ...profile, reminders: { ...profile.reminders, daily: 1 } },
    }),
  );
  await assertFails(
    updateDoc(doc(store, root), { profile: { ...profile, user_id: "bob" } }),
  );
  await assertFails(deleteDoc(doc(store, root)));
  await assertSucceeds(
    setDoc(doc(db("new-user"), "users/new-user"), {
      profile: { ...profile, user_id: "new-user" },
    }),
  );
});

test("malformed fields, identity reassignment, module pollution and hard deletes are rejected", async () => {
  const store = db();
  for (const patch of [
    { name: 5 },
    { intensity: "invalid" },
    { quests: {} },
    { parties: "invalid" },
    { display_order: "0" },
    { deleted_at: true },
    { estimated_minutes: -1 },
    { user_id: "bob" },
    { id: "other" },
    { game_id: "other" },
    { created_at: "changed" },
    { current_pity: 99 },
  ]) {
    await assertFails(updateDoc(doc(store, gamePath), patch));
  }
  for (const patch of [
    { current_level: "2" },
    { priority_rank: "invalid" },
    { notes: [] },
    { game_id: "other" },
    { deleted_at: false },
  ]) {
    await assertFails(updateDoc(doc(store, charPath), patch));
  }
  await assertFails(
    setDoc(doc(store, `${root}/games/invalid`), { name: "원신" }),
  );
  await assertFails(
    setDoc(doc(store, `${root}/characters/invalid`), { name: "캐릭터" }),
  );
  await assertFails(deleteDoc(doc(store, gamePath)));
  await assertFails(deleteDoc(doc(store, charPath)));
});

for (const path of publicPaths) {
  test(`${path}: public document/list reads; all client mutations denied`, async () => {
    for (const user of [uid, null]) {
      const store = db(user);
      await assertSucceeds(getDoc(doc(store, path)));
      await assertSucceeds(
        getDocs(collection(store, path.slice(0, path.lastIndexOf("/")))),
      );
      await assertFails(setDoc(doc(store, path), { name: "forged" }));
      await assertFails(updateDoc(doc(store, path), { marker: "forged" }));
      await assertFails(deleteDoc(doc(store, path)));
    }
  });
}

for (const path of privatePaths) {
  test(`${path}: owner-only module reads; server-only writes`, async () => {
    const fullPath = `${root}/${path}`;
    await assertSucceeds(getDoc(doc(db(), fullPath)));
    await assertSucceeds(
      getDocs(collection(db(), fullPath.slice(0, fullPath.lastIndexOf("/")))),
    );
    for (const user of [uid, "bob", null]) {
      const store = db(user);
      if (user !== uid) await assertFails(getDoc(doc(store, fullPath)));
      await assertFails(setDoc(doc(store, fullPath), { amount: 1 }));
      await assertFails(updateDoc(doc(store, fullPath), { marker: "forged" }));
      await assertFails(deleteDoc(doc(store, fullPath)));
    }
  });
}

for (const path of serverPaths) {
  test(`${path}: raw crawl data and identity maps are never client accessible`, async () => {
    for (const user of [uid, null]) {
      const store = db(user);
      await assertFails(getDoc(doc(store, path)));
      await assertFails(setDoc(doc(store, path), { status: "accepted" }));
    }
    const moderator = env
      .authenticatedContext(uid, { moderator: true })
      .firestore();
    await assertFails(updateDoc(doc(moderator, path), { status: "accepted" }));
  });
}

test("unknown paths, namespace roots, extra depths and cross-user lists deny by default", async () => {
  const store = db();
  for (const path of [
    "unknown/doc",
    `${root}/gacha/main`,
    `${root}/hub/main`,
    `${root}/gacha/other/payments/record`,
    `${root}/hub/main/unknown/record`,
    `${root}/gacha/main/unknown/record`,
    `${gamePath}/private/doc`,
    "games/genshin-impact/private/doc",
  ]) {
    await assertFails(getDoc(doc(store, path)));
    await assertFails(setDoc(doc(store, path), { value: true }));
  }
  await assertFails(getDocs(collection(store, "users")));
  await assertFails(
    getDocs(collection(db("bob"), `${root}/gacha/main/payments`)),
  );
});
