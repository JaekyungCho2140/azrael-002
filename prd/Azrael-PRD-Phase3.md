# Azrael PRD - Phase 3: 슬랙 메시지 발신

**최종 업데이트**: 2026-01-26
**버전**: 2.0 (Phase 분할)
**참조**: [Azrael-PRD-Master.md](./Azrael-PRD-Master.md) | [Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)

**Phase 3 Status**: 📝 설계 완료

---

## 📋 문서 개요

Phase 3는 **슬랙 메시지 발신** 기능을 구현합니다.

| 기능 | 핵심 가치 |
|------|-----------|
| **슬랙 발신** | 팀 내부 일정 공유 자동화 및 즉시 확인 (슬랙 확인율 100%) |

**전제조건**: Phase 0, 0.5, 1, 1.7, 2 (✅ 완료)

---

## 보안 정책 명시

> **⚠️ 내부 도구 보안 정책**
>
> 본 서비스는 다음 특성을 가지므로, 일부 보안 표준을 간소화합니다:
> - **사용자**: 총 4명 (L10n팀 내부)
> - **관리자/개발자**: 동일인 (재경)
> - **배포 목적**: 팀 내부 전용 도구 (외부 배포 없음)
>
> 따라서:
> - OAuth Token: 평문 저장 + RLS (Supabase Vault 미사용)
> - Edge Function: body에서 userId 전달 (JWT 검증 생략)
>
> 이 결정은 검토 완료된 사항이며, 추후 외부 배포 시 재검토 필요.

---

# 1. 기능 목적

계산된 일정 테이블(T1/T2/T3)을 기반으로 **슬랙 채널에 메시지를 자동 발신**합니다.

**발신 대상**:
- 내부 유관부서: L10n팀 채널, QA 채널 등
- 외부 협력업체: 협력사 공유 채널

**주요 가치**:
- 슬랙 메시지 작성 시간 95% 단축 (수동 5분 → 자동 15초)
- 팀원 슬랙 확인율 100% (이메일 대비 높은 확인율)
- 사용자 계정으로 발신하여 자연스러운 커뮤니케이션

---

# 2. 기능 상세

## 2.1 입력/출력

| 항목 | 설명 |
|------|------|
| **입력** | 선택한 테이블 (T1, T2, 또는 T3) - 테이블 명칭 표 참고 (Phase 2 §2.1) |
| **출력** | 슬랙 채널 메시지 (mrkdwn 형식) |

## 2.2 슬랙 메시지 예시 (mrkdwn)

```
📅 *[26-02-10 업데이트 일정]*

*헤즈업:* 01/28(화)
{{#if showIosReviewDate}}*iOS 심사일:* 02/03(월){{/if}}

---

*[일정 요약]*
1. 정기: 01/10(금) 09:00 ~ 01/15(수) 18:00
2. 1차: 01/20(월) 09:00 ~ 01/25(토) 18:00
3. 2차: 02/01(일) 09:00 ~ 02/05(목) 18:00

---

_※ Disclaimer: {내용}_

🔗 <https://azrael-002.vercel.app|Azrael에서 자세히 보기>
```

## 2.3 Disclaimer 슬랙 변환 규칙

커스텀 서식 태그를 슬랙 mrkdwn으로 변환:

| 커스텀 태그 | 슬랙 mrkdwn | 비고 |
|------------|------------|------|
| `<b>text</b>` | `*text*` | Bold |
| `<r>text</r>` | `text` | 색상 미지원, 태그 제거 |
| `<g>text</g>` | `text` | 색상 미지원, 태그 제거 |
| `<bl>text</bl>` | `text` | 색상 미지원, 태그 제거 |
| `<u>text</u>` | `text` | 밑줄 미지원, 태그 제거 |
| `\n` | `\n` | 줄바꿈 유지 |

---

# 3. 슬랙 연동 방식

## 3.1 User OAuth Token 방식

| 항목 | 설명 |
|------|------|
| **방식** | Slack App + User OAuth Token |
| **장점** | 사용자 본인 계정으로 발신, 메시지 수정/삭제 가능 (Slack에서 직접) |
| **권한** | `chat:write`, `channels:read`, `groups:read` |

> **메시지 수정 기능**: Azrael에서 구현하지 않음. Slack에서 직접 수정.

## 3.2 OAuth 플로우

