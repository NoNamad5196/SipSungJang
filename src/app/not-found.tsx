import Link from "next/link";
export default function NotFound() {
  return (
    <div className="panel empty-state">
      <span className="empty-symbol">◇</span>
      <h1>아직 발견하지 못한 길이에요</h1>
      <p>페이지 주소를 확인하거나 오늘의 여정으로 돌아가세요.</p>
      <Link href="/dashboard" className="button primary">
        오늘의 여정으로
      </Link>
    </div>
  );
}
