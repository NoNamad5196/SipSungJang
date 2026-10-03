"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="panel empty-state" role="alert">
      <span className="empty-symbol">◇</span>
      <h2>수첩을 펼치지 못했어요</h2>
      <p>잠시 후 다시 시도해 주세요. 저장된 기록은 유지됩니다.</p>
      <button className="button primary" onClick={reset}>
        다시 펼치기
      </button>
      <Link href="/settings">기록 보관함으로</Link>
    </div>
  );
}
