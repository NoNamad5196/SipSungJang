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
    return onAuthStateChanged(auth, (user) => {
      if (!user && pathname !== "/") {
        router.replace("/");
      } else if (user && pathname === "/") {
        router.replace("/dashboard");
      } else {
        setReady(true);
      }
    });
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
