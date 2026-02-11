# Azrael 설정 가이드

**대상**: L10n팀 내부 사용
**작성일**: 2026-01-12 (최종 업데이트: 2026-02-10)

---

## 1. Google OAuth 설정

### 1.1. Google Cloud Console 설정

**필수 단계**:

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/

2. **프로젝트 생성**
   - 프로젝트 이름: "Azrael L10n Scheduler"
   - 위치: wemade.com 조직

3. **OAuth 동의 화면 설정**
   - APIs & Services → OAuth consent screen
   - User Type: **Internal** (wemade.com 내부 전용)
   - 앱 이름: Azrael
   - 사용자 지원 이메일: jkcho@wemade.com
   - 승인된 도메인: wemade.com
   - 범위: email, profile

4. **OAuth 클라이언트 ID 생성**
   - APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Application type: **Web application**
   - 이름: Azrael Web Client
   - Authorized JavaScript origins:
     - http://localhost:3000 (개발)
     - https://your-deployment-url.vercel.app (배포 후)
   - Authorized redirect URIs:
     - http://localhost:3000
     - https://your-deployment-url.vercel.app

5. **클라이언트 ID 복사**
   - 생성된 클라이언트 ID를 복사
   - 예: `123456789-abcdefg.apps.googleusercontent.com`

### 1.2. 코드에 클라이언트 ID 추가

`.env` 파일에 추가:
```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
```

`src/components/LoginScreen.tsx` 수정 (TODO 구현):
```typescript
// Google Identity Services 로드
useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  document.body.appendChild(script);
}, []);

// OAuth 버튼 클릭
const handleGoogleLogin = () => {
  window.google.accounts.oauth2.initCodeClient({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    scope: 'email profile',
    callback: (response) => {
      // ID 토큰 파싱하여 이메일 추출
      // 화이트리스트 검증
      // onLogin(email) 호출
    }
  }).requestCode();
};
```

### 1.3. 화이트리스트 검증

현재 설정된 이메일 (L10n팀 5인):
- jkcho@wemade.com
- mine@wemade.com
- srpark@wemade.com
- garden0130@wemade.com
- hkkim@wemade.com

⚠️ **중요**: `.env` 파일은 클라이언트에 포함되므로 화이트리스트가 노출됩니다. 내부 팀 전용으로만 사용하세요.

---

## 2. 공휴일 API 설정

### 2.1. API 키 발급

**공공데이터포털** (대한민국 공공데이터):

1. **회원가입/로그인**
   - https://www.data.go.kr/

2. **API 찾기**
   - "특일 정보 조회" 또는 "국경일 정보"
   - URL: https://www.data.go.kr/data/15012690/openapi.do

3. **활용신청**
   - [활용신청] 버튼 클릭
   - 용도: 내부 업무용
   - 승인 대기 (보통 즉시 또는 몇 시간 이내)

4. **API 키 확인**
   - 마이페이지 → 오픈API → 인증키 발급현황
   - 일반 인증키(Encoding) 복사
   - 예: `abcdefg1234567890==`

### 2.2. API 키 설정

`.env` 파일에 추가:
```env
VITE_HOLIDAY_API_KEY=your_actual_api_key_here
```

**⚠️ 주의**:
- 키는 URL 인코딩된 상태로 발급됩니다
- `=` 기호가 포함될 수 있으니 따옴표 없이 그대로 입력

### 2.3. API 테스트 방법

**Azrael에서 테스트**:
1. `.env` 파일에 실제 API 키 입력
2. 개발 서버 재시작: `npm run dev`
3. Azrael 접속 → [⚙️ 설정] → 공휴일 탭
4. **[🔄 공휴일 불러오기 (API)]** 버튼 클릭
5. 성공 시: "공휴일을 성공적으로 불러왔습니다." 메시지
6. 테이블에 2026년 공휴일 목록 표시

**브라우저 콘솔에서 직접 테스트**:
```javascript
// F12 → Console
const apiKey = 'your_api_key_here';
const year = 2026;
const url = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?solYear=${year}&ServiceKey=${apiKey}`;

fetch(url)
  .then(res => res.text())
  .then(xml => console.log(xml));

// 성공 시: XML 응답 표시
// 실패 시: resultCode=99, resultMsg 확인
```

**일반적인 오류**:
- `resultCode: 99` → API 키가 잘못됨 또는 승인 대기 중
- `resultCode: 12` → 서비스 키 미등록
- `CORS 오류` → API는 서버에서 호출해야 하나, 브라우저에서도 가능 (CORS 허용됨)

### 2.4. API 응답 예시

**성공 응답**:
```xml
<response>
  <header>
    <resultCode>00</resultCode>
    <resultMsg>NORMAL SERVICE.</resultMsg>
  </header>
  <body>
    <items>
      <item>
        <dateKind>01</dateKind>
        <dateName>신정</dateName>
        <isHoliday>Y</isHoliday>
        <locdate>20260101</locdate>
        <seq>1</seq>
      </item>
      <item>
        <dateKind>01</dateKind>
        <dateName>설날</dateName>
        <isHoliday>Y</isHoliday>
        <locdate>20260216</locdate>
        <seq>1</seq>
      </item>
      ...
    </items>
  </body>
