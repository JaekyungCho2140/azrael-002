# Phase 3 Slack 연동 테스트 시나리오

**작성일**: 2026-02-09
**대상**: Phase 3 Slack 메시지 발신 기능
**참조**: [Azrael-PRD-Phase3.md](../prd/Azrael-PRD-Phase3.md) §11 인수 기준

---

## 테스트 환경 준비

### 사전 조건

1. **Slack App 생성** (개발용 워크스페이스)
   - App 이름: "Azrael Dev" 또는 "Azrael Test"
   - OAuth & Permissions → User Token Scopes:
     - `chat:write` (메시지 발신)
     - `channels:read` (공개 채널 조회)
     - `groups:read` (비공개 채널 조회)
   - Redirect URLs: `https://vgoqkyqqkieogrtnmsva.supabase.co/functions/v1/slack-oauth-callback`

2. **환경 변수 설정**
   - **Vercel** (.env.production):
     ```
     VITE_SLACK_CLIENT_ID=<Slack App Client ID>
     VITE_SLACK_REDIRECT_URI=https://vgoqkyqqkieogrtnmsva.supabase.co/functions/v1/slack-oauth-callback
     VITE_APP_ORIGIN=https://azrael-002.vercel.app
     VITE_SUPABASE_URL=https://vgoqkyqqkieogrtnmsva.supabase.co
     ```
   - **Supabase** (Edge Function Secrets):
     ```
     SLACK_CLIENT_ID=<Slack App Client ID>
     SLACK_CLIENT_SECRET=<Slack App Client Secret>
     SLACK_REDIRECT_URI=https://vgoqkyqqkieogrtnmsva.supabase.co/functions/v1/slack-oauth-callback
     APP_ORIGIN=https://azrael-002.vercel.app
     ```

3. **테스트 계정**
   - 화이트리스트 사용자: `jkcho@wemade.com` (또는 다른 화이트리스트 계정)
   - Slack 워크스페이스: Wemade 또는 테스트용 워크스페이스

4. **테스트 채널 생성**
   - 공개 채널: `#azrael-test-public`
   - 비공개 채널: `#azrael-test-private` (테스트 계정이 멤버로 참여)

5. **프로젝트 및 계산 결과 준비**
   - 테스트 프로젝트 선택 (예: M4/GL)
   - 업데이트일 입력 후 [계산] 실행
   - CalculationResult 생성 확인

---

## 시나리오 1: Slack OAuth 연동

### 테스트 케이스 1.1: 정상 연동

**Given**:
- Slack 미연동 상태
- 화이트리스트 사용자로 로그인

**When**:
1. 상단 [설정] 클릭
2. 사이드바에서 [Slack] 탭 클릭
3. [Slack 연동하기] 버튼 클릭
4. 팝업 윈도우에서 Slack 로그인 (필요 시)
5. 권한 승인 (chat:write, channels:read, groups:read)

**Then**:
- ✅ 팝업이 자동으로 닫힘
- ✅ Alert: "Slack 연동이 완료되었습니다."
- ✅ 연동 상태 표시: "✅ 연동됨 (workspace: Wemade)" + [연동 해제] 버튼
- ✅ 채널 매핑 섹션 표시됨
- ✅ 메시지 템플릿 섹션 표시됨
- ✅ MainScreen [💬 슬랙 발신] 버튼 활성화

**검증**:
```sql
-- Supabase Dashboard → Table Editor → slack_user_tokens
SELECT user_id, slack_user_id, team_id, team_name
FROM slack_user_tokens
WHERE user_id = '<현재 사용자 Supabase UID>';
-- 1개 레코드 존재, access_token 암호화되지 않음 (평문)
```

### 테스트 케이스 1.2: 팝업 차단

**Given**:
- 브라우저 팝업 차단 설정 활성화

**When**:
1. [Slack 연동하기] 버튼 클릭

**Then**:
- ✅ Alert: "팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요."
- ✅ 연동 진행되지 않음

### 테스트 케이스 1.3: OAuth 취소

**Given**:
- [Slack 연동하기] 버튼 클릭 → 팝업 오픈

**When**:
1. Slack 권한 승인 화면에서 [Cancel] 클릭

**Then**:
- ✅ 팝업에 표시: "Slack 연동이 취소되었습니다."
- ✅ 3초 후 팝업 자동 닫힘
- ✅ 부모 창 상태 변경 없음 (미연동 상태 유지)

### 테스트 케이스 1.4: 팝업 수동 닫기

**Given**:
- [Slack 연동하기] 버튼 클릭 → 팝업 오픈

**When**:
1. Slack 로그인/승인 없이 팝업 창의 [X] 버튼으로 수동 닫기

**Then**:
- ✅ 부모 창의 로딩 상태 해제 (isOAuthPending = false)
- ✅ interval, eventListener 정리됨 (메모리 누수 없음)
- ✅ 미연동 상태 유지

### 테스트 케이스 1.5: 연동 해제

**Given**:
- Slack 연동 완료 상태

