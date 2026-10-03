import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { JournalShell } from "@/components/JournalShell";
export const metadata: Metadata = {
  title: "SipSungJang — 나의 모험 수첩",
  description:
    "이번 주에 어떤 게임을 얼마나 챙겨야 하지? 여러 게임의 퀘스트, 캐릭터 육성, 파티를 한 권의 수첩에.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          <JournalShell>{children}</JournalShell>
        </AuthProvider>
      </body>
    </html>
  );
}
