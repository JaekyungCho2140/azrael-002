# Azrael - L10n 일정 관리 도구

## 스택
React 18 + TypeScript + Vite
**Supabase** (PostgreSQL + Auth + Edge Functions) | **React Query** (서버 상태 관리)
Frappe Gantt 1.0.4, FullCalendar 6.1, html2canvas, Tiptap 3.18, Slack Web API

## 명령어
```bash
npm run dev        # 개발 서버 (포트 3000)
npm run build      # 프로덕션 빌드
npm test           # Vitest (110개 테스트)
npm run typecheck  # tsc --noEmit
```

## 아키텍처
```
src/
├── components/   # UI 컴포넌트 (36개, settings/ 6개, QuadViewScreen, PresetSlotCard, PresetSaveModal 포함)
├── hooks/        # React Hooks (9개: useSupabase, useJiraOperations, useEmailTemplates, useImageCopy, useToast, useSlackTokenStatus, useSlackTemplates, useViewMode, usePresetSlots)
├── lib/
│   ├── api/      # Supabase API 레이어 (8개: projects, templates, holidays, jira, calculations, emailTemplates, slack, presets)
│   ├── email/    # 이메일 생성 엔진 (6개: generator, parser, formatters, sanitizer, clipboard, templates)
│   ├── jira/     # JIRA 템플릿 헬퍼
│   ├── businessDays.ts  # 영업일 계산 엔진
│   └── storage.ts       # LocalStorage 유틸
├── types/        # PRD Shared.md §2 인터페이스 (3개)
└── constants.ts  # 프론트엔드 상수 (18개)

supabase/
├── migrations/   # DB 스키마 (12개)
└── functions/    # Edge Functions (6개)
    ├── jira-create/
    ├── jira-update/
    ├── jira-check/
    ├── slack-oauth-callback/
    ├── slack-channels/
    ├── slack-send/
    └── _shared/  # 공유 모듈 (adf.ts, constants.ts)
```

## 핵심 규칙
- **WorkStage = 단일 진실 공급원**: WorkStage 1개 = JIRA Task 1개 (1:1 매핑)
- **읽기 전용 테이블**: 계산 결과 테이블(T1/T2/T3)은 편집 불가, 설정 > 업무 단계에서만 수정
- lib/ 함수는 순수 함수로 작성 (LocalStorage 직접 접근 금지)
- Date 직렬화: JSON.parse 후 Date 필드 수동 복원 필수
- "마감" = startDateTime (종료 아님!) ← PRD 용어 주의
- 정보 수집 후 → Serena의 think_about_collected_information 호출
- 코드 작성 전 → Serena의 think_about_task_adherence 호출
- 작업 완료 시 → Serena의 think_about_whether_you_are_done 호출
- 오류 발생 시 PRD 문서 참조

## 데이터 저장 전략
- **Supabase (팀 공유)**: Projects, Templates, WorkStages, Holidays, CalculationResults, JiraAssignees, EmailTemplates, SlackTokens, SlackMessageTemplates, PresetSlots
- **LocalStorage (개인)**: UserState (lastCalculationDates 포함), JiraConfig

## PRD 참조 (Source of Truth)
- 데이터 구조: `Azrael-PRD-Shared.md` §2
- 계산 로직: `Azrael-PRD-Shared.md` §3
- UI 명세: `Azrael-PRD-Phase0.md`, `Azrael-PRD-Phase1.md`, `Azrael-PRD-Phase2.md`, `Azrael-PRD-Phase3.md`, `Azrael-PRD-Phase4.md`
- 디자인: `Azrael-PRD-Design.md`

## 배포
- **프론트엔드**: Git push → Vercel 자동 배포
- **Edge Functions**: `supabase functions deploy [function-name] --no-verify-jwt` (수동, Slack 함수 포함)
- **DB 마이그레이션**: Supabase Dashboard SQL Editor (최초 1회)

## 테스트
- Vitest + React Testing Library (110개 테스트, 3개 파일)
- Playwright MCP를 활용해 최대한 자동 테스트
- LocalStorage는 jsdom mock으로 자동화
- OAuth, 이미지 복사는 수동 검증 필요

## 번들 최적화
- 코드 스플리팅: lazy() + Suspense (GanttChart, CalendarView, SettingsScreen, EmailGeneratorModal, JiraPreviewModal, SlackSendModal)
- 동적 import: html2canvas (useImageCopy 클릭 시점)
- manualChunks: react-vendor, supabase, query
- 초기 로드 ~120KB gzip (전체 ~560KB gzip)

## Phase 완료 상태
- ✅ Phase 0: 영업일 계산 및 시각화
- ✅ Phase 0.5: 하위 일감 템플릿
- ✅ Phase 1: JIRA 연동
- ✅ Phase 1.7: 계산 결과 서버화, 부가 정보 관리 (2026-01-20)
- ✅ Phase 1.8: JIRA 일감 존재 확인 (2026-01-21)
- ✅ Phase 2: 이메일 생성 + UI/UX 감사 개선 (2026-02-02)
- ✅ 코드 품질 개선: 컴포넌트 분할, 번들 최적화, 접근성, 디자인 토큰 (2026-02-06)
- ✅ Phase 3: 슬랙 연동 — OAuth, 채널 매핑, 메시지 템플릿, 이미지 첨부 (2026-02-10)
- ✅ 계산 결과 자동 복원: 프로젝트 전환/새로고침 시 마지막 계산 자동 로드 (2026-02-10)
- ✅ Phase 4: 몰아보기 비교 뷰 — 4분할 화면, 몰아보기 CRUD, ViewMode 토글 (2026-02-10)
- ✅ UI 텍스트 감사: 이모지 제거, 용어 통일 (프리셋→몰아보기, 단일 화면→톺아보기) (2026-02-10)