**When**:
1. [연동 해제] 버튼 클릭
2. confirm 다이얼로그에서 [확인] 클릭

**Then**:
- ✅ Alert: "Slack 연동이 해제되었습니다."
- ✅ 연동 상태: "미연동" + [Slack 연동하기] 버튼
- ✅ 채널 매핑 섹션 숨김
- ✅ 메시지 템플릿 섹션 숨김
- ✅ MainScreen [💬 슬랙 발신] 버튼 비활성화 (툴팁: "설정에서 Slack 연동이 필요합니다")

**검증**:
```sql
SELECT COUNT(*) FROM slack_user_tokens WHERE user_id = '<UID>';
-- 0 (레코드 삭제됨)
```

---

## 시나리오 2: 채널 목록 조회

### 테스트 케이스 2.1: 공개 채널 조회

**Given**:
- Slack 연동 완료
- 워크스페이스에 공개 채널 5개 이상 존재

**When**:
1. 설정 > Slack 탭 진입
2. 채널 매핑 섹션의 드롭다운 클릭

**Then**:
- ✅ 공개 채널 목록 표시 (이름순 정렬)
- ✅ 채널 이름 앞에 `#` 표시
- ✅ 로딩 표시 없음 (2분 캐시)
- ✅ "없음" 옵션 포함

### 테스트 케이스 2.2: 비공개 채널 조회

**Given**:
- Slack 연동 완료
- 사용자가 비공개 채널 2개에 참여 중

**When**:
1. 채널 드롭다운 클릭

**Then**:
- ✅ 비공개 채널 목록 표시 (공개 채널과 함께)
- ✅ 비공개 채널 이름 앞에 `🔒` 아이콘
- ✅ 이름순 정렬 (공개 + 비공개 통합)

### 테스트 케이스 2.3: 비공개 채널 조회 실패 (Graceful Degradation)

**Given**:
- Slack 연동 완료
- User Token에 `groups:read` 권한 없음 (또는 네트워크 에러)

**When**:
1. 채널 드롭다운 클릭

**Then**:
- ✅ 공개 채널만 표시 (비공개 채널 없음)
- ✅ 드롭다운 하단에 경고: "⚠️ 비공개 채널 일부를 불러올 수 없습니다"
- ✅ 공개 채널 선택 및 저장은 정상 동작

### 테스트 케이스 2.4: 채널 목록 조회 실패

**Given**:
- Slack 연동 완료
- 네트워크 에러 또는 토큰 만료

**When**:
1. 채널 드롭다운 클릭

**Then**:
- ✅ 에러 메시지: "채널 목록을 불러오지 못했습니다."
- ✅ [다시 시도] 버튼 표시
- ✅ [다시 시도] 클릭 시 refetch() 호출 → 재조회

---

## 시나리오 3: 프로젝트별 기본 채널 매핑

### 테스트 케이스 3.1: 채널 매핑 저장

**Given**:
- 프로젝트: M4/GL 선택
- 현재 기본 채널: 없음

**When**:
1. 채널 드롭다운에서 `#azrael-test-public` 선택

**Then**:
- ✅ **즉시 저장** (onChange 이벤트, 별도 저장 버튼 없음)
- ✅ **Optimistic update**: 드롭다운 값 즉시 반영
- ✅ 저장 성공 후 React Query invalidation
- ✅ 발신 모달에서 해당 채널 자동 선택됨

**검증**:
```sql
SELECT slack_channel_id, slack_channel_name
FROM projects
WHERE id = 'M4_GL';
-- slack_channel_id: C0123456789 (실제 채널 ID)
-- slack_channel_name: azrael-test-public
```

### 테스트 케이스 3.2: 채널 매핑 변경

**Given**:
- 프로젝트: M4/GL
- 현재 기본 채널: `#azrael-test-public`

**When**:
1. 채널 드롭다운에서 `#l10n-mir4` 선택

**Then**:
- ✅ 즉시 저장 + 값 업데이트
- ✅ 다른 프로젝트 매핑은 변경 없음

### 테스트 케이스 3.3: 채널 매핑 제거

**Given**:
- 프로젝트: M4/GL
- 현재 기본 채널: `#l10n-mir4`

**When**:
1. 채널 드롭다운에서 "없음" 선택

**Then**:
- ✅ `slack_channel_id`, `slack_channel_name` → NULL
- ✅ 발신 모달에서 채널 미선택 상태
- ✅ placeholder: "설정에서 기본 채널을 선택해주세요"

### 테스트 케이스 3.4: 채널 매핑 저장 실패 (Rollback)

**Given**:
- 프로젝트: M4/GL
- 현재 기본 채널: `#azrael-test-public`
- 네트워크 에러 시뮬레이션 (개발자 도구: Offline)

**When**:
1. 채널 드롭다운에서 `#l10n-mir4` 선택
2. 네트워크 에러 발생