```
[설정 > Slack 연동]
  ↓
[Slack 연동하기] 버튼 클릭
  ↓
[OAuth 팝업 윈도우] (600x700)
  ├─ Slack 로그인 (필요시)
  ├─ 권한 승인
  └─ 콜백 → slack-oauth-callback Edge Function
  ↓
[postMessage로 부모 창에 성공 전달]
  ↓
[팝업 자동 닫힘 + 연동 완료 토스트]
```

### OAuth URL 구조

```typescript
const oauthUrl = `https://slack.com/oauth/v2/authorize?` +
  `client_id=${SLACK_CLIENT_ID}` +
  `&scope=chat:write,channels:read,groups:read` +
  `&user_scope=chat:write` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&state=${state}`;  // CSRF 방지
```

### State 파라미터 (CSRF 방지)

```typescript
// 1. OAuth 시작 시 랜덤 state 생성 및 저장
const state = crypto.randomUUID();
localStorage.setItem('slack_oauth_state', state);

// 2. 콜백에서 state 검증
const savedState = localStorage.getItem('slack_oauth_state');
if (savedState !== receivedState) {
  throw new Error('CSRF 검증 실패');
}
localStorage.removeItem('slack_oauth_state');  // 사용 후 즉시 삭제
```

### 팝업 차단 감지

```typescript
const popup = window.open(oauthUrl, 'slack-oauth', 'width=600,height=700');
if (!popup || popup.closed) {
  toast.error('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
  return;
}
```

### postMessage 보안

```typescript
// 콜백 페이지에서 (targetOrigin 명시)
window.opener.postMessage(
  { type: 'SLACK_OAUTH_SUCCESS', userId },
  'https://azrael-002.vercel.app'  // 정확한 origin 지정
);
window.close();
```

## 3.3 연동 해제 및 재연동

| 기능 | 위치 | 동작 |
|------|------|------|
| **연동 해제** | 설정 > Slack 연동 | `slack_user_tokens` 레코드 삭제 → 확인 다이얼로그 |
| **재연동** | 연동 해제 후 수동 | [Slack 연동하기] 버튼 다시 클릭 |

---

# 4. UI 플로우

## 4.1 버튼 위치

**상단 액션 바**에 [슬랙 발신] 버튼 배치 ([이메일 생성] 버튼 옆)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ M4/GL ▼                                                    [⚙️] [로그아웃]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  업데이트일: 2026-02-10 (월)  [계산] [이메일 생성] [슬랙 발신]              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 버튼 활성화 조건

| 상태 | [슬랙 발신] |
|------|-------------|
| 계산 결과 없음 | 비활성화 |
| 계산 결과 있음 + Slack 미연동 | 비활성화 (툴팁: "Slack 연동이 필요합니다") |
| 계산 결과 있음 + Slack 연동됨 | 활성화 |

## 4.2 발신 플로우

```
[슬랙 발신] 버튼 클릭
  ↓
[슬랙 발신 모달]
  ├─ 테이블 선택: ○ T1(내부) ● T2(Ext.) ○ T3(Int.)
  ├─ 채널 선택: #l10n-mir4 ▼ (프로젝트 기본 채널 자동 선택)
  ├─ 메시지 미리보기
  └─ 하단 버튼: [취소] [슬랙에 발신]
  ↓
[슬랙에 발신] 클릭 (버튼 스피너 + 비활성화)
  ↓
slack-send Edge Function 호출
  ↓
성공: Toast "#{채널}에 발신되었습니다" + 모달 닫힘
실패: Toast 에러 메시지 + 모달 유지
```

## 4.3 모달 UI 상세

```
┌─────────────────────────────────────────────────────────────────┐
│ 슬랙 발신                                                  [✕]  │
├─────────────────────────────────────────────────────────────────┤
│ 테이블 선택                                                     │
│ ○ 테이블 1 (내부 일정표)                                        │
│ ● 테이블 2 (Ext. 외부용)                                        │
│ ○ 테이블 3 (Int. 내부용)                                        │
├─────────────────────────────────────────────────────────────────┤
│ 채널 선택                                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ #l10n-mir4                                              ▼   │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ 메시지 미리보기                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📅 *[26-02-10 업데이트 일정]*                               │ │
│ │                                                             │ │
│ │ *헤즈업:* 01/28(화)                                         │ │
│ │ *iOS 심사일:* 02/03(월)                                     │ │
│ │ ---                                                         │ │
│ │ ...                                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                                    [취소]  [슬랙에 발신]        │
└─────────────────────────────────────────────────────────────────┘
```

