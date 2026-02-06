# Azrael - L10n 일정 관리 도구

**Phase 2 완료**: 이메일 생성, 번들 최적화, 코드 리팩토링 완료

웹 기반 L10n 일정 계산 및 JIRA 연동 도구입니다.

---

## 핵심 기능

### Phase 0 - 기본 일정 관리
- **영업일 역산 계산**: 업데이트일 기준 영업일 자동 계산 (주말/공휴일 제외)
- **3개 테이블 출력**: 일정표, Ext. 일정표, Int. 일정표
- **간트 차트 시각화**: Frappe Gantt 기반 3개 차트
- **캘린더 뷰**: FullCalendar 기반 월간 캘린더
- **이미지 복사**: html2canvas 기반 클립보드 복사 (Retina 2배 해상도)
- **프로젝트 관리**: 기본 프로젝트 + 사용자 추가 프로젝트
- **공휴일 관리**: 공공데이터포털 API 연동 + 수동 추가

### Phase 0.5 - 하위 일감 템플릿
- **하위 일감 시스템**: 최대 9개 하위 일감 템플릿
- **계층 구조**: 부모-자식 관계 (최대 2단계)
- **JIRA Summary 템플릿**: 변수 기반 동적 Summary 생성

### Phase 1 - JIRA 연동
- **JIRA Epic/Task/Subtask 자동 생성**: 3단계 분리 로직
- **JIRA 업데이트**: 기존 일감 날짜/내용 업데이트
- **이슈 타입 설정**: 프로젝트별, 업무 단계별 커스텀 가능
- **Supabase Edge Functions**: jira-create, jira-update, jira-check

### Phase 1.7 - 계산 결과 서버화 및 부가 정보 관리 (2026-01-20)
- **계산 결과 서버 저장**: 프로젝트 + 업데이트일별 팀 공유
- **부가 정보 템플릿 관리**: 설명, 담당자, JIRA 설명, JIRA 담당자
- **JIRA 담당자 시스템**: 5명 매핑, 드롭다운, 이름 표시
- **읽기 전용 테이블**: 완전한 읽기 전용 일정표
- **이미지 복사 최적화**: 필요한 열만 선택적 복사
- **JIRA Description ADF 변환**: 평문 → Atlassian Document Format

### Phase 1.8 - JIRA 일감 존재 확인 (2026-01-21)
- **JIRA 일감 존재 확인**: jira-check Edge Function으로 중복 생성 방지

### Phase 2 - 이메일 생성 + UI/UX 개선 (2026-02-02)
- **이메일 생성**: 템플릿 기반 일정 안내 이메일 자동 생성 & 클립보드 복사
- **이메일 템플릿 관리**: 프로젝트별 이메일 템플릿 CRUD (Tiptap 리치 에디터)
- **변수 시스템**: `{{updateDate}}`, `{{table}}`, `{{disclaimer}}` 등 자동 치환
- **조건부 블록**: `{{#if showIosReviewDate}}...{{/if}}`
- **Gmail/Outlook 호환**: 인라인 CSS, 테이블 속성 호환
- **유료화 상품 협의 일정**: Offset 기반 자동 계산 + Disclaimer 변수

### 코드 품질 개선 (2026-02-06)
- **컴포넌트 분할**: SettingsScreen 5탭 분리, MainScreen JIRA 로직 훅 추출
- **번들 최적화**: 코드 스플리팅으로 초기 로드 78% 감소 (~120KB gzip)
- **접근성 개선**: ARIA 속성, 키보드 내비게이션
- **디자인 토큰 통일**: CSS 변수 기반 일관된 스타일링

---

## 기술 스택

### 프론트엔드
- **Framework**: React 18.3 + TypeScript 5.6 + Vite 5.4
- **상태 관리**: React Query 5.90
- **데이터베이스**: Supabase PostgreSQL
- **인증**: Google OAuth + Supabase Auth
- **Charts**: Frappe Gantt v1.0.4, FullCalendar v6.1
- **이메일 에디터**: Tiptap 3.18 (리치 텍스트)
- **Utils**: html2canvas v1.4.1, juice v11.1 (CSS 인라이너)

### 백엔드
- **BaaS**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Edge Functions**: Deno (jira-create, jira-update, jira-check)
- **RLS**: Row Level Security (읽기: 전체, 쓰기: 화이트리스트 5명)

### 배포
- **프론트엔드**: Vercel (자동 배포)
- **Edge Functions**: Supabase Functions (수동 배포)
- **데이터베이스**: Supabase Cloud