**Then**:
- ✅ Optimistic update로 UI는 즉시 변경됨
- ✅ onError 콜백에서 이전 값으로 롤백
- ✅ Alert: "채널 매핑 저장에 실패했습니다. 다시 시도해주세요."
- ✅ 드롭다운 값: `#azrael-test-public` (롤백됨)

---

## 시나리오 4: 메시지 템플릿 관리

### 테스트 케이스 4.1: 기본 템플릿 조회

**Given**:
- Slack 연동 완료
- 프로젝트: M4/GL

**When**:
1. 설정 > Slack 탭 > 메시지 템플릿 섹션 확인

**Then**:
- ✅ "기본 템플릿" 1개 표시
- ✅ 유형: "기본 제공"
- ✅ [편집] 버튼만 표시 ([삭제] 버튼 없음)

### 테스트 케이스 4.2: 기본 템플릿 편집

**Given**:
- 기본 템플릿 존재

**When**:
1. "기본 템플릿" [편집] 클릭
2. 본문 수정:
   ```
   *[{updateDateShort} 일정 공유]*

   *헤즈업:* {headsUp}

   {table}
   ```
3. [저장] 클릭

**Then**:
- ✅ 템플릿 이름 필드: readonly (변경 불가)
- ✅ 본문만 수정됨
- ✅ `is_built_in = true` 유지
- ✅ Alert: "템플릿이 저장되었습니다."
- ✅ 모달 닫힘

**검증**:
```sql
SELECT name, is_built_in, body_template
FROM slack_message_templates
WHERE project_id = 'M4_GL' AND name = '기본 템플릿';
-- is_built_in: true (유지)
-- body_template: 수정된 내용
```

### 테스트 케이스 4.3: 새 템플릿 추가

**Given**:
- Slack 연동 완료

**When**:
1. [+ 새 템플릿 추가] 클릭
2. 템플릿 이름: "QA팀용 간략"
3. 본문:
   ```
   *[{updateDateShort} 일정]*

   {table}
   ```
4. [저장] 클릭

**Then**:
- ✅ Alert: "템플릿이 저장되었습니다."
- ✅ 템플릿 목록에 "QA팀용 간략" 추가됨
- ✅ 유형: "사용자 정의"
- ✅ [편집] [삭제] 버튼 모두 표시

**검증**:
```sql
SELECT name, is_built_in, created_by
FROM slack_message_templates
WHERE name = 'QA팀용 간략';
-- is_built_in: false
-- created_by: jkcho@wemade.com
```

### 테스트 케이스 4.4: 템플릿 이름 중복

**Given**:
- "QA팀용 간략" 템플릿 존재

**When**:
1. [+ 새 템플릿 추가] 클릭
2. 템플릿 이름: "QA팀용 간략" (중복)
3. [저장] 클릭

**Then**:
- ✅ Alert: "이미 존재하는 템플릿 이름입니다."
- ✅ 모달 유지 (재입력 가능)

### 테스트 케이스 4.5: 사용자 정의 템플릿 삭제

**Given**:
- "QA팀용 간략" 템플릿 존재 (is_built_in = false)

**When**:
1. "QA팀용 간략" [삭제] 클릭
2. confirm 다이얼로그에서 [확인] 클릭

**Then**:
- ✅ Alert: "템플릿이 삭제되었습니다."
- ✅ 템플릿 목록에서 제거됨

### 테스트 케이스 4.6: 기본 템플릿 삭제 시도 (RLS 보호)

**Given**:
- "기본 템플릿" 존재 (is_built_in = true)

**When**:
1. "기본 템플릿" 행 확인

**Then**:
- ✅ [삭제] 버튼 표시 안 됨 (UI 차원 방지)

**추가 검증** (직접 DB 삭제 시도):
```sql
DELETE FROM slack_message_templates WHERE is_built_in = true;
-- ERROR: RLS policy violation
```

---

## 시나리오 5: 슬랙 메시지 발신

### 테스트 케이스 5.1: 정상 발신 (새 메시지)

**Given**:
- Slack 연동 완료
- 프로젝트 M4/GL, 기본 채널 `#azrael-test-public`
- 계산 결과 존재
- 스레드 리플라이 체크 해제

**When**:
1. MainScreen에서 [💬 슬랙 발신] 클릭
2. 모달 확인:
   - 테이블: T2 (Ext.) 선택됨 (기본)
   - 템플릿: "기본 템플릿" 선택됨
   - 채널: `#azrael-test-public` 선택됨 (프로젝트 기본)
3. 미리보기 확인
4. [슬랙에 발신] 클릭

**Then**:
- ✅ 버튼 텍스트: "발신 중..." + disabled
- ✅ Alert: "#azrael-test-public에 발신되었습니다."
- ✅ 모달 자동 닫힘
- ✅ Slack 채널에 메시지 게시됨

**Slack 채널 검증**:
- 메시지 형식: mrkdwn
- 내용: 헤즈업, iOS 심사일(조건부), 테이블, Disclaimer(조건부)
- 링크: `<https://azrael-002.vercel.app|Azrael에서 자세히 보기>` 클릭 가능

