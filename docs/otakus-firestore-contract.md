# OtakuS Firestore 계약 v1

세 앱은 **SipSungJang의 한 Firebase 프로젝트 / Google Auth UID**를 사용한다.
저장소·Vercel 배포는 별개이며 공용 npm 패키지, Supabase, Cloud Functions는 사용하지 않는다.
이 변경은 계약·로컬 규칙·테스트만 추가한다. 앱 전환, 데이터 이관, 운영 규칙 배포는 하지 않는다.

## 경로와 접근 권한

`S`=SipSungJang, `G`=GachaGuard, `H`=OtakuHub. `서버`는 해당 앱의 Vercel Node 런타임 `firebase-admin`이다.
**규칙은 앱 출처를 식별하지 않는다.** 아래 앱 표시는 책임 분담이며 앱별 보안 경계는 아니다.
Admin SDK는 규칙을 우회하므로 모든 서버 요청은 Firebase ID token/세션 쿠키 검증 후 UID를 결정하고,
입력 UID를 신뢰하지 않으며 필드·참조 소유권을 재검증해야 한다. 검수는 서버에서 검증한 moderator custom claim이 필요하다.

```text
Firebase Auth/{uid}                         # Account 원본 (Google provider)
users/{uid}                                # profile + 서버 관리 account 미러
  games/{entryId}                           # 공통 UserGame + 기존 S 확장 (이동 금지)
  characters/{id}                           # 기존 S 캐릭터 (이동 금지)
  userFranchises/{franchiseId}               # 공통 관심 관계
  gacha/main                                # 네임스페이스 문서 자체는 저장하지 않음
    settings/{id}                          # id = preferences
    gameStates/{entryId}
    budgets/{YYYY-MM}
    payments/{paymentId}
    paymentTemplates/{id}
    banners/{bannerId}                      # 개인 배너만
    userBanners/{trackingId}
    pullSessions/{sessionId}
    pulls/{pullId}
    gachaLogs/{id}
    guardrailRules/{id}
  hub/main                                  # 네임스페이스 문서 자체는 저장하지 않음
    userEvents/{eventId}
    collections/{id}
    reminders/{id}
  agentSignals/{signalId}
games/{gameId}                              # 공통 GameMaster
franchises/{franchiseId}                     # 공통 IP (게임과 별개)
events/{eventId}                             # 승인·공개된 일정만
modules/gacha/gameConfigs/{gameId}           # G 전용 마스터 설정
modules/gacha/banners/{bannerId}             # 공개 배너만
modules/hub/crawlSources/{id}
modules/hub/crawledPosts/{postId}
modules/hub/eventSuggestions/{suggestionId}  # 미승인/반려 자료 포함
modules/hub/crawlRuns/{id}
identityMappings/{id}                       # 서버 전용 이관 연결표
```

| 경로                                                 | 클라이언트 읽기 / 쓰기  | 앱 R / W 책임                            |
| ---------------------------------------------------- | ----------------------- | ---------------------------------------- |
| `users/{uid}`                                        | 본인 / 본인 profile만   | S,G,H / S,G,H (account는 서버만)         |
| 개인 `games`                                         | 본인 / 본인 (타입 검사) | S,G,H / S 및 G,H 서버 (공통 필드만 병합) |
| 개인 `characters`                                    | 본인 / 본인 (타입 검사) | S / S                                    |
| 개인 `userFranchises`                                | 본인 / 서버만           | S,G,H / H 서버                           |
| 개인 `gacha/main/*`                                  | 본인 / 서버만           | G / G 서버                               |
| 개인 `hub/main/*`                                    | 본인 / 서버만           | H / H 서버                               |
| 개인 `agentSignals`                                  | 본인 / 서버만           | S,G,H / 인증된 수신 앱 서버              |
| `games`, `franchises`                                | 공개 / 서버만           | S,G,H / 카탈로그 관리 서버               |
| `events`                                             | 공개 / 서버만           | S,G,H / H 검수 서버                      |
| `modules/gacha/gameConfigs`, `modules/gacha/banners` | 공개 / 서버만           | G / G 관리 서버                          |
| `modules/hub/*`                                      | 서버만 / 서버만         | H 검수·크롤 서버                         |
| `identityMappings`                                   | 서버만 / 서버만         | 각 앱 이관 서버                          |

