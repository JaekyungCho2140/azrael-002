# Azrael - L10n 일정 관리 도구

**Phase 1.7 완료**: 계산 결과 서버화 및 부가 정보 관리

웹 기반 L10n 일정 계산 및 JIRA 연동 도구입니다.

---

## 🎯 핵심 기능

### Phase 0 - 기본 일정 관리 ✅
- ✅ **영업일 역산 계산**: 업데이트일 기준 영업일 자동 계산 (주말/공휴일 제외)
- ✅ **3개 테이블 출력**: 일정표, Ext. 일정표, Int. 일정표
- ✅ **간트 차트 시각화**: Frappe Gantt 기반 3개 차트
- ✅ **캘린더 뷰**: FullCalendar 기반 월간 캘린더
- ✅ **이미지 복사**: html2canvas 기반 클립보드 복사 (Retina 2배 해상도)
- ✅ **프로젝트 관리**: 9개 기본 프로젝트 + 사용자 추가 프로젝트
- ✅ **공휴일 관리**: 공공데이터포털 API 연동 + 수동 추가

### Phase 0.5 - 하위 일감 템플릿 ✅
- ✅ **하위 일감 시스템**: 최대 9개 하위 일감 템플릿
- ✅ **계층 구조**: 부모-자식 관계 (최대 2단계)
- ✅ **JIRA Summary 템플릿**: 변수 기반 동적 Summary 생성

### Phase 1 - JIRA 연동 ✅
- ✅ **JIRA Epic/Task/Subtask 자동 생성**: 3단계 분리 로직
- ✅ **JIRA 업데이트**: 기존 일감 날짜/내용 업데이트
- ✅ **이슈 타입 설정**: 프로젝트별, 업무 단계별 커스텀 가능
- ✅ **Supabase Edge Functions**: jira-create, jira-update

### Phase 1.7 - 계산 결과 서버화 및 부가 정보 관리 ✅ (2026-01-20)
- ✅ **계산 결과 서버 저장**: 프로젝트 + 업데이트일별 팀 공유
- ✅ **부가 정보 템플릿 관리**: 설명, 담당자, JIRA 설명, JIRA 담당자
- ✅ **JIRA 담당자 시스템**: 5명 매핑, 드롭다운, 이름 표시
- ✅ **읽기 전용 테이블**: 완전한 읽기 전용 일정표
- ✅ **이미지 복사 최적화**: 필요한 열만 선택적 복사
- ✅ **JIRA Description ADF 변환**: 평문 → Atlassian Document Format

---

## 🏗️ 기술 스택

### 프론트엔드
- **Framework**: React 18 + TypeScript + Vite
- **상태 관리**: React Query (서버 상태)
- **데이터베이스**: Supabase PostgreSQL
- **인증**: Google OAuth + Supabase Auth
- **Charts**: Frappe Gantt v1.0.3, FullCalendar v6
- **Utils**: html2canvas v1.4.1

### 백엔드
- **BaaS**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Edge Functions**: Deno (jira-create, jira-update)
- **RLS**: Row Level Security (읽기: 전체, 쓰기: 화이트리스트 5명)

### 배포
- **프론트엔드**: Vercel (자동 배포)
- **Edge Functions**: Supabase Functions (수동 배포)
- **데이터베이스**: Supabase Cloud

---

## 🚀 시작하기

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

브라우저에서 http://localhost:5173 접속

### 4. Supabase 마이그레이션 (최초 1회)