### 테스트 케이스 5.2: 테이블 선택 변경

**Given**:
- 발신 모달 오픈

**When**:
1. 테이블 라디오: T1 (내부) 선택
2. 미리보기 확인
3. 테이블 라디오: T3 (Int.) 선택
4. 미리보기 확인

**Then**:
- ✅ 미리보기가 실시간 업데이트됨
- ✅ T1: table1Entries 데이터
- ✅ T3: table3Entries 데이터
- ✅ 각 테이블별 엔트리 개수 상이

### 테스트 케이스 5.3: 템플릿 선택 변경

**Given**:
- "기본 템플릿", "QA팀용 간략" 2개 템플릿 존재

**When**:
1. 템플릿 드롭다운: "QA팀용 간략" 선택
2. 미리보기 확인

**Then**:
- ✅ 미리보기가 "QA팀용 간략" 형식으로 업데이트
- ✅ 변수 치환 정상 동작 (`{headsUp}` → 실제 날짜)
- ✅ 조건부 블록 정상 동작 (`{{#if showIosReviewDate}}`)

### 테스트 케이스 5.4: 채널 미선택 시 발신 불가

**Given**:
- 프로젝트 기본 채널 미설정 (NULL)

**When**:
1. 발신 모달 오픈
2. 채널 드롭다운: placeholder "설정에서 기본 채널을 선택해주세요"
3. [슬랙에 발신] 버튼 확인

**Then**:
- ✅ [슬랙에 발신] 버튼 disabled
- ✅ 채널 선택 시 버튼 활성화

### 테스트 케이스 5.5: 계산 결과 없을 때 버튼 비활성화

**Given**:
- 프로젝트 선택
- 계산 미실행 (calculationResult = null)

**When**:
1. MainScreen [💬 슬랙 발신] 버튼 확인

**Then**:
- ✅ 버튼 disabled
- ✅ 툴팁: "먼저 계산을 실행해주세요"

---

## 시나리오 6: 스레드 리플라이

### 테스트 케이스 6.1: Slack URL로 리플라이

**Given**:
- Slack 채널에 기존 메시지 존재
- 메시지 링크: `https://wemade.slack.com/archives/C0123456789/p1234567890123456`

**When**:
1. 발신 모달에서 "□ 기존 메시지에 리플라이" 체크
2. thread_ts 입력: `https://wemade.slack.com/archives/C0123456789/p1234567890123456`
3. [슬랙에 발신] 클릭

**Then**:
- ✅ Slack에서 기존 메시지의 스레드로 발신됨
- ✅ 부모 메시지에 "1 reply" 카운터 표시
- ✅ Alert: "#azrael-test-public에 발신되었습니다."

### 테스트 케이스 6.2: thread_ts 직접 입력

**Given**:
- thread_ts: `1234567890.123456` (직접 입력)

**When**:
1. "□ 기존 메시지에 리플라이" 체크
2. thread_ts 입력: `1234567890.123456`
3. [슬랙에 발신] 클릭

**Then**:
- ✅ 스레드로 발신됨
- ✅ Alert 표시

### 테스트 케이스 6.3: thread_ts 빈 입력

**Given**:
- "□ 기존 메시지에 리플라이" 체크

**When**:
1. thread_ts 입력 필드: 빈칸
2. [슬랙에 발신] 버튼 확인

**Then**:
- ✅ [슬랙에 발신] 버튼 disabled
- ✅ thread_ts 입력 시 버튼 활성화

### 테스트 케이스 6.4: 잘못된 thread_ts

**Given**:
- thread_ts: `invalid-timestamp`

**When**:
1. 발신 시도

**Then**:
- ✅ Slack API 에러 응답
- ✅ Alert: "슬랙 발신 실패: invalid_arguments" (또는 유사 에러)
- ✅ 모달 유지 (재시도 가능)

---

## 시나리오 7: 에러 처리

### 테스트 케이스 7.1: 토큰 무효화 (TOKEN_INVALID)

**Given**:
- Slack 연동 완료
- Slack 워크스페이스에서 App 권한 해제

**When**:
1. 발신 모달에서 [슬랙에 발신] 클릭

**Then**:
- ✅ Alert: "Slack 연동이 해제되었습니다. 설정에서 다시 연동해주세요."
- ✅ 모달 자동 닫힘
- ✅ MainScreen [슬랙 발신] 버튼 비활성화 (queryClient.invalidateQueries)
- ✅ DB에서 토큰 자동 삭제됨

**검증**:
```sql
SELECT COUNT(*) FROM slack_user_tokens WHERE user_id = '<UID>';
-- 0 (자동 삭제됨)
```

### 테스트 케이스 7.2: 채널 참여 안 함 (NOT_IN_CHANNEL)

**Given**:
- 사용자가 `#other-team-channel`에 참여하지 않음

**When**:
1. 발신 모달에서 채널 `#other-team-channel` 선택
2. [슬랙에 발신] 클릭