---

# 5. 기술 구현

## 5.1 데이터 구조

```typescript
interface SlackSendRequest {
  channelId: string;           // Slack 채널 ID (예: C0123456789)
  message: string;             // mrkdwn 형식 메시지
  userId: string;              // 발신자 user_id (body에서 전달)
}

interface SlackSendResponse {
  success: boolean;
  messageTs?: string;          // 발신된 메시지 timestamp (성공 시)
  error?: string;              // 에러 메시지
  errorCode?: string;          // 프로그래밍용 코드
  retryAfter?: number;         // Rate limit 시 재시도 대기 시간 (초)
}

interface SlackChannel {
  id: string;                  // Slack 채널 ID
  name: string;                // 채널 이름 (예: "l10n-mir4")
  isPrivate: boolean;          // 비공개 채널 여부
}
```

## 5.2 Supabase 테이블

### slack_user_tokens

```sql
CREATE TABLE slack_user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,          -- Supabase auth.users.id
  access_token TEXT NOT NULL,            -- Slack User OAuth Token (평문)
  slack_user_id TEXT NOT NULL,           -- Slack 사용자 ID
  team_id TEXT NOT NULL,                 -- Slack Workspace ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE slack_user_tokens ENABLE ROW LEVEL SECURITY;

-- 본인 토큰만 조회 가능
CREATE POLICY "Users can read own slack_user_tokens"
  ON slack_user_tokens FOR SELECT
  USING (auth.uid()::text = user_id);

-- 화이트리스트만 수정 가능
CREATE POLICY "Whitelisted users can modify slack_user_tokens"
  ON slack_user_tokens FOR ALL
  USING (auth.email() IN (
    'jkcho@wemade.com', 'mine@wemade.com', 'srpark@wemade.com',
    'garden0130@wemade.com', 'hkkim@wemade.com'
  ));
```

### slack_channels (프로젝트-채널 매핑)

```sql
CREATE TABLE slack_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,              -- Slack 채널 ID
  channel_name TEXT NOT NULL,            -- 채널 이름 (표시용)
  is_default BOOLEAN DEFAULT false,      -- 해당 프로젝트의 기본 채널 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, channel_id)
);

-- RLS 정책
ALTER TABLE slack_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read slack_channels"
  ON slack_channels FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Whitelisted users can modify slack_channels"
  ON slack_channels FOR ALL
  USING (auth.email() IN (
    'jkcho@wemade.com', 'mine@wemade.com', 'srpark@wemade.com',
    'garden0130@wemade.com', 'hkkim@wemade.com'
  ));
```

> **slack_channels 용도**: 프로젝트별 기본 채널 매핑 저장. 채널 드롭다운은 Slack API 실시간 조회, 이 테이블은 "기본 선택" 값 제공용.

## 5.3 Edge Functions

### slack-send

```typescript
// supabase/functions/slack-send/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { channelId, message, userId } = await req.json();

    // Supabase 클라이언트 생성
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 사용자 토큰 조회
    const { data: tokenData, error: tokenError } = await supabase
      .from('slack_user_tokens')
      .select('access_token')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Slack 연동이 필요합니다.',
          errorCode: 'TOKEN_NOT_FOUND',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Slack API 호출
    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        text: message,
        mrkdwn: true,
      }),
    });

    const slackResult = await slackResponse.json();

    // 토큰 무효화 에러 시 자동 삭제
    if (slackResult.error === 'token_revoked' || slackResult.error === 'invalid_auth') {
      await supabase
        .from('slack_user_tokens')
        .delete()
        .eq('user_id', userId);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Slack 연동이 해제되었습니다. 다시 연동해주세요.',
          errorCode: 'TOKEN_INVALID',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Rate limit 에러
    if (slackResult.error === 'ratelimited') {
      const retryAfter = parseInt(slackResponse.headers.get('Retry-After') || '60', 10);
      return new Response(
        JSON.stringify({
          success: false,
          error: `요청이 너무 많습니다. ${retryAfter}초 후 다시 시도해주세요.`,
          errorCode: 'RATE_LIMITED',
          retryAfter,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    if (!slackResult.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `슬랙 발신 실패: ${slackResult.error}`,
          errorCode: slackResult.error,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageTs: slackResult.ts,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: '서버 오류가 발생했습니다.',
        errorCode: 'INTERNAL_ERROR',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
```