목록에 없는 경로·하위 컬렉션은 기본 거부한다. 개인 모듈도 브라우저 직접 쓰기는 금지한다.
이는 기존 G Server Actions / H Route Handler 구조와 맞으며, 집계·검수·중복 방지를 클라이언트가 우회하지 못하게 한다.
크롤 원문/후보는 로그인만으로 공개하지 않는다. `events`에는 비공개 초안·raw AI·사용자 메모를 넣지 않는다.

## 타입과 문서 필드

기존 필드명(snake_case)을 유지한다. `s`=string, `n`=유한 number, `i`=integer,
`b`=boolean, `t`=Firestore Timestamp, `d`=실제 유효한 `YYYY-MM-DD` string,
`?T`=T 또는 null, `T[]`=배열. 아래 필드는 기본 필수이며 `선택`만 생략 가능하다.
새 서버 문서는 `schema_version: 1`, `created_at:t`, `updated_at:t`를 공통으로 가진다
(crawledPosts/crawlRuns도 포함). `id`는 문서 ID로 유도하며 중복 저장하지 않는다.
이 공통 메타데이터는 **기존 개인 games/characters/profile에 추가하거나 변환하지 않는다**.
서버는 스키마 allowlist, enum/범위, 날짜 순서, 참조 존재와 UID를 검사한다. Firestore에는 SQL FK/UNIQUE/trigger가 없다.

### 공통 및 S 호환 영역

