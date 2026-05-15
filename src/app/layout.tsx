import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <title>씹성장 — 다중 가챠 게임 로드맵</title>
        <meta name="description" content="여러 가챠 게임을 병행하는 사람을 위한 통합 성장 로드맵 툴" />
      </head>
      <body>{children}</body>
    </html>
  );
}
