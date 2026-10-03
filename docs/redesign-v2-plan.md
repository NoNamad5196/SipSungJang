# SipSungJang V2 구현 계획

## 기준 자료 (2026-09-11 확인)

- 제품: [Notion 재설계 결정](https://app.notion.com/p/35a7cdef782d8178b304ed9fca12bf19). 전체 페이지를 읽었으며 상단의 2026-09-11 결정을 구 v1 설명보다 우선한다.
- UI: [Figma Make SipSungJang, 버전 2](https://www.figma.com/make/e2UYZU2Z4L9JD6tZ92YZqP/SipSungJang). `get_design_context`로 소스 목록 확인, 리소스 읽기는 커넥터 오류로 실패하여 Figma의 코드 다운로드로 실제 App.tsx / index.css / 디자인 명세를 확인했다.
- 기존 구현: git `6d33eff`, Next 16.2.6, Firebase Google redirect Auth, Firestore 사용자별 games/characters. README의 Supabase 설명은 오래됐다.
- 작업 브랜치: `codex/redesign-v2`. 기존 `.claude/` 미추적 파일은 보존한다. v1은 기존 git 이력에 보존한다.

## 영역별 판단

| 판단     | 영역                                                                        | 처리                                                             |
| -------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| KEEP     | Next App Router, Firebase Auth/Firestore, 사용자별 접근, JSON 백업, 기존 ID | 데이터와 로그인 체계 보존                                        |
| REFACTOR | Repository, 로컬 저장, 게임 상태/정렬/주간 태스크, 캐릭터, 파티 메모        | V1 호환 정규화, 공통 게임 ID, 안전한 저장/복원 및 오류 처리      |
| REBUILD  | 화면/내비게이션/카드/진행률/폼                                              | 실제 Figma의 네이비 수첩과 금빛 패널, 5개 화면, 상세/모달/반응형 |
| REMOVE   | 사용하지 않는 Supabase 클라이언트와 의존성, 기본 SVG, 구 UI 컴포넌트        | 구 SQL은 실행하지 않고 역사 자료로 문서에서 안내                 |

## 구현 순서

1. 공통 Game / Franchise / User / UserGame / Profile 계약과 안정적인 카탈로그 식별자. 기존 문서를 보존하는 V1 읽기 어댑터, V2 백업 검증 및 병합 복원.
2. Firebase 유지. 로그인 없이 쓸 수 있는 명시적 로컬 수첩과 별도 예시 수첩. 클라우드/로컬 데이터 자동 혼합 금지.
3. Figma 공통 토큰/패널/내비게이션으로 오늘의 여정, 주간 로드맵, 캐릭터, 파티, 설정, 게임 상세 및 편집 모달 구현.
4. 실제 CRUD, 퀘스트 진행/완료 취소, 육성/파티/목표/접속일/정렬/프로필 저장, 오류/빈 상태/로딩 구현.
5. 개발 서버 실행 후 원본 Figma와 데스크톱/태블릿/모바일 비교. 핵심 브라우저 흐름과 데이터 보존/백업/실패 경로 테스트.
6. TypeScript, lint, production build 확인 및 README/공통 모델/QA 결과 문서 갱신.

## 보존 및 구현 원칙

- Production DB migration, rules 배포, 외부 배포는 실행하지 않는다.
- `users/{uid}/games/{legacyId}`와 캐릭터의 기존 참조를 유지하고 공통 `game_id`를 추가한다. 공통 카탈로그는 단일 코드 레지스트리로 시작하며 다른 서비스는 같은 ID 계약을 사용한다.
- Figma가 구현하지 않은 폼/상태/모바일은 원본 명세와 시각 토큰으로 확장한다. 잘못된 고정 날짜/초기화 시간/가짜 저장 버튼은 실제 데이터와 동작으로 대체한다.
- 기존 파티/일반 메모와 주간 완료 여부를 보존한다. 대체 저장은 성공 응답 후 UI에 반영하며 백업 복원은 검증 후 병합한다.