| 문서                        | 필드                                                                                                                                                                                                                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users/{uid}`               | `profile:UserProfile` (기존), `account` 선택: `{email:?s, avatar_url:?s, providers:s[], created_at:t, updated_at:t}` 서버 미러. 권한은 여기에 저장하지 않고 검증된 Auth claim 사용                                                                                                                                                        |
| `UserProfile`               | `user_id:s` (=uid), `display_name:s`, `timezone:'Asia/Seoul'`, `reset_day:i` (0~~6), `reset_hour:i` (0~~23), `reminders:{weekly:b,events:b,daily:b}`                                                                                                                                                                                      |
| `franchises/{id}`           | `name:s`, `slug:s` (=id), `category:'game'\|'anime'\|'vtuber'\|'idol'\|'other'`, `color_code:s`, `icon_url:?s`, `aliases:s[]`                                                                                                                                                                                                             |
| `games/{gameId}`            | `name:s`, `aliases:s[]`, `franchise_id:?s`, `color:s`; gacha pity·예산·성장·크롤 필드 **금지**                                                                                                                                                                                                                                            |
| 개인 `games/{entryId}` 공통 | `id:s` (=entryId), `user_id:s` (=uid), `game_id:s` (=GameMaster ID), `intensity:'main'\|'sub'\|'login-only'\|'frozen'\|'abandoned'`, `last_access:?s`, `display_order:n`, `created_at:s`, `updated_at:s` (기존 ISO 문자열)                                                                                                                |
| 개인 `games` S 확장         | `name:s`, `icon:?s`, `current_goal:?'story'\|'gear-farming'\|'character-leveling'\|'currency-saving'\|'event-only'\|'rest'`, `weekly_tasks:s[]`, `weekly_tasks_done:b[]`, `quests:Quest[]`, `next_goal:?s`, `urgency:'high'\|'medium'\|'low'`, `party_memo:?s`, `memo:?s`, `estimated_minutes:n`, `parties:Party[]`, `deleted_at:?s` 선택 |
| `Quest`                     | `id:s,label:s,current:n,total:n,type:'daily'\|'weekly'\|'event',deadline:?d,done:b`                                                                                                                                                                                                                                                       |
| `Party`                     | `id:s,name:s,slots:(s\|null)[],notes:s` (slots 최대 8)                                                                                                                                                                                                                                                                                    |
| 개인 `characters/{id}`      | `id:s`, `game_id:s` (**entryId**), `name:s`, `priority_rank:'priority1'\|'priority2'\|'on-hold'\|'favorite'\|'bad-investment'\|'complete'`, `notes:?s`, `created_at:s`, `element:s`, `current_level:n`, `target_level:n`, `completed_nodes:n`, `total_nodes:n`, `deleted_at:?s` 선택                                                      |
| 개인 `userFranchises/{id}`  | `franchise_id:s` (=문서 ID), `priority:i` (1~3), `nickname:?s`                                                                                                                                                                                                                                                                            |
| `identityMappings/{id}`     | `source:'gachaguard'\|'otakuhub'`, `entity:'account'\|'game'\|'franchise'\|'userGame'`, `source_id:s`, `target_id:s`, `uid:?s`, `verified_at:t`                                                                                                                                                                                           |

S의 성장 확장을 기존 UserGame에 둔 것은 **호환 예외**다. 공통 소비자는 `toSharedUserGame()` 투영만 사용한다.
새 모듈 데이터는 이 문서나 전역 masters에 추가하지 않는다. G/H 서버가 UserGame을 만들 때 S의
`normalizeGame()`과 동등한 기본값을 넣고 기존 문서는 공통 필드만 merge한다. 일괄 재작성은 금지한다.
규칙은 신규 S 문서의 필수 identity/name을 검사하고, 업데이트는 변경된 알려진 필드의 타입을 검사하여
V1의 누락 필드·알 수 없는 보존 필드가 정렬/soft delete를 막지 않게 한다. 기존 알 수 없는 필드는 변경 불가다.
배열은 rules에서 **list 컨테이너 타입만** 검사한다 (모든 원소 순회 불가). Quest/Party/배열 원소 정규화는 기존 S model이 담당한다.
참조 get을 매 쓰기마다 하지 않아 기존 450문서 백업 트랜잭션의 rules 접근 한도를 소비하지 않는다.
클라이언트 hard delete는 금지하며 현재 soft delete/복원/merge/정렬/백업 추가 동작을 유지한다.

### GachaGuard 네임스페이스

아래 개인 참조 `user_game_id`는 항상 **같은 UID의 entryId**다. user_id는 경로에서 유도한다.

| 문서                                 | 필드 (공통 메타데이터 외)                                                                                                                                                                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/gacha/gameConfigs/{gameId}` | `game_id:s`, `developer:?s`, `genre:?s`, `soft_pity:?i` (≥0), `hard_pity:?i` (>0), `base_cost:i` (≥0), `has_guarantee:b`                                                                                                                                                                    |
| 개인 `settings/preferences`          | `session_warning_amount:i` (≥0)                                                                                                                                                                                                                                                             |
| 개인 `gameStates/{entryId}`          | `user_game_id:s`, `game_id:s`, `nickname:?s`, `current_pity:i`, `monthly_budget:i` (각 ≥0), `warning_threshold_percent:i` (1~100), `is_active:b`, `revision:i`, `last_user_banner_id:?s`                                                                                                    |
| 개인 `budgets/{YYYY-MM}`             | `year_month:s` (=ID), `total_budget:i` (≥0), `warning_at:i` (1~100)                                                                                                                                                                                                                         |
| 공개/개인 `banners/{bannerId}`       | `game_id:s`, `name:s`, `banner_type:'character'\|'weapon'\|'standard'\|'event'`, `featured:s`, `starts_at:t`, `ends_at:t`, `soft_pity:?i`, `hard_pity:i` (>0), `base_rate:n` (0~~1, 0 제외), `rate_up:n` (0~~1), `is_active:b`, `is_public:b`, `created_by:?s`, `source:s`, `source_url:?s` |
| 개인 `userBanners/{trackingId}`      | `user_game_id:s`, `game_id:s`, `banner_id:s`, `banner_scope:'public'\|'private'`, `initial_pity:i`, `current_pity:i`, `pulls_total:i`, `pulls_5_star:i` (각 ≥0), `is_tracking:b`, `revision:i`                                                                                              |
| 개인 `pullSessions/{sessionId}`      | `user_banner_id:s` (trackingId), `user_game_id:s`, `pulls_count:i` (>0), `total_cost:i` (≥0), `currency:s`, `memo:?s`, `pulled_at:t`                                                                                                                                                        |
| 개인 `pulls/{pullId}`                | `pull_session_id:s`, `user_banner_id:s`, `user_game_id:s`, `pull_number:i` (>0), `pity_before:i` (≥0), `rarity:i` (3~5), `item_name:?s`, `cost:i` (≥0), `is_rate_up:?b`, `pulled_at:t`                                                                                                      |
| 개인 `payments/{paymentId}`          | `user_game_id:s`, `amount:i` (>0), `type:'gacha'\|'pass'\|'coin'\|'event'\|'other'`, `paid_at:t`, `memo:?s`, `regret_score:?i` (1~5), `source:s`, `external_order_id:?s`, `import_fingerprint:?s`, `merchant:?s`, `raw_description:?s`, `currency:s` (ISO 4217 3대문자), `imported_at:?t`   |
| 개인 `paymentTemplates/{id}`         | `user_game_id:s`, `name:s`, `amount:i` (>0), `type` (payment enum), `day_of_month:i` (1~28), `is_active:b`, `last_applied_year_month:?s`                                                                                                                                                    |
| 개인 `gachaLogs/{id}`                | `user_game_id:s`, `pulls:i` (>0), `result:?s`, `pity_at_pull:i` (≥0), `pulled_at:t` (상세 pulls와 별도 레거시 로그)                                                                                                                                                                         |
| 개인 `guardrailRules/{id}`           | `kind:'warning'\|'hard_stop'\|'cooldown'\|'daily_cap'`, `name:s`, `threshold_amount:?i` (≥0), `threshold_percent:?i` (1~~200), `cooldown_days:?i` (1~~30), `enabled:b`                                                                                                                      |