**Then**:
- ✅ Alert: "해당 채널에 참여하고 있지 않습니다. Slack에서 채널에 먼저 참여해주세요."
- ✅ 모달 유지 (재시도 가능)
- ✅ 사용자가 Slack에서 채널 참여 후 재시도 가능

### 테스트 케이스 7.3: 채널 없음 (CHANNEL_NOT_FOUND)

**Given**:
- 채널 ID: C9999999999 (존재하지 않는 채널)

**When**:
1. 발신 시도

**Then**:
- ✅ Alert: "채널을 찾을 수 없습니다. 채널을 다시 선택해주세요."
- ✅ queryClient.invalidateQueries(['slack-channels']) 호출
- ✅ 채널 목록 재조회
- ✅ 모달 유지

### 테스트 케이스 7.4: Rate Limit (RATE_LIMITED)

**Given**:
- Slack API Rate Limit 도달 (Tier 3: 1+ req/min)

**When**:
1. 짧은 시간 내 여러 번 발신 시도

**Then**:
- ✅ Alert: "요청이 너무 많습니다. 60초 후 다시 시도해주세요." (retryAfter 값 포함)
- ✅ 모달 유지
- ✅ 60초 대기 후 재시도 가능

### 테스트 케이스 7.5: 네트워크 에러

**Given**:
- 인터넷 연결 끊김 (개발자 도구: Offline)

**When**:
1. [슬랙에 발신] 클릭

**Then**:
- ✅ Alert: "네트워크 오류가 발생했습니다. 다시 시도해주세요."
- ✅ 모달 유지
- ✅ 네트워크 복구 후 재시도 가능

---

## 시나리오 8: 변수 및 조건부 블록

### 테스트 케이스 8.1: 날짜 변수 치환

**Given**:
- 업데이트일: 2026-02-10 (월)
- 헤즈업: 01/28 (화)
- iOS 심사일: 02/03 (월) (showIosReviewDate = true)
- 템플릿:
  ```
  *업데이트:* {updateDate}
  *헤즈업:* {headsUp}
  *iOS:* {iosReviewDate}
  ```

**When**:
1. 미리보기 확인

**Then**:
- ✅ `*업데이트:* 02/10(월)`
- ✅ `*헤즈업:* 01/28(화)`
- ✅ `*iOS:* 02/03(월)`

### 테스트 케이스 8.2: 조건부 블록 (true)

**Given**:
- showIosReviewDate = true
- 템플릿:
  ```
  {{#if showIosReviewDate}}*iOS 심사일:* {iosReviewDate}{{/if}}
  ```

**When**:
1. 미리보기 확인

**Then**:
- ✅ `*iOS 심사일:* 02/03(월)` 표시됨

### 테스트 케이스 8.3: 조건부 블록 (false)

**Given**:
- showIosReviewDate = false
- 템플릿:
  ```
  *헤즈업:* {headsUp}
  {{#if showIosReviewDate}}*iOS 심사일:* {iosReviewDate}{{/if}}
  *테이블:*
  ```

**When**:
1. 미리보기 확인

**Then**:
- ✅ iOS 관련 줄이 완전히 제거됨 (개행 포함)
- ✅ 출력:
  ```
  *헤즈업:* 01/28(화)
  *테이블:*
  ```

### 테스트 케이스 8.4: Disclaimer 변수 치환

**Given**:
- Disclaimer (프로젝트 설정):
  ```
  <b>업데이트일</b>: {updateDate}
  <r>주의</r>: 일정 변경 가능
  ```

**When**:
1. 발신 모달 미리보기 확인

**Then**:
- ✅ Disclaimer 변환:
  ```
  *업데이트일*: 02/10(월)
  주의: 일정 변경 가능
  ```
- ✅ `<b>` → `*` (Bold)
- ✅ `<r>` → 태그 제거 (색상 미지원)
- ✅ `{updateDate}` → 실제 날짜

### 테스트 케이스 8.5: 테이블 변수 치환

**Given**:
- T2 엔트리 3개:
  1. 정기: 01/10(금) 09:00 ~ 01/15(수) 18:00
  2. 1차: 01/20(월) 09:00 ~ 01/25(토) 18:00
     - 2.1 번역: 01/20(월) 09:00 ~ 01/22(수) 18:00

**When**:
1. 템플릿: `{table}`
2. 미리보기 확인

**Then**:
- ✅ `*[일정 요약]*` 헤더
- ✅ `1. 정기: 01/10(금) 09:00 ~ 01/15(수) 18:00`
- ✅ `2. 1차: 01/20(월) 09:00 ~ 01/25(토) 18:00`
- ✅ `  2.1 번역: 01/20(월) 09:00 ~ 01/22(수) 18:00` (2칸 인덴트)

---

## 시나리오 9: XSS 방지

### 테스트 케이스 9.1: HTML 이스케이프

**Given**:
- Disclaimer:
  ```
  <script>alert('XSS')</script>
  일정 변경 가능
  ```

**When**:
1. 발신 모달 미리보기 확인