### slack-channels

```typescript
// supabase/functions/slack-channels/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 사용자 토큰 조회
    const { data: tokenData, error: tokenError } = await supabase
      .from('slack_user_tokens')
      .select('access_token')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Slack 연동이 필요합니다.',
          errorCode: 'TOKEN_NOT_FOUND',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // 공개 채널 조회
    const publicResponse = await fetch(
      'https://slack.com/api/conversations.list?types=public_channel&limit=200',
      {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
      }
    );
    const publicResult = await publicResponse.json();

    // 비공개 채널 조회 (사용자가 참가 중인)
    const privateResponse = await fetch(
      'https://slack.com/api/conversations.list?types=private_channel&limit=200',
      {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
      }
    );
    const privateResult = await privateResponse.json();

    // 토큰 무효화 체크
    if (publicResult.error === 'token_revoked' || publicResult.error === 'invalid_auth') {
      await supabase
        .from('slack_user_tokens')
        .delete()
        .eq('user_id', userId);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Slack 연동이 해제되었습니다. 다시 연동해주세요.',
          errorCode: 'TOKEN_INVALID',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Rate limit 체크
    if (publicResult.error === 'ratelimited') {
      const retryAfter = parseInt(publicResponse.headers.get('Retry-After') || '60', 10);
      return new Response(
        JSON.stringify({
          success: false,
          error: `요청이 너무 많습니다. ${retryAfter}초 후 다시 시도해주세요.`,
          errorCode: 'RATE_LIMITED',
          retryAfter,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // 채널 목록 합치기
    const channels = [
      ...(publicResult.channels || []).map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        isPrivate: false,
      })),
      ...(privateResult.channels || []).map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        isPrivate: true,
      })),
    ];

    return new Response(
      JSON.stringify({ success: true, channels }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: '서버 오류가 발생했습니다.',
        errorCode: 'INTERNAL_ERROR',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
```

### slack-oauth-callback

> **구현 참고**: Context7에서 Slack OAuth 공식 문서를 참조하여 구현
>
> 필요 항목:
> 1. `code` → `access_token` 교환 (`oauth.v2.access` API)
> 2. `state` 파라미터 검증
> 3. `slack_user_tokens` 테이블 저장
> 4. 팝업 창 닫기 HTML 응답
> 5. 에러 케이스 처리 (`invalid_code`, `token_exchange_failed` 등)

## 5.4 컴포넌트 구조

```
src/components/
├─ SlackSendModal.tsx            # 슬랙 발신 모달
├─ SlackChannelSelector.tsx      # 채널 선택 드롭다운
├─ SlackPreview.tsx              # 메시지 미리보기
└─ SlackConnectButton.tsx        # 연동/해제 버튼 (설정 화면용)

src/lib/slack/
├─ formatter.ts                  # 메시지 mrkdwn 포맷터
├─ disclaimerConverter.ts        # Disclaimer 태그 → mrkdwn 변환
└─ oauth.ts                      # OAuth 플로우 헬퍼

src/lib/api/
├─ slackSend.ts                  # slack-send Edge Function 호출
├─ slackChannels.ts              # slack-channels Edge Function 호출
└─ slackTokens.ts                # 토큰 상태 조회
```

## 5.5 Rate Limit 자동 재시도

```typescript
async function sendSlackMessageWithRetry(
  request: SlackSendRequest,
  maxRetries = 1
): Promise<SlackSendResponse> {
  let lastError: SlackSendResponse | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch('/functions/v1/slack-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const result: SlackSendResponse = await response.json();

    if (result.success) {
      return result;
    }

    // Rate limit 시 대기 후 재시도
    if (result.errorCode === 'RATE_LIMITED' && attempt < maxRetries) {
      const waitTime = (result.retryAfter || 60) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }

    lastError = result;
    break;
  }

  return lastError!;
}
```

---

# 6. 에러 처리

## 6.1 에러 메시지 표