</response>
```

Azrael은 `locdate`를 Date로 변환하고 `dateName`을 이름으로 저장합니다.

---

## 3. Slack OAuth 설정 (Phase 3)

### 3.1. Slack App 생성

1. **Slack API 접속**
   - https://api.slack.com/apps

2. **Create New App** → **From scratch**
   - App Name: "Azrael L10n"
   - 워크스페이스 선택

3. **OAuth & Permissions 설정**
   - Redirect URLs: `https://your-project.supabase.co/functions/v1/slack-oauth-callback`
   - User Token Scopes:
     - `chat:write` (메시지 발신)
     - `channels:read` (공개 채널 목록)
     - `groups:read` (비공개 채널 목록)
     - `files:write` (이미지 첨부)

4. **Basic Information에서 키 복사**
   - Client ID → `.env`의 `VITE_SLACK_CLIENT_ID`
   - Client Secret → Supabase Edge Functions 환경 변수

### 3.2. 환경 변수 설정

`.env` 파일에 추가:
```env
VITE_SLACK_CLIENT_ID=your_slack_client_id
VITE_SLACK_REDIRECT_URI=https://your-project.supabase.co/functions/v1/slack-oauth-callback
```

### 3.3. Supabase Edge Functions 환경 변수

Supabase Dashboard → Settings → Edge Functions → Environment Variables:
```
SLACK_CLIENT_SECRET=your_slack_client_secret
```

### 3.4. DB 마이그레이션

`009_phase3_slack.sql` 실행 (Supabase Dashboard → SQL Editor):
- `slack_tokens` 테이블: 사용자별 Slack OAuth 토큰 저장
- `slack_message_templates` 테이블: 프로젝트별 메시지 템플릿
- `projects` 테이블에 `slack_channel_id`, `slack_channel_name` 컬럼 추가

### 3.5. Phase 4 마이그레이션

`010_phase4_presets.sql` 실행 (Supabase Dashboard → SQL Editor):
- `preset_slots` 테이블: 프로젝트별, 사용자별 몰아보기 슬롯 저장
- RLS 정책: 본인 데이터만 읽기/쓰기
- UNIQUE 제약: (user_id, project_id, slot_index), (user_id, project_id, name)
- ON DELETE CASCADE: calculation_results, projects 삭제 시 연쇄 삭제

### 3.6. Edge Functions 배포

```bash
supabase functions deploy slack-oauth-callback --no-verify-jwt
supabase functions deploy slack-channels --no-verify-jwt
supabase functions deploy slack-send --no-verify-jwt
```

### 3.7. Slack 연동 테스트

1. Azrael 접속 → 설정 → Slack 탭
2. "Slack 연동하기" 클릭 → OAuth 팝업 → 승인
3. "Slack 연동이 완료되었습니다!" 확인
4. 채널 매핑 → 프로젝트 선택 → 채널 선택
5. 메인 화면 → 계산 → "Slack 발신" → 메시지 확인

---

## 4. 개발 서버 재시작

`.env` 파일 수정 후 **반드시 재시작**:

```bash
# 기존 서버 종료: Ctrl+C

# 재시작
npm run dev
```

Vite는 환경 변수 변경 시 HMR로 자동 반영되지 않습니다!

---

## 5. Google OAuth 테스트 (현재 미구현)

**현재 상태**:
- `VITE_DEV_MODE=false`로 설정
- 로그인 화면에서 이메일 입력 + 화이트리스트 검증만 구현됨
- **실제 Google OAuth 버튼은 TODO 상태**

**테스트 방법** (현재):
1. http://localhost:3000 접속
2. 자동 로그인 **안 됨** (DEV_MODE=false)
3. 로그인 화면에서 이메일 입력: `jkcho@wemade.com`
4. [🔐 로그인] 버튼 클릭
5. 화이트리스트 검증 → 온보딩 화면 진입

**완전한 OAuth 구현 필요 시**:
- Google Identity Services 라이브러리 통합
- OAuth 토큰 → 이메일 추출 로직
- 예상 작업: 2-3시간

---

## 6. 현재 작동 방식

**DEV_MODE=false**:
- 자동 로그인 비활성화
- 이메일 입력 필드 + 화이트리스트 검증
- wemade.com 이메일만 로그인 가능

**실제 Gmail 버튼 추가 시**:
- Google Identity Services 스크립트 로드
- OAuth 팝업 → Gmail 선택 → 이메일 추출
- 화이트리스트 검증 → 로그인

---

**문서 버전**: 2.1
**마지막 업데이트**: 2026-02-10