**Then**:
- ✅ 미리보기 HTML:
  ```html
  &lt;script&gt;alert('XSS')&lt;/script&gt;<br>
  일정 변경 가능
  ```
- ✅ `<script>` 태그가 실행되지 않음 (entity escape)
- ✅ 플레인텍스트로 표시됨

### 테스트 케이스 9.2: 악의적 URL 차단

**Given**:
- 템플릿:
  ```
  <javascript:alert('XSS')|클릭하지 마세요>
  ```

**When**:
1. 미리보기 확인

**Then**:
- ✅ `javascript:` URL이 필터링됨
- ✅ 텍스트만 표시 (링크 생성 안 됨)
- ✅ http://, https:// URL만 허용

---

## 시나리오 10: 통합 시나리오

### 테스트 케이스 10.1: End-to-End 플로우

**Given**:
- 신규 사용자 (Slack 미연동)

**When**:
1. 로그인
2. 프로젝트 M4/GL 선택
3. 업데이트일 2026-02-10 입력 → [계산]
4. [💬 슬랙 발신] 버튼 확인 → disabled (툴팁: "설정에서 Slack 연동이 필요합니다")
5. [설정] → Slack 탭 → [Slack 연동하기]
6. OAuth 승인
7. 채널 매핑: `#l10n-mir4` 선택
8. [돌아가기] → MainScreen
9. [💬 슬랙 발신] → 활성화됨 → 클릭
10. 모달: T2, 기본 템플릿, `#l10n-mir4` 자동 선택
11. 미리보기 확인
12. [슬랙에 발신] 클릭

**Then**:
- ✅ `#l10n-mir4`에 메시지 게시됨
- ✅ 메시지 형식: mrkdwn (Bold, 링크, 테이블 정상)
- ✅ Alert: "#l10n-mir4에 발신되었습니다."
- ✅ 모달 닫힘

### 테스트 케이스 10.2: 프로젝트 전환 시나리오

**Given**:
- M4/GL 기본 채널: `#l10n-mir4`
- NC/GL (1주) 기본 채널: `#l10n-nightcrows`

**When**:
1. M4/GL에서 계산 → 발신 모달 → 채널 확인 → `#l10n-mir4`
2. 프로젝트 드롭다운 → NC/GL (1주) 선택
3. 계산 재실행
4. 발신 모달 → 채널 확인

**Then**:
- ✅ 채널: `#l10n-nightcrows` 자동 선택
- ✅ 템플릿: NC/GL 프로젝트 템플릿 목록 표시
- ✅ 프로젝트별 독립적인 설정 동작

---

## 시나리오 11: 접근성 및 사용성

### 테스트 케이스 11.1: 키보드 네비게이션

**When**:
1. 발신 모달에서 Tab 키로 포커스 이동

**Then**:
- ✅ 테이블 라디오 → 템플릿 드롭다운 → 채널 드롭다운 → 체크박스 → 입력 → 버튼 순서
- ✅ focus-visible 스타일 표시
- ✅ Enter 키로 버튼 클릭 가능

### 테스트 케이스 11.2: 모달 닫기

**When**:
1. ESC 키 입력
2. 모달 외부 오버레이 클릭
3. [취소] 버튼 클릭

**Then**:
- ✅ 모달 닫힘
- ✅ 입력 상태 초기화되지 않음 (재오픈 시 유지)

### 테스트 케이스 11.3: 발신 중 상태

**Given**:
- Slack API 응답 지연 (3초)

**When**:
1. [슬랙에 발신] 클릭
2. 버튼 상태 확인

**Then**:
- ✅ 버튼 텍스트: "발신 중..."
- ✅ 버튼 disabled
- ✅ 다중 클릭 방지
- ✅ 응답 후 상태 복원

---

## 시나리오 12: 데이터 일관성

### 테스트 케이스 12.1: 프로젝트 삭제 시 CASCADE

**Given**:
- M4/GL 프로젝트 + 슬랙 템플릿 3개

**When**:
1. 설정 > 프로젝트 탭에서 M4/GL 삭제

**Then**:
- ✅ 슬랙 템플릿도 자동 삭제 (CASCADE)

**검증**:
```sql
SELECT COUNT(*) FROM slack_message_templates WHERE project_id = 'M4_GL';
-- 0 (CASCADE DELETE)
```

### 테스트 케이스 12.2: RLS 정책 (비화이트리스트 사용자)

**Given**:
- 비화이트리스트 사용자: `viewer@wemade.com` (읽기 전용)

**When**:
1. 설정 > Slack 탭 접근 시도

**Then**:
- ✅ 연동 상태 조회 가능 (본인 토큰만)
- ✅ 채널 매핑 조회 가능
- ✅ 템플릿 조회 가능
- ✅ [Slack 연동하기] 버튼: RLS 에러 (INSERT 권한 없음)
- ✅ 템플릿 생성/수정/삭제: RLS 에러

---

## 시나리오 13: Edge Case

### 테스트 케이스 13.1: 매우 긴 메시지