| 에러 코드 | 사용자 메시지 | 처리 |
|-----------|--------------|------|
| `TOKEN_NOT_FOUND` | "Slack 연동이 필요합니다." | 설정 화면 안내 |
| `TOKEN_INVALID` | "Slack 연동이 해제되었습니다. 다시 연동해주세요." | 토큰 자동 삭제 + 재연동 안내 |
| `RATE_LIMITED` | "{N}초 후 다시 시도해주세요." | 자동 재시도 (1회) |
| `CHANNEL_NOT_FOUND` | "채널을 찾을 수 없습니다." | 채널 재선택 안내 |
| `INTERNAL_ERROR` | "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." | - |

## 6.2 네트워크 에러 메시지

| 상황 | 메시지 |
|------|--------|
| 네트워크 연결 실패 | "네트워크 연결을 확인해주세요." |
| 서버 응답 없음 | "서버가 응답하지 않습니다. 잠시 후 다시 시도해주세요." |
| 서버 오류 (5xx) | "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." |

---

# 7. 배포 가이드

## 7.1 환경변수

| 변수명 | 용도 | 설정 위치 |
|--------|------|-----------|
| `SLACK_CLIENT_ID` | Slack App Client ID | Supabase Edge Function Secrets |
| `SLACK_CLIENT_SECRET` | Slack App Client Secret | Supabase Edge Function Secrets |
| `SLACK_REDIRECT_URI` | OAuth 콜백 URL | Supabase Edge Function Secrets |

### 설정 방법

```bash
# Supabase CLI
supabase secrets set SLACK_CLIENT_ID=your_client_id
supabase secrets set SLACK_CLIENT_SECRET=your_client_secret
supabase secrets set SLACK_REDIRECT_URI=https://your-project.supabase.co/functions/v1/slack-oauth-callback
```

## 7.2 Slack App 설정

1. [Slack API](https://api.slack.com/apps)에서 새 앱 생성
2. OAuth & Permissions 메뉴에서:
   - Redirect URL 추가: `https://your-project.supabase.co/functions/v1/slack-oauth-callback`
   - User Token Scopes: `chat:write`, `channels:read`, `groups:read`
3. Basic Information에서 Client ID, Client Secret 복사
4. Workspace에 앱 설치 (관리자 승인 필요할 수 있음)

---

# 8. DB 마이그레이션

## 007_phase3_slack.sql

```sql
-- Slack 사용자 토큰 테이블
CREATE TABLE slack_user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  slack_user_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE slack_user_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own slack_user_tokens"
  ON slack_user_tokens FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Whitelisted users can modify slack_user_tokens"
  ON slack_user_tokens FOR ALL
  USING (auth.email() IN (
    'jkcho@wemade.com', 'mine@wemade.com', 'srpark@wemade.com',
    'garden0130@wemade.com', 'hkkim@wemade.com'
  ));

-- 프로젝트-채널 매핑 테이블
CREATE TABLE slack_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, channel_id)
);

ALTER TABLE slack_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read slack_channels"
  ON slack_channels FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Whitelisted users can modify slack_channels"
  ON slack_channels FOR ALL
  USING (auth.email() IN (
    'jkcho@wemade.com', 'mine@wemade.com', 'srpark@wemade.com',
    'garden0130@wemade.com', 'hkkim@wemade.com'
  ));
```

---

# 9. 사용자 스토리

**스토리 1**: 슬랙 메시지 자동 발신
- **As a** L10n 팀원
- **I want to** 계산된 일정을 슬랙 채널에 자동으로 공유하고 싶다
- **So that** 팀원들이 슬랙에서 바로 일정을 확인할 수 있다

**스토리 2**: 채널 선택
- **As a** L10n 팀원
- **I want to** 프로젝트별로 다른 슬랙 채널에 발신하고 싶다
- **So that** 관련 팀원에게만 정보를 공유할 수 있다

---

# 10. 성공 지표

| 기능 | 지표 | 목표 |
|------|------|------|
| 슬랙 발신 | 메시지 작성 시간 단축 | 95% (5분 → 15초) |

---

# 11. 참조 문서

- **Master**: [Azrael-PRD-Master.md](./Azrael-PRD-Master.md)
- **Shared**: [Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)
- **Phase 2 (이메일)**: [Azrael-PRD-Phase2.md](./Azrael-PRD-Phase2.md)
- **Phase 4 (프리셋)**: [Azrael-PRD-Phase4.md](./Azrael-PRD-Phase4.md)
- **Design**: [Azrael-PRD-Design.md](./Azrael-PRD-Design.md)

---

**문서 종료**