공개 배너는 `is_public=true, created_by=null`, 개인 배너는 `false, created_by=uid`.
개인 배너를 공개 경로에 복사하지 않는다. `gameStates.current_pity`는 마지막 변경 tracking의 표시용 캐시이며
서로 다른 banner의 pity를 합산하지 않는다. 진실 원본은 해당 tracking의 initial_pity + 순서 있는 pulls다.

### OtakuHub 및 Agent

| 문서                                          | 필드 (공통 메타데이터 외)                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `events/{eventId}`                            | `franchise_id:s`, `game_id:?s`, `type:EventType`, `title:s`, `start_date:d`, `end_date:?d` (포함 종료일), `timezone:'Asia/Seoul'`, `location:?s`, `source_url:?s`, `status:'published'\|'cancelled'`, `is_verified:true`, `reviewed_by:s`, `reviewed_at:t`, `moderation_reason:s`, `suggestion_id:?s`, `crawled_post_id:?s`                          |
| 개인 `userEvents/{eventId}`                   | `event_id:s` (=ID), `remind_days:i[]` (각 0~30), `is_attending:b`, `memo:?s`                                                                                                                                                                                                                                                                         |
| 개인 `collections/{id}`                       | `event_id:?s`, `franchise_id:?s`, `game_id:?s`, `item_name:s`, `price:i` (≥0), `currency:s`, `is_wishlist:b`, `bought_at:?t`, `image_url:?s`, `memo:?s` (예약 상태는 기존처럼 추정, 새 status 발명 안 함)                                                                                                                                            |
| 개인 `reminders/{id}`                         | `event_id:s`, `remind_at:t`, `status:'pending'\|'sent'\|'dismissed'` (sent는 실제 전달 성공 시만)                                                                                                                                                                                                                                                    |
| `modules/hub/crawlSources/{id}`               | `franchise_id:?s`, `game_id:?s`, `source_type:'naver_lounge'\|'dc'\|'official'`, `name:s`, `url:s`, `keywords:s[]`, `is_active:b`, `last_crawled_at:?t`, `last_error:?s`, `created_by:?s`                                                                                                                                                            |
| `modules/hub/crawledPosts/{postId}`           | `franchise_id:?s`, `crawl_source_id:?s`, `source` (source_type enum), `title:s`, `content:s`, `original_url:s`, `content_hash:s`, `event_id:?s`, `crawled_at:t`                                                                                                                                                                                      |
| `modules/hub/eventSuggestions/{suggestionId}` | `crawled_post_id:?s`, `content_hash:?s`, `franchise_id:?s`, `game_id:?s`, `title:s`, `event_type:EventType`, `start_date:d`, `end_date:?d`, `location:?s`, `source_url:s`, `confidence:n` (0~1), `warnings:s[]`, `status:'pending'\|'accepted'\|'ignored'`, `raw_ai:?map`, `reviewed_by:?s`, `reviewed_at:?t`, `moderation_reason:?s`, `event_id:?s` |
| `modules/hub/crawlRuns/{id}`                  | `source_id:?s`, `status:'success'\|'partial'\|'failed'`, `posts_found:i`, `suggestions_created:i` (각 ≥0), `error:?s`, `started_at:t`, `finished_at:t`                                                                                                                                                                                               |
| 개인 `agentSignals/{signalId}`                | `kind:'game_started'\|'game_stopped'\|'manual_sync'\|'spending_alert'`, `source_app:'sipsungjang'\|'gachaguard'\|'otakuhub'`, `game_id:?s`, `user_game_id:?s`, `occurred_at:t`, `received_at:t`, `expires_at:t`, `message:?s`, `amount:?i`, `currency:?s`                                                                                            |