---

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env` 파일 생성:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your-google-client-id

# 화이트리스트
VITE_ALLOWED_USERS=user1@company.com,user2@company.com

# 개발 모드 (선택)
VITE_DEV_MODE=false

# 공휴일 API
VITE_HOLIDAY_API_KEY=your-api-key
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 4. Supabase 마이그레이션 (최초 1회)

Supabase Dashboard → SQL Editor에서 순서대로 실행:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_calculation_results.sql`
3. `supabase/migrations/002_phase0_5_and_phase1_jira_integration.sql`
4. `supabase/migrations/003_jira_assignees.sql`
5. `supabase/migrations/004_work_stages_extension.sql`
6. `supabase/migrations/005_headsup_description.sql`
7. `supabase/migrations/006_phase2_email_templates.sql`
8. `supabase/migrations/006b_phase2_schedule_entries_extension.sql`
9. `supabase/migrations/007_paid_product_offset.sql`

---

## 명령어

```bash
npm run dev        # 개발 서버 (포트 3000)
npm run build      # 프로덕션 빌드
npm run preview    # 빌드 미리보기
npm test           # 단위 테스트 (Vitest, 110개)
npm run typecheck  # TypeScript 타입 체크
```

### Supabase CLI (Edge Functions)

```bash
supabase functions deploy jira-create   # jira-create 배포
supabase functions deploy jira-update   # jira-update 배포
supabase functions deploy jira-check    # jira-check 배포
```

---

## 프로젝트 구조

```
azrael-002/
├── src/
│   ├── components/       # UI 컴포넌트 (29개)
│   │   ├── MainScreen.tsx
│   │   ├── ScheduleTable.tsx
│   │   ├── EmailGeneratorModal.tsx
│   │   ├── JiraPreviewModal.tsx
│   │   ├── settings/           # 설정 탭 컴포넌트 (5개)
│   │   │   ├── SettingsProjectsTab.tsx
│   │   │   ├── SettingsStagesTab.tsx
│   │   │   ├── SettingsHolidaysTab.tsx
│   │   │   ├── SettingsJiraTab.tsx
│   │   │   └── SettingsEmailTemplatesTab.tsx
│   │   └── ...
│   ├── hooks/            # React Hooks (5개)
│   │   ├── useSupabase.ts      # React Query 훅
│   │   ├── useJiraOperations.ts
│   │   ├── useEmailTemplates.ts
│   │   ├── useImageCopy.ts
│   │   └── useToast.ts
│   ├── lib/
│   │   ├── api/          # Supabase API 레이어 (6개)
│   │   │   ├── projects.ts
│   │   │   ├── templates.ts
│   │   │   ├── holidays.ts
│   │   │   ├── jira.ts
│   │   │   ├── calculations.ts
│   │   │   └── emailTemplates.ts
│   │   ├── email/        # 이메일 생성 엔진 (6개)
│   │   │   ├── emailGenerator.ts
│   │   │   ├── templateParser.ts
│   │   │   ├── formatters.ts
│   │   │   ├── sanitizer.ts
│   │   │   ├── clipboard.ts
│   │   │   └── templates.ts
│   │   ├── jira/         # JIRA 템플릿 헬퍼
│   │   ├── businessDays.ts  # 영업일 계산 엔진
│   │   ├── storage.ts       # LocalStorage 유틸
│   │   └── supabase.ts      # Supabase 클라이언트
│   ├── types/            # TypeScript 타입 (5개)
│   │   ├── index.ts
│   │   ├── supabase.ts
│   │   ├── supabase-generated.ts
│   │   ├── event-calendar.d.ts
│   │   └── frappe-gantt.d.ts
│   ├── constants.ts      # 프론트엔드 상수 (16개)
│   └── scripts/          # 마이그레이션 스크립트
├── supabase/
│   ├── migrations/       # DB 스키마 (9개)
│   └── functions/        # Edge Functions (3개)
│       ├── jira-create/
│       ├── jira-update/
│       ├── jira-check/
│       └── _shared/      # 공유 모듈 (adf.ts, constants.ts)
├── prd/                  # PRD 문서 (9개)
├── docs/                 # 사용자 매뉴얼, 테스트 시나리오
├── CLAUDE.md             # 개발 가이드
└── README.md
```

---

## 아키텍처 원칙

### 데이터 흐름

```
[프론트엔드]
    ↓ Google OAuth
[Supabase Auth] → RLS 검증
    ↓
[React Query] ← Supabase API
    ├─ Projects, Templates, WorkStages, Holidays (팀 공유)
    ├─ CalculationResults, ScheduleEntries (팀 공유)
    ├─ JiraAssignees, EmailTemplates (팀 공유)
    └─ UserState, JiraConfig (LocalStorage, 개인)
    ↓
[MainScreen] → 계산 → 테이블 출력 → JIRA 생성 / 이메일 복사
    ↓
[Edge Functions] → JIRA API
```

### 핵심 설계 원칙

1. **WorkStage = 단일 진실 공급원**
   - WorkStage 1개 = JIRA Task 1개 (1:1 매핑)
   - 부가 정보(설명, 담당자)는 WorkStage 템플릿에 저장
   - 모든 업데이트일에 공통 적용