Supabase Dashboard → SQL Editor에서 순서대로 실행:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_calculation_results.sql`
3. `supabase/migrations/003_jira_assignees.sql`
4. `supabase/migrations/004_work_stages_extension.sql`

---

## 📋 명령어

```bash
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run preview    # 빌드 미리보기
npm test           # 단위 테스트
npm run typecheck  # TypeScript 타입 체크
```

### Supabase CLI (Edge Functions)

```bash
supabase functions deploy jira-create   # jira-create 배포
supabase functions deploy jira-update   # jira-update 배포
```

---

## 🗂️ 프로젝트 구조

```
azrael-002/
├── src/
│   ├── components/       # UI 컴포넌트 (19개)
│   │   ├── MainScreen.tsx
│   │   ├── ScheduleTable.tsx
│   │   ├── StageEditModal.tsx
│   │   ├── JiraPreviewModal.tsx
│   │   └── ...
│   ├── hooks/            # React Hooks (6개)
│   │   ├── useSupabase.ts      # React Query 훅
│   │   ├── useImageCopy.ts
│   │   └── ...
│   ├── lib/
│   │   ├── api/          # Supabase API 레이어 (5개)
│   │   │   ├── projects.ts
│   │   │   ├── templates.ts
│   │   │   ├── holidays.ts
│   │   │   ├── jira.ts
│   │   │   └── calculations.ts
│   │   ├── jira/         # JIRA 템플릿 헬퍼
│   │   ├── businessDays.ts
│   │   ├── storage.ts
│   │   └── supabase.ts   # Supabase 클라이언트
│   ├── types/            # TypeScript 타입
│   │   ├── index.ts
│   │   ├── supabase.ts
│   │   └── supabase-generated.ts
│   └── scripts/          # 마이그레이션 스크립트
├── supabase/
│   ├── migrations/       # DB 스키마 (5개)
│   └── functions/        # Edge Functions (2개)
│       ├── jira-create/
│       └── jira-update/
├── prd/                  # PRD 문서 (8개)
├── docs/                 # 개발 문서
├── CLAUDE.md             # 개발 가이드
└── README.md
```

---

## 📐 아키텍처 원칙

### 데이터 흐름

```
[프론트엔드]
    ↓ Google OAuth
[Supabase Auth] → RLS 검증
    ↓
[React Query] ← Supabase API
    ├─ Projects, Templates, WorkStages, Holidays (팀 공유)
    ├─ CalculationResults, ScheduleEntries (팀 공유)
    └─ JiraAssignees (팀 공유)
    ↓
[MainScreen] → 계산 → 테이블 출력 → JIRA 생성
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

---

## 🧪 테스트

### 단위 테스트

```bash
npm test
```

**커버리지** (15개 테스트):
- ✅ 영업일 역산 계산
- ✅ 날짜 형식 변환
- ✅ LocalStorage Date 직렬화
- ✅ 하위 일감 계층 구조

### 통합 테스트

테스트 시나리오: `docs/test-scenarios.md`

---

## 📊 성능 지표

- **계산 성능**: < 1초
- **렌더링**: < 1초 (3개 테이블 + 3개 차트 + 캘린더)
- **빌드 크기**:
  - JS: 861KB (gzip: 241KB)
  - CSS: 24KB (gzip: 5KB)
- **빌드 시간**: ~1.3초

---

## 🔐 보안 및 권한

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

## 🛠️ 개발 가이드

### Edge Functions 배포

```bash
# jira-create 배포
supabase functions deploy jira-create

# jira-update 배포
supabase functions deploy jira-update
```

**주의**: Edge Functions는 자동 배포되지 않으므로, 코드 변경 시 수동 배포 필요

### 새 마이그레이션 추가

1. `supabase/migrations/00X_description.sql` 생성
2. Supabase Dashboard → SQL Editor 실행
3. 메모리 업데이트 (`azrael-supabase-backend`)

---

## 📚 참조 문서

- **개발 가이드**: [CLAUDE.md](./CLAUDE.md)
- **빠른 시작**: [QUICK_START.md](./QUICK_START.md)
- **테스트 시나리오**: [docs/test-scenarios.md](./docs/test-scenarios.md)
- **PRD 문서**: [prd/](./prd/)
  - [Master PRD](./prd/Azrael-PRD-Master.md)
  - [Shared Specs](./prd/Azrael-PRD-Shared.md)
  - [Phase 0](./prd/Azrael-PRD-Phase0.md)
  - [Phase 1](./prd/Azrael-PRD-Phase1.md)

---

## 🌐 배포 정보

**프로덕션**: https://azrael-002.vercel.app

**최신 배포**:
- 프론트엔드: 커밋 43aee9d (2026-01-20)
- Edge Functions: v11 (2026-01-20)
- DB: 4개 마이그레이션 완료

**Git Repository**: https://github.com/JaekyungCho2140/azrael-002

---

## 🐛 알려진 이슈

**없음** (모든 테스트 통과)

---

## 📄 라이선스

MIT License

---

## 👥 기여자

L10n팀 내부 프로젝트

---

**최종 업데이트**: 2026-01-20 (Phase 1.7 완료)