**Given**:
- 템플릿에 긴 Disclaimer (500자)
- 테이블 엔트리 50개 (하위 일감 포함)

**When**:
1. 발신 시도

**Then**:
- ✅ 미리보기 스크롤 가능 (max-height: 300px, overflow-y: auto)
- ✅ Slack 메시지 발신 성공
- ✅ Slack에서 전체 내용 표시 (40,000자 제한 내)

### 테스트 케이스 13.2: 특수 문자

**Given**:
- 배치 이름: `1차 (Hot-Fix)`
- Disclaimer: `※ 주의: "변경" 가능`

**When**:
1. 발신 시도

**Then**:
- ✅ 특수 문자 정상 표시
- ✅ mrkdwn 이스케이프 처리 (`*`, `_`, `~` 등)

### 테스트 케이스 13.3: 빈 테이블

**Given**:
- T1 엔트리 0개 (모든 Stage의 tableTargets에서 'table1' 제외)

**When**:
1. 테이블: T1 선택
2. 미리보기 확인

**Then**:
- ✅ `*[일정 요약]*` 헤더만 표시
- ✅ 엔트리 없음 (빈 줄)
- ✅ 에러 발생하지 않음

### 테스트 케이스 13.4: Disclaimer 없음

**Given**:
- 프로젝트 Disclaimer: "" (빈칸)
- 템플릿:
  ```
  {table}
  {{#if disclaimer}}
  ---
  _{disclaimer}_
  {{/if}}
  ```

**When**:
1. 미리보기 확인

**Then**:
- ✅ `{{#if disclaimer}}` 블록 전체 제거 (개행 포함)
- ✅ 테이블 다음 빈 줄 없음

---

## 인수 기준 체크리스트 (PRD §11)

| 기능 | 인수 기준 | 테스트 시나리오 |
|------|-----------|-----------------|
| ✅ Slack OAuth 연동 | 설정 > Slack에서 연동/해제 가능, 토큰 DB 저장, 해제 시 레코드 삭제 | 1.1, 1.5 |
| ✅ 채널 목록 조회 | 공개+비공개 채널 이름순 정렬, 최대 400개 | 2.1, 2.2, 2.3 |
| ✅ 프로젝트별 기본 채널 | projects 테이블 저장, 발신 모달 자동 선택 | 3.1, 3.2, 10.2 |
| ✅ 메시지 발신 | 선택 채널에 mrkdwn 발신, 성공/실패 alert | 5.1, 5.2 |
| ✅ 스레드 리플라이 | thread_ts 입력 시 리플라이로 발신 | 6.1, 6.2 |
| ✅ 메시지 템플릿 | CRUD 동작, 기본 템플릿 삭제 불가, 변수 치환 | 4.1~4.6, 8.1~8.4 |
| ✅ 에러 처리 | 토큰 만료 자동 삭제, Rate limit 안내 | 7.1~7.5 |
| ✅ 미리보기 | mrkdwn 렌더링, XSS 방지 | 9.1, 9.2 |

---

## 성능 테스트

### 테스트 케이스 P.1: 초기 로드 시간

**When**:
1. 개발자 도구 → Network 탭 → Hard Reload
2. MainScreen 렌더링 완료까지 측정

**Then**:
- ✅ 초기 번들 로드: < 2초 (3G 환경)
- ✅ Lazy loaded 청크 (SlackSendModal): 버튼 클릭 시에만 로드
- ✅ React Query 캐시: 5분 staleTime (재방문 시 즉시 표시)

### 테스트 케이스 P.2: 메시지 발신 응답 시간

**When**:
1. [슬랙에 발신] 클릭 → 응답까지 측정

**Then**:
- ✅ Edge Function 응답: < 3초
- ✅ Slack API 응답: < 2초
- ✅ 전체 플로우: < 5초

---

## 회귀 테스트

### 기존 기능 동작 확인

- ✅ Phase 0: 영업일 계산 정상 동작
- ✅ Phase 0.5: 하위 일감 정상 동작
- ✅ Phase 1: JIRA 생성/업데이트 정상 동작
- ✅ Phase 2: 이메일 생성 정상 동작
- ✅ Vitest: 110/110 통과 (기존 테스트 깨지지 않음)

---

## 테스트 도구

### 자동화 (Vitest)
- ✅ 기존 110개 테스트 통과
- 🔲 Slack 포맷터 단위 테스트 추가 (선택 사항)
- 🔲 슬랙 메시지 생성 테스트 추가 (선택 사항)

### 수동 테스트 (Playwright MCP)
- 🔲 OAuth 플로우 자동화 (팝업 제어 필요)
- 🔲 발신 모달 UI 테스트
- 🔲 채널 드롭다운 상호작용 테스트

### 프로덕션 검증
- 🔲 Vercel 배포 후 프로덕션 환경 테스트
- 🔲 실제 Slack 워크스페이스 연동
- 🔲 실제 채널에 테스트 메시지 발신
- 🔲 팀원 피드백 수집