`EventType` = goods_release / preorder / cafe / popup / concert / broadcast / birthday / other.
Agent에는 raw process list·실행 파일 경로·토큰·메일 영수증 원문을 저장하지 않는다.
G/H의 기존 무소유 공통 Agent token은 폐기 대상이다. 사용자별 동의와 UID에 묶인 인증·해지를 서버가 검증하고
토큰 미설정은 거부한다. signal은 알림/힌트이며 결제 원장이나 검수 권한의 증거가 아니다.

## 식별자와 이관 매핑

- `games/{gameId}`는 `src/lib/catalog.ts`의 `genshin-impact`, `honkai-star-rail` 등 고정 ID 그대로다.
  미등록 게임은 기존 NFKC → en 소문자 → 공백/`:：·._-` 제거 → **UTF-8 hex** `custom-<hex>` 그대로다 (hash 아님).
  자동 재명명/별칭 추정 병합 금지. 커스텀 ID가 Firestore 문서 ID 1,500 byte 한도를 넘으면 서버에서 거부한다.
- `franchises`는 기존 `genshin`, `honkai` 등을 보존한다. 새 IP는 검수된 고정 slug.
  Hub의 `category=game` UUID는 게임 자체가 아니다. GameMaster + 상위 Franchise에 각각 명시적으로 매핑하며
  하나의 Franchise에 여러 Game이 가능하다. 알 수 없는 매핑은 검토 대기, 임의로 같은 이름을 합치지 않는다.
- 기존 `users/{uid}/games/{entryId}`와 characters ID는 **절대로 변경하지 않는다**.
  신규 UserGame은 gameId를 entryId로 사용하되, 동일 game_id의 기존 entry가 있으면 그 ID를 사용한다.
  신규 등록은 해당 gameId 문서를 트랜잭션으로 점검한다. 레거시 중복은 자동 삭제하지 않는다.
- Supabase UUID는 Firebase UID가 아니다. 사용자가 양쪽 계정 소유를 인증한 뒤 승인한 연결표를 사용한다.
  이메일 일치만으로 통합 금지. identityMappings ID = SHA-256(UTF-8 JSON 배열 `[source,entity,source_id,uid]`) hex.
  전역 매핑 uid는 null. 사용자 연결표는 공개하지 않는다.
- 일반 새 문서 ID는 auto ID, 이관 UUID는 충돌 없으면 유지. trackingId는 `public-<bannerId>` / `private-<bannerId>`.
  pullId=`<sessionId>-<pull_number>` (세션 내 중복 방지). signalId는 수신 서버가 검증한 request UUID (UID별 재시도 멱등).
  공개/개인 신규 배너 ID는 SHA-256(JSON `[game_id,name,ends_at ISO UTC]`) hex, 경로로 소유 범위 분리.