2. **읽기 전용 테이블**
   - 계산 결과 테이블(T1/T2/T3)은 완전 읽기 전용
   - 편집은 설정 > 업무 단계에서만 가능

3. **팀 공유 계산 결과**
   - 프로젝트 + 업데이트일 = 1개 계산 결과 (서버 저장)
   - 누구든 같은 조건 계산 → 같은 결과 조회

4. **lib/ 순수 함수**
   - LocalStorage 직접 접근 금지
   - Date 직렬화: JSON.parse 후 수동 복원

5. **번들 최적화**
   - 코드 스플리팅: lazy() + Suspense로 주요 컴포넌트 지연 로드
   - 벤더 청크 분리: react-vendor, supabase, query
   - 동적 import: html2canvas (클릭 시점 로드)

---

## 테스트

### 단위 테스트

```bash
npm test
```

**110개 테스트** (3개 테스트 파일):
- businessDays.test.ts: 영업일 역산 계산, 날짜 형식 변환, 유료화 상품일 계산
- storage.test.ts: LocalStorage Date 직렬화, 하위 일감 계층 구조
- email.test.ts: 이메일 생성, 템플릿 파싱, 변수 치환, Gmail/Outlook 호환성, 클립보드

### 통합 테스트

테스트 시나리오: `docs/test-scenarios.html`

---

## 성능 지표

- **계산 성능**: < 1초
- **렌더링**: < 1초 (3개 테이블 + 3개 차트 + 캘린더)
- **빌드 크기** (코드 스플리팅 적용):
  - 초기 로드: ~120KB gzip (index + react-vendor + supabase)
  - 전체: ~560KB gzip (26개 청크)
  - CSS: ~39KB (10개 파일, gzip ~11KB)
- **빌드 시간**: ~2초

---

## 보안 및 권한

### RLS (Row Level Security)

**읽기**: 모든 인증된 사용자
**쓰기**: 화이트리스트 5명만
- jkcho@wemade.com
- mine@wemade.com
- srpark@wemade.com
- garden0130@wemade.com
- hkkim@wemade.com

### JIRA 담당자 매핑

| 이름 | JIRA Account ID |
|------|----------------|
| 조재경 | 617f7523f485cd0068077192 |
| 김민혜 | 62b57632f38b4dcf73daedb2 |
| 임정원 | 712020:1a1a9943-9787-44e1-b2da-d4f558df471e |
| 박선률 | 6209c939bba9ca0070c94b16 |
| 김홍균 | 712020:f337238b-f5a1-4c32-8b58-7b699889da3e |

---

## 개발 가이드

### Edge Functions 배포

```bash
# jira-create 배포
supabase functions deploy jira-create --no-verify-jwt

# jira-update 배포
supabase functions deploy jira-update --no-verify-jwt

# jira-check 배포
supabase functions deploy jira-check --no-verify-jwt
```

**주의**: Edge Functions는 자동 배포되지 않으므로, 코드 변경 시 수동 배포 필요

### 새 마이그레이션 추가

1. `supabase/migrations/00X_description.sql` 생성
2. Supabase Dashboard → SQL Editor 실행
3. 메모리 업데이트 (`azrael-supabase-backend`)

---

## 참조 문서

- **개발 가이드**: [CLAUDE.md](./CLAUDE.md)
- **빠른 시작**: [QUICK_START.md](./QUICK_START.md)
- **사용자 매뉴얼**: [docs/user-manual.html](./docs/user-manual.html)
- **테스트 시나리오**: [docs/test-scenarios.html](./docs/test-scenarios.html)
- **PRD 문서**: [prd/](./prd/)
  - [Master PRD](./prd/Azrael-PRD-Master.md)
  - [Shared Specs](./prd/Azrael-PRD-Shared.md)
  - [Phase 0](./prd/Azrael-PRD-Phase0.md)
  - [Phase 1](./prd/Azrael-PRD-Phase1.md)
  - [Phase 2](./prd/Azrael-PRD-Phase2.md)
  - [Design](./prd/Azrael-PRD-Design.md)

---

## 배포 정보

**프로덕션**: https://azrael-002.vercel.app

**최신 배포**:
- 프론트엔드: 커밋 695223d (2026-02-06)
- Edge Functions: jira-create, jira-update, jira-check
- DB: 9개 마이그레이션 완료

**Git Repository**: https://github.com/JaekyungCho2140/azrael-002

---

## 알려진 이슈

**없음** (테스트 110/110 통과, TypeScript 체크 통과)

---

## 라이선스

MIT License

---

## 기여자

L10n팀 내부 프로젝트

---

**최종 업데이트**: 2026-02-06 (Phase 2 완료 + 코드 품질 개선)