---

## 테스트 체크리스트

### 배포 전 필수 테스트
- [ ] **1.1**: Slack OAuth 정상 연동
- [ ] **2.1**: 공개 채널 목록 조회
- [ ] **3.1**: 채널 매핑 저장 (Optimistic update)
- [ ] **4.3**: 새 템플릿 추가
- [ ] **5.1**: 메시지 정상 발신
- [ ] **6.1**: 스레드 리플라이
- [ ] **7.1**: 토큰 무효화 자동 삭제
- [ ] **8.1**: 변수 치환 정상 동작
- [ ] **9.1**: XSS 방지 확인

### 배포 후 검증
- [ ] Vercel 프로덕션 환경 동작 확인
- [ ] 실제 Slack 워크스페이스 연동
- [ ] 팀원 계정으로 OAuth 테스트
- [ ] 실제 업무 채널에 테스트 메시지 발신
- [ ] 스레드 리플라이 동작 확인
- [ ] 템플릿 커스터마이징 테스트

### 선택적 테스트
- [ ] **2.2**: 비공개 채널 조회
- [ ] **3.4**: 저장 실패 롤백
- [ ] **4.4**: 템플릿 이름 중복
- [ ] **7.2**: NOT_IN_CHANNEL 에러
- [ ] **7.4**: Rate Limit 에러
- [ ] **13.1**: 매우 긴 메시지

---

## 알려진 제약사항

1. **채널 목록 제한**: 공개 최대 200개 + 비공개 최대 200개 (의도적 설계)
2. **비공개 채널 권한**: `groups:read` 권한 없으면 공개 채널만 조회 (graceful degradation)
3. **Rate Limit**: Slack API Tier 3 제한 (1+ req/min)
4. **브라우저 팝업**: 팝업 차단 시 수동 허용 필요
5. **메시지 수정**: Azrael에서 불가, Slack에서 직접 수정

---

## 문제 발생 시 디버깅

### 로그 확인

**Edge Functions**:
```bash
supabase functions logs slack-oauth-callback --project-ref vgoqkyqqkieogrtnmsva
supabase functions logs slack-channels --project-ref vgoqkyqqkieogrtnmsva
supabase functions logs slack-send --project-ref vgoqkyqqkieogrtnmsva
```

**브라우저 Console**:
- Network 탭: Edge Function 요청/응답 확인
- Console 탭: 에러 메시지 확인
- Application 탭: localStorage `slack_oauth_state` 확인

**Supabase Dashboard**:
- Table Editor → `slack_user_tokens`: 토큰 저장 확인
- Table Editor → `slack_message_templates`: 템플릿 확인
- SQL Editor: 직접 쿼리 실행

### 자주 발생하는 문제

1. **OAuth 팝업이 안 열려요**
   - 브라우저 팝업 차단 해제
   - VITE_SLACK_CLIENT_ID 환경 변수 확인

2. **"Slack 연동이 필요합니다" 에러**
   - 설정 > Slack에서 연동 여부 확인
   - `slack_user_tokens` 테이블에 레코드 확인
   - useSlackTokenStatus 훅 queryKey 캐시 확인

3. **채널 목록이 안 보여요**
   - Edge Function 배포 확인: `slack-channels`
   - Supabase Secrets 확인: SLACK_CLIENT_SECRET
   - Slack API 응답 확인 (Edge Function logs)

4. **메시지 발신이 안 돼요**
   - Edge Function 배포 확인: `slack-send`
   - 채널 참여 여부 확인 (NOT_IN_CHANNEL)
   - Slack API Rate Limit 확인

5. **미리보기가 이상해요**
   - `renderMrkdwnPreview()` 함수 로직 확인
   - XSS 방지 entity escape 순서 확인
   - mrkdwn 문법 확인 (`*bold*`, `_italic_`, `---` 등)

---

## 테스트 완료 기준

Phase 3 구현이 **프로덕션 배포 가능** 상태로 판정되려면:

### 필수 조건 (Must Have)
- ✅ Slack OAuth 연동/해제 동작
- ✅ 공개 채널 목록 조회
- ✅ 기본 채널 매핑 저장
- ✅ 메시지 정상 발신
- ✅ 변수 치환 정상 동작
- ✅ 기본 템플릿 편집 가능
- ✅ TypeScript 타입 체크 통과
- ✅ 기존 테스트 110개 통과

### 선택 조건 (Should Have)
- ⚪ 비공개 채널 조회 (graceful degradation 허용)
- ⚪ 스레드 리플라이 동작
- ⚪ 사용자 정의 템플릿 CRUD
- ⚪ 에러 상황 복구 (TOKEN_INVALID, NOT_IN_CHANNEL 등)

### 이상적 조건 (Nice to Have)
- ⚪ 키보드 네비게이션 완벽 동작
- ⚪ 모든 Edge Case 처리
- ⚪ Playwright 자동화 테스트 작성
- ⚪ 팀원 피드백 반영

---

**문서 종료**
