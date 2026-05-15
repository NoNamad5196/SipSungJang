"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-3xl font-bold text-white mb-2">씹성장</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            여러 가챠 게임을 한 곳에서 관리하는 개인용 성장 로드맵 툴
          </p>
        </div>

        {sent ? (
          <div
            className="rounded-xl p-6 text-center border"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
          >
            <div className="text-3xl mb-3">📬</div>
            <p className="text-white font-medium mb-1">메일을 확인하세요!</p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {email} 으로 로그인 링크를 보냈습니다.
            </p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-medium text-white transition-opacity disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              {loading ? "보내는 중..." : "매직 링크로 로그인"}
            </button>

            <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
              계정이 없어도 이메일만 입력하면 자동으로 가입됩니다.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
