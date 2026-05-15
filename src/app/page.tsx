"use client";

import { useState } from "react";
import { signInWithPopup, signInWithRedirect, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

type State = "idle" | "loading" | "popup-blocked";

export default function LoginPage() {
  const [state, setState] = useState<State>("idle");

  async function handleLogin() {
    setState("loading");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      // 성공 시 AuthProvider가 /dashboard로 이동
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user") {
        setState("popup-blocked");
      } else {
        setState("idle");
      }
    }
  }

  async function handleRedirectLogin() {
    setState("loading");
    await signInWithRedirect(auth, new GoogleAuthProvider());
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-sm w-full">
        <div className="text-6xl">🎮</div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">씹성장</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            다중 가챠 게임 통합 로드맵
          </p>
        </div>

        {state !== "popup-blocked" ? (
          <button
            onClick={handleLogin}
            disabled={state === "loading"}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-medium text-white border transition-colors hover:border-purple-500/50 disabled:opacity-50"
            style={{ borderColor: "var(--card-border)", background: "var(--card)" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
            {state === "loading" ? "로그인 중..." : "Google로 로그인"}
          </button>
        ) : (
          <div
            className="rounded-xl border p-4 space-y-4 text-left"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
          >
            <p className="text-sm font-medium text-white">팝업이 차단됐어요</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
              주소창 오른쪽 끝에 있는 팝업 차단 아이콘(🚫)을 클릭하고
              <br />
              <strong className="text-white">"sipsungjang.vercel.app의 팝업 항상 허용"</strong>을 선택한 뒤 다시 시도해 주세요.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleLogin}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-80"
                style={{ background: "var(--accent)" }}
              >
                다시 시도
              </button>
              <button
                onClick={handleRedirectLogin}
                className="flex-1 py-2 rounded-lg text-sm border transition-colors hover:border-purple-500/50"
                style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
              >
                페이지 이동 방식
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
