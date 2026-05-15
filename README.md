# 🎮 씹성장 (SipSungJang)

여러 가챠 게임을 병행하는 사람을 위한 **통합 성장 로드맵 툴**.

빡겜러가 아니라 라이트 유저 기준으로, 10~20개 가까이 되는 가챠/수집형 게임을 가볍게 관리하면서 _"지금 이 게임에서 뭘 하면 되는지"_ 를 기억해주는 개인용 게임 성장 비서.

---

## 주요 기능

- **게임 카드**: 플레이 강도(🔥 메인 / 🌤 서브 / ❄️ 냉동 / 🪦 방치)로 게임 분류
- **이번 주 할 일**: 게임별 주간 태스크 관리
- **캐릭터 우선순위**: 1순위·2순위·보류·애정캐·투자 손해 분류
- **파티 메모**: 게임마다 다른 파티 구조를 자유 형식으로 기록
- **주간 로드맵 뷰**: 전체 게임의 이번 주 할 일을 한 화면에서 확인

---

## 기술 스택

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Auth)
- **배포**: Vercel

---

## 로컬 실행 방법

### 1. 저장소 클론

```bash
git clone https://github.com/NoNamad5196/SipSungJang.git
cd SipSungJang
npm install
```

### 2. Supabase 프로젝트 설정

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/001_initial.sql` 실행
3. Authentication > URL Configuration에서 Site URL을 `http://localhost:3000`으로 설정

### 3. 환경변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 열고 Supabase 프로젝트의 URL과 anon key를 입력:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 열기

---

## Vercel 배포

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Vercel에 GitHub 저장소 연결
2. Environment Variables에 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 추가
3. Supabase Authentication > URL Configuration에 Vercel 배포 URL 추가
