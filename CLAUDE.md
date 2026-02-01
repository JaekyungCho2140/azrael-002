# Azrael - L10n 일정 관리 도구

## 스택
React 18 + TypeScript + Vite
**Supabase** (PostgreSQL + Auth + Edge Functions) | **React Query** (서버 상태 관리)
Frappe Gantt, Event Calendar, html2canvas

## 명령어
```bash
npm dev        # 개발 서버
npm build      # 프로덕션 빌드
npm test       # Vitest
npm typecheck  # tsc --noEmit
```

## 아키텍처
```
src/
├── components/   # UI 컴포넌트 (19개)
├── hooks/        # React Query 훅, useSupabase (6개)
├── lib/
│   ├── api/      # Supabase API 레이어 (5개)
│   ├── jira/     # JIRA 템플릿 헬퍼
│   ├── businessDays.ts  # 영업일 계산 엔진
│   └── storage.ts       # LocalStorage 유틸
└── types/        # PRD Shared.md §2 인터페이스

supabase/
├── migrations/   # DB 스키마 (5개)
└── functions/    # Edge Functions (3개)
    ├── jira-create/
    ├── jira-update/
    └── jira-check/
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
- **Supabase (팀 공유)**: Projects, Templates, WorkStages, Holidays, CalculationResults, JiraAssignees
- **LocalStorage (개인)**: UserState, JiraConfig

## PRD 참조 (Source of Truth)
- 데이터 구조: `Azrael-PRD-Shared.md` §2
- 계산 로직: `Azrael-PRD-Shared.md` §3
- UI 명세: `Azrael-PRD-Phase0.md`, `Azrael-PRD-Phase1.md`
- 디자인: `Azrael-PRD-Design.md`

## 배포
- **프론트엔드**: Git push → Vercel 자동 배포
- **Edge Functions**: `supabase functions deploy [function-name]` (수동)
- **DB 마이그레이션**: Supabase Dashboard SQL Editor (최초 1회)

## 테스트
- Vitest + React Testing Library
- Playwright MCP를 활용해 최대한 자동 테스트
- LocalStorage는 jsdom mock으로 자동화
- OAuth, 이미지 복사는 수동 검증 필요

## Phase 완료 상태
- ✅ Phase 0: 영업일 계산 및 시각화
- ✅ Phase 0.5: 하위 일감 템플릿
- ✅ Phase 1: JIRA 연동
- ✅ Phase 1.7: 계산 결과 서버화, 부가 정보 관리 (2026-01-20)
- ✅ Phase 1.8: JIRA 일감 존재 확인 (2026-01-21)
- ⏳ Phase 2: 이메일 생성 (예정)
- ⏳ Phase 3: 슬랙 연동 (예정)
- ⏳ Phase 4: 프리셋 관리 (예정)
