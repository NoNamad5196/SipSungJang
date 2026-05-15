"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    async function init() {
      // 1) Firebase 초기화 대기
      await auth.authStateReady().catch(() => {});
      // 2) 팝업이 내부적으로 리다이렉트로 전환된 경우 결과 처리
      await getRedirectResult(auth).catch(() => {});

      if (!active) return;

      unsubscribe = onAuthStateChanged(auth, (user) => {
        if (!active) return;
        if (!user && pathname !== "/") {
          router.replace("/");
        } else if (user && pathname === "/") {
          router.replace("/dashboard");
        } else {
          setReady(true);
        }
      });
    }

    init();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [pathname]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: "var(--muted)" }}>로딩 중...</p>
      </div>
    );
  }

  return <>{children}</>;
}
