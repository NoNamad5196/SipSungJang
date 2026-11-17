# SipSungJang V2 — 나의 모험 수첩

“이번 주에 어떤 게임을 얼마나 챙겨야 하지?” 여러 라이브서비스 게임의 플레이 우선순위, 퀘스트, 캐릭터 성장과 파티를 정리하는 한국어 수첩입니다.

## 실행

Node.js 20.9 이상과 npm을 사용합니다.

```sh
npm ci
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 **이 기기에서 새 수첩 열기** 또는 **예시 수첩 둘러보기**를 선택하세요. Firebase 설정 없이도 실제 저장과 모든 관리 기능을 사용할 수 있습니다. 예시 데이터는 별도 저장소를 사용합니다. 기기 수첩은 브라우저·접속 주소별로 구분되므로 정기적으로 JSON 백업을 내려받으세요.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

## 제공 기능

- 오늘의 여정: 게임 등록·수정·삭제, 메인/서브/접속만/휴식/방치, 순서 변경, 우선 처리 정도와 플레이 시간.
- 퀘스트: 일일/주간/이벤트 생성·수정·삭제, 수량 진행도, 완료·취소, 선택적 마감일.
- 게임 상세: 다음 목표, 접속일 기록, 일반 메모, 캐릭터, 파티. 일일·주간 진행도는 직접 다시 시작하며 이벤트는 유지합니다.
- 주간 로드맵: 전체 완료율, 활동 중인 게임의 예상 시간, 상태 필터와 게임별 퀘스트.
- 캐릭터 육성: 우선순위, 속성/역할, 현재·목표 레벨과 육성 단계, 메모.
- 파티: 게임마다 여러 조합, 1–8개 슬롯, 캐릭터 선택과 조합 메모. 기존 자유 형식 파티 메모도 보존합니다.
- 설정: 닉네임, 한국 시간 기준 주간 갱신 요일·시간, 수첩 안 알림, 서비스 런처, V1/V2 백업 병합.
- 데스크톱·태블릿·모바일, 빈 상태·로딩·저장 오류·입력 검증과 키보드 접근 가능한 대화상자.

## Firebase 계정 수첩

기존 Firebase Auth/Firestore를 유지하며, SipSungJang·OtakuHub·GachaGuard 세 서비스가 동일한 Firebase 프로젝트와 Google Auth `users/{uid}` 계정을 공유합니다. Supabase로 이전하지 않습니다.

1. `.env.example`을 `.env.local`로 복사하고 기존 Firebase 웹 앱 설정을 넣습니다.
2. 해당 Firebase 프로젝트에서 Google 로그인과 실행/배포 도메인을 설정합니다.
3. [OtakuS Firestore 계약 v1](docs/otakus-firestore-contract.md)을 기준으로 작성된 `firestore.rules`와 `firestore.indexes.json`이 본인의 `users/{uid}`(하위 `games`, `characters`, `gacha/main/*`, `hub/main/*`, `userFranchises`, `agentSignals`) 및 공개 카탈로그·일정(`games`, `franchises`, `events`) 접근 권한을 제어합니다. 로컬 에뮬레이터 규칙 검증은 `npm run test:rules`로 실행하며, 프런트엔드의 UID 검사만으로 보안 규칙을 대체할 수 없습니다.
4. Google 로그인으로 기존 계정 기록을 엽니다. 기기 기록은 자동 업로드하지 않습니다. 필요한 기록만 백업 가져오기로 추가합니다.

현재 작업에서는 운영 DB와 배포 설정을 변경하지 않았습니다. 실제 계정 로그인·Firestore 읽기/쓰기와 보안 규칙 배포는 별도 검증 대상입니다. 과거 `supabase/migrations/001_initial.sql`은 역사 자료이며 V2 설치 절차에서 실행하지 않습니다.

## 공통 도메인과 연결 서비스

`src/types/index.ts`의 User / GameMaster / Franchise / UserGame / UserProfile과 [docs/otakus-firestore-contract.md](docs/otakus-firestore-contract.md)가 SipSungJang, OtakuHub, GachaGuard 세 앱의 공통 데이터 계약(OtakuS Firestore Contract v1)입니다. `src/lib/catalog.ts`가 게임 ID의 단일 원본이며 공개 읽기 전용 `/api/catalog`로 제공합니다. 예를 들어 원신은 세 서비스 모두 `genshin-impact`를 사용합니다. 개인정보는 이 API에 포함하지 않습니다.

`NEXT_PUBLIC_OTAKUHUB_URL`, `NEXT_PUBLIC_GACHAGUARD_URL`에 실제 HTTPS 주소를 넣고 다시 빌드하면 사이드바와 설정 화면의 서비스 런처 링크가 활성화됩니다. 미설정 주소는 **연결 준비 중**으로 표시합니다. 두 서비스는 각각 이벤트/일정, 소비/예산을 담당하며 프런트엔드는 독립 저장소로 유지합니다.

## 문서와 후속 작업

- [OtakuS Firestore 계약 v1](docs/otakus-firestore-contract.md)
- [구현 계획과 재사용 판단](docs/redesign-v2-plan.md)
- [공통 모델·V1 호환·백업 정책](docs/shared-domain.md)
- [Figma 비교와 테스트 결과](docs/redesign-v2-qa.md)

후속 작업: 두 서비스의 실제 URL과 공통 Firebase UID 연결, 승인된 테스트 계정에서 OAuth/Firestore·보안 규칙 검증, 여러 기기 동시 편집 충돌 처리, 게임별 자동 갱신·이력, 푸시 알림, 확장 카탈로그 운영. 현재 주간 집계는 저장된 퀘스트 목록 기준이며 과거 주차 이력은 제공하지 않습니다.

## 구현 기준

[Notion 2026-09-11 재설계 결정](https://app.notion.com/p/35a7cdef782d8178b304ed9fca12bf19)과 [최신 Figma Make V2](https://www.figma.com/make/e2UYZU2Z4L9JD6tZ92YZqP/SipSungJang)을 직접 확인했습니다. Next.js 16.2.6 / React 19 / TypeScript / Tailwind 4 / Firebase / Radix Dialog를 사용합니다. 폰트는 Google Fonts의 Cinzel, Noto Serif KR, Noto Sans KR, JetBrains Mono를 사용하며 연결 불가 시 시스템 폰트로 대체됩니다.