| 원본 앱 / Supabase table                      | Firestore 대상                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| G,H `profiles`                                | `users/{uid}.profile` + `.account`; G session_warning_amount → `gacha/main/settings/preferences` |
| G `games`                                     | 공통 `games/{gameId}` + G 전용 `modules/gacha/gameConfigs/{gameId}` (slug→고정 ID 매핑)          |
| G `user_games`                                | 개인 `games/{entryId}` 공통 투영 + `gacha/main/gameStates/{entryId}` (예산/pity/nickname/active) |
| G `budgets`                                   | 개인 `gacha/main/budgets/{year_month}`                                                           |
| G `payments`                                  | 개인 `gacha/main/payments/{paymentId}`                                                           |
| G `payment_templates`                         | 개인 `gacha/main/paymentTemplates/{id}`                                                          |
| G `banners`                                   | 공개 → `modules/gacha/banners/{id}`; 개인 → 본인 `gacha/main/banners/{id}`                       |
| G `user_banners`                              | 개인 `gacha/main/userBanners/{trackingId}`                                                       |
| G `pull_sessions` / `pulls`                   | 개인 `gacha/main/pullSessions/{id}` / `pulls/{pullId}`                                           |
| G `gacha_logs` / `guardrail_rules`            | 개인 `gacha/main/gachaLogs/{id}` / `guardrailRules/{id}`                                         |
| H `franchises`                                | `franchises/{id}`; category=game은 `games/{gameId}`도 연결 (공개 적합 자료만)                    |
| H `user_franchises`                           | 개인 `userFranchises/{franchiseId}` (게임 관심은 UserGame 참조도 해석)                           |
| H `events`                                    | 재검수된 공개 일정만 `events/{id}`; 미검증 자료는 `modules/hub/eventSuggestions/{id}`            |
| H `user_events` / `collections` / `reminders` | 개인 `hub/main/userEvents/{eventId}` / `collections/{id}` / `reminders/{id}`                     |
| H `crawl_sources` / `crawled_posts`           | `modules/hub/crawlSources/{id}` / `crawledPosts/{postId}`                                        |
| H `event_suggestions` / `crawl_runs`          | `modules/hub/eventSuggestions/{id}` / `crawlRuns/{id}`                                           |
| H 메모리 activity / spending alerts           | 본인 `agentSignals/{signalId}` (기존 휘발 데이터는 복구 보장 없음)                               |

## 원자성·조회·비정규화

- **결제 import:** `paymentId = 'import-' + SHA-256(UTF-8 import_fingerprint)` hex.
  지문 생성 알고리즘은 기존 G import를 유지하며 game/금액 수정에도 ID를 바꾸지 않는다.
  UID별 경로에서 트랜잭션 get→없을 때만 create; 기존 지문을 비교해 재시도 skip, hash 충돌/불일치는 오류.
  수동 결제는 auto ID, 월 반복은 `template-<templateId>-<YYYY-MM>`와 template last_applied 갱신을 한 transaction으로 처리한다.
- **pity:** 세션·pull 변경·tracking summary·gameStates 캐시는 같은 서버 transaction으로 쓴다.
  모든 mutation이 같은 tracking `revision`을 읽고 증가시켜 동시 작업을 직렬화한다.
  `(pulled_at, pull_session_id, pull_number)` 순으로 initial_pity에서 재계산, 5성에서 0으로 초기화한다.
  과거 결과 수정/삭제 시 후속 pity_before·세션 count/cost·summary도 재계산한다.
  큰 히스토리는 전체를 한 요청에 다시 쓰지 않고 재계산 중 상태를 별도 설계한 후 전환한다 (이 계약에는 무제한 transaction 없음).
  gachaLogs를 상세 pulls와 이중 집계하지 않으며 legacy 수동 pity는 initial_pity 기준점으로 명시적으로 이관한다.
