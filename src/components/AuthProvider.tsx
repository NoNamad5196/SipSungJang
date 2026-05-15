"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    // authStateReady(): 리다이렉트 결과 처리 포함, 인증 초기화가 완전히 끝날 때까지 대기
    auth.authStateReady().then(() => {
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
    });

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
