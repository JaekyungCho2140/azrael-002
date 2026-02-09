# Phase 3 배포 가이드

**작성일**: 2026-02-09
**대상**: Vercel + Supabase 환경 변수 설정 및 배포

---

## 1. Vercel 환경 변수 설정

### 방법 1: Vercel Dashboard (권장)

1. https://vercel.com/dashboard 접속
2. `azrael-002` 프로젝트 선택
3. Settings → Environment Variables
4. 아래 3개 변수 추가:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_SLACK_CLIENT_ID` | `<Slack App Client ID>` | Production, Preview, Development |
| `VITE_SLACK_REDIRECT_URI` | `https://vgoqkyqqkieogrtnmsva.supabase.co/functions/v1/slack-oauth-callback` | Production, Preview, Development |
| `VITE_APP_ORIGIN` | `https://azrael-002.vercel.app` | Production |

5. Save

> **참고**: Slack App Client ID는 Slack App 생성 후 제공됩니다 (https://api.slack.com/apps).

### 방법 2: Vercel CLI

```bash
# Production 환경 변수 설정
vercel env add VITE_SLACK_CLIENT_ID production
# 입력: <Slack App Client ID>

vercel env add VITE_SLACK_REDIRECT_URI production
# 입력: https://vgoqkyqqkieogrtnmsva.supabase.co/functions/v1/slack-oauth-callback

vercel env add VITE_APP_ORIGIN production
# 입력: https://azrael-002.vercel.app

# Preview/Development 환경도 동일하게 추가 (필요 시)
vercel env add VITE_SLACK_CLIENT_ID preview
vercel env add VITE_SLACK_REDIRECT_URI preview

vercel env add VITE_SLACK_CLIENT_ID development
vercel env add VITE_SLACK_REDIRECT_URI development
```

---

## 2. Supabase Edge Function 환경 변수 설정

### 방법 1: Supabase Dashboard (권장)

1. https://supabase.com/dashboard/project/vgoqkyqqkieogrtnmsva 접속
2. Settings → Edge Functions
3. Add secret 클릭
4. 아래 4개 변수 추가:

| Name | Value |
|------|-------|
| `SLACK_CLIENT_ID` | `<Slack App Client ID>` |
| `SLACK_CLIENT_SECRET` | `<Slack App Client Secret>` |
| `SLACK_REDIRECT_URI` | `https://vgoqkyqqkieogrtnmsva.supabase.co/functions/v1/slack-oauth-callback` |
| `APP_ORIGIN` | `https://azrael-002.vercel.app` |

5. Save

> **보안 참고**:
> - `SLACK_CLIENT_SECRET`은 절대 공개하지 마세요.
> - Git repository에 포함되지 않도록 주의하세요.
> - .env 파일은 .gitignore에 등록되어 있습니다.

### 방법 2: Supabase CLI

```bash
# Edge Function Secret 설정
supabase secrets set SLACK_CLIENT_ID="<Slack App Client ID>" --project-ref vgoqkyqqkieogrtnmsva
supabase secrets set SLACK_CLIENT_SECRET="<Slack App Client Secret>" --project-ref vgoqkyqqkieogrtnmsva
supabase secrets set SLACK_REDIRECT_URI="https://vgoqkyqqkieogrtnmsva.supabase.co/functions/v1/slack-oauth-callback" --project-ref vgoqkyqqkieogrtnmsva
supabase secrets set APP_ORIGIN="https://azrael-002.vercel.app" --project-ref vgoqkyqqkieogrtnmsva

# 설정 확인
supabase secrets list --project-ref vgoqkyqqkieogrtnmsva
```

---

## 3. Slack App 생성 (사용자가 직접 진행)

### 단계별 가이드

1. **Slack App 생성**
   - https://api.slack.com/apps → [Create New App] 클릭
   - "From scratch" 선택
   - App Name: `Azrael` (또는 원하는 이름)
   - Workspace: Wemade 또는 테스트용 워크스페이스
   - [Create App] 클릭

2. **OAuth & Permissions 설정**
   - 좌측 메뉴 → OAuth & Permissions
   - **Redirect URLs** 섹션:
     - [Add New Redirect URL] 클릭
     - URL 입력: `https://vgoqkyqqkieogrtnmsva.supabase.co/functions/v1/slack-oauth-callback`
     - [Save URLs] 클릭
   - **User Token Scopes** 섹션 (⚠️ Bot Token Scopes 아님!):
     - [Add an OAuth Scope] 클릭 (User Token Scopes 아래에서)
     - `chat:write` 추가
     - `channels:read` 추가
     - `groups:read` 추가

3. **Client ID/Secret 확인**
   - 좌측 메뉴 → Basic Information
   - **App Credentials** 섹션:
     - Client ID: 복사 → Vercel 환경 변수에 사용
     - Client Secret: [Show] → 복사 → Supabase Secret에 사용

4. **Workspace 설치 (선택 사항)**
   - Install to Workspace는 **하지 않습니다**.
   - User OAuth Token을 사용하므로 Bot 설치 불필요.
   - 각 사용자가 개별적으로 OAuth 인증 진행.

### Slack App 설정 완료 체크리스트

- [ ] App 생성 완료
- [ ] Redirect URL 설정: `https://vgoqkyqqkieogrtnmsva.supabase.co/functions/v1/slack-oauth-callback`
- [ ] User Token Scopes 3개 추가: `chat:write`, `channels:read`, `groups:read`
- [ ] Client ID 확인 및 복사
- [ ] Client Secret 확인 및 복사 (⚠️ 공개 금지)

---

## 4. Git Push → Vercel 자동 배포

### 현재 상태 확인

```bash
git status
# On branch main
# Your branch is ahead of 'origin/main' by 1 commit.
# Commit: a1a56ec feat: Phase 3 Slack 연동 구현 완료
```

### Push 실행

```bash
git push origin main
```

### Vercel 배포 모니터링

1. https://vercel.com/dashboard/azrael-002 접속
2. Deployments 탭에서 진행 상황 확인
3. 배포 완료 후 Preview/Production URL 확인
4. Logs 탭에서 빌드 로그 확인

### 배포 완료 확인

- ✅ Build 성공 (TypeScript 에러 없음)
- ✅ Production URL 접속 가능
- ✅ 설정 > Slack 탭 표시
- ✅ [Slack 연동하기] 버튼 표시
- ✅ 환경 변수 정상 로드 확인:
  ```typescript
  console.log('SLACK_CLIENT_ID:', import.meta.env.VITE_SLACK_CLIENT_ID);
  // undefined가 아니어야 함
  ```

---

## 5. Edge Functions 환경 변수 적용 확인

Edge Function 환경 변수는 배포 시점에 적용되므로, Secret 설정 후 **재배포 필요**:

```bash
# 재배포 (환경 변수 적용)
supabase functions deploy slack-oauth-callback --no-verify-jwt --project-ref vgoqkyqqkieogrtnmsva
supabase functions deploy slack-channels --no-verify-jwt --project-ref vgoqkyqqkieogrtnmsva
supabase functions deploy slack-send --no-verify-jwt --project-ref vgoqkyqqkieogrtnmsva
```

> **참고**: Edge Function은 이미 배포되어 있으므로, Secret 설정 후 재배포하지 않으면 환경 변수가 반영되지 않습니다.

---

## 6. 프로덕션 테스트

### 최종 검증 체크리스트

- [ ] Vercel 배포 완료
- [ ] Edge Functions 3개 배포 완료
- [ ] 환경 변수 설정 완료 (Vercel 3개 + Supabase 4개)
- [ ] Slack App 생성 완료 (Client ID/Secret 확보)
- [ ] OAuth 플로우 테스트 (프로덕션 환경)
- [ ] 채널 목록 조회 테스트
- [ ] 메시지 발신 테스트
- [ ] 스레드 리플라이 테스트
- [ ] 에러 처리 테스트

---

## 배포 후 모니터링

### 1주차 모니터링 항목

- **사용자 피드백**: 팀원 사용 편의성, 버그 리포트
- **Edge Function 로그**: 에러 발생 빈도, 응답 시간
- **Slack API Rate Limit**: 제한 도달 여부
- **토큰 만료**: 자동 삭제 로직 동작 확인

### 개선 사항 (Phase 4 이후)

- 메시지 수정 기능 (Slack API `chat.update`)
- 메시지 삭제 기능 (Slack API `chat.delete`)
- 메시지 발신 이력 조회
- 멀티 채널 동시 발신
- 예약 발신 (특정 시각에 자동 발신)

---

**문서 종료**