- **수집 중복:** postId=SHA-256(정규화 original_url) hex.
  suggestionId=SHA-256(JSON `[postId,content_hash]`) hex; 같은 원문 버전은 create-only.
  원문 hash 변경 시 새 후보로 보존하고 기존 후보의 추출 스냅샷/raw_ai는 덮어쓰지 않는다.
- **승인:** 관리자 서버 transaction으로 pending 확인 → 결정적 eventId=`suggestion-<suggestionId>` 생성 →
  suggestion accepted/event_id/reviewer/reason 및 post event_id 갱신. 편집된 값도 같은 transaction에 반영한다.
  이미 accepted면 같은 event를 반환, ignored는 명시적 재검수 없이 승인 불가.
  본인 저장/리마인더가 필요한 경우 같은 transaction에 포함; 다수 사용자 fanout 금지.
  사전조건 없는 batch만으로 승인하면 경쟁 조건이 남으므로 transaction 또는 updateTime precondition batch를 사용한다.
  reminderId=SHA-256(JSON `[eventId,remind_at ISO UTC]`) hex, 저장 재시도 중복 금지.
- 마스터 삭제는 우선 비활성 운영 정책으로 관리하고 서버가 연결 문서를 점검한다. Auth/user 문서를 지워도
  하위 문서는 자동 삭제되지 않는다. 계정 삭제/보존·소유권 이전은 별도 검증된 서버의 페이지 단위 삭제 작업이 필요하다.
- master 이름 등 표시 캐시는 원본 ID와 함께 저장하되 권한/금액/검수 판단에 쓰지 않는다.
  사용자 리스트는 UID 경로에서 limit+cursor, 월간 결제는 paid_at 범위, events는 franchise_id + start_date로 조회한다.
  `firestore.indexes.json`은 이 조회와 배너·후보·리마인더용 복합 index를 정의한다.
  에뮬레이터는 복합 index 필요 여부를 완전히 검증하지 않으므로 실제 이관 전 query/index 검토가 필요하다.

## Spark / 운영 경계

- Firestore Standard 무료 한도 기준 프로젝트 전체 **1 GiB 저장, 50,000 reads/일, 20,000 writes/일,
  20,000 deletes/일**, 무료 DB 1개. 세 앱 합산이다. 한도/리셋 시각은 [공식 quota](https://firebase.google.com/docs/firestore/quotas) 확인.
- Cloud Functions, Cloud Scheduler 의존, 유료 API, 유료 TTL/PITR/backup 기능은 사용하지 않는다.
  서버 처리는 Vercel의 무료 한도 안에서 수동/허용된 cron으로 실행한다. Spark가 firebase-admin 접근을 금지하는 것은 아니다.
  자동 알림 발송/상시 크롤링 worker가 구현되었다고 간주하지 않는다. AI는 로컬 heuristic, 외부 유료 호출 없음.
- 홈 화면 전체 실시간 listen/fanout/무제한 전체 원장 재계산 금지. 카탈로그 cache, 조회 pagination,
  raw post 크기 제한/필요 최소 보관, index에서 content/raw_ai 제외. 문서당 1 MiB, API 요청 10 MiB,
  batch/transaction 쓰기는 보수적으로 450개 이하로 자른다. **여러 chunk는 전체 원자성이 없다.**
- expires_at은 힌트다. 무료 수동/Vercel 정리 작업이 페이지 단위로 삭제하며 TTL을 활성화하지 않는다.
  보관 기간·크롤링 허용 소스·계정 연결 증명 UI는 이관 구현 전에 확정해야 한다.
- 로컬: Node 24, Java 21, `npm ci && npm run test:rules`.
  명령은 `firebase emulators:exec --only firestore --project demo-otakus`만 사용한다.
  `.firebaserc`/운영 project alias/비밀키/hosting/functions 설정은 추가하지 않는다. **deploy 하지 않는다.**

이 계약은 G/H SQL의 JOIN·FK·RLS·trigger를 자동으로 대체하지 않는다. 해당 서버 구현과 데이터 이관은
후속 작업이며, 이 저장소의 규칙 테스트는 Admin 서버의 입력 검증·pity 재계산·승인 구현까지 증명하지 않는다.
