# Azrael PRD - Master Document

**프로젝트명**: Azrael
**작성일**: 2026-01-09
**최종 업데이트**: 2026-02-10
**버전**: 7.0 (Phase 4 완료 + UI 텍스트 감사)
**작성자**: L10n팀 (Claude Code 협업)

---

## 📋 문서 목적

이 문서는 Azrael 프로젝트의 전체 개요, 아키텍처, 개발 로드맵을 제공하는 마스터 문서입니다.

---

## 📚 관련 문서

- **[Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)**: 공통 데이터 구조, 용어집, 기술 스택
- **[Azrael-PRD-Design.md](./Azrael-PRD-Design.md)**: 디자인 시스템 및 UI 가이드라인
- **[Azrael-PRD-Phase0.md](./Azrael-PRD-Phase0.md)**: Phase 0 - 일정 계산 및 시각화 (✅ 완료)
- **[Azrael-PRD-Phase0.5.md](./Azrael-PRD-Phase0.5.md)**: Phase 0.5 - 하위 일감 템플릿 (✅ 완료)
- **[Azrael-PRD-Phase1.md](./Azrael-PRD-Phase1.md)**: Phase 1 - JIRA 연동 (✅ 완료)
  - Phase 1.7 - 계산 결과 서버화 및 부가 정보 관리
  - Phase 1.8 - JIRA 일감 존재 확인 (jira-check)
- **[Azrael-PRD-Phase2.md](./Azrael-PRD-Phase2.md)**: Phase 2 - 이메일 생성 (✅ 완료)
- **[Azrael-PRD-Phase3.md](./Azrael-PRD-Phase3.md)**: Phase 3 - 슬랙 메시지 발신 (✅ 완료)
- **[Azrael-PRD-Phase4.md](./Azrael-PRD-Phase4.md)**: Phase 4 - 몰아보기 비교 뷰 (✅ 완료)

---

## 1. 프로젝트 개요

### 1.1. 프로젝트 배경

게임 퍼블리셔의 L10n팀은 게임 업데이트 일정을 영업일 기준으로 역산하여 현지화 업무 일정을 산정합니다. 기존에는 엑셀 시트의 함수를 사용했으나, 다음과 같은 문제가 있었습니다:

- 새로운 업무 단계 추가 시 시트 업데이트 및 배포 필요
- 일정 조율 시마다 시트 수정 공수 발생
- 버전 관리 및 공유 불편
- 팀원 간 동기화 어려움

### 1.2. 프로젝트 목적

**Azrael**은 엑셀 기반 일정 계산을 웹 기반 도구로 전환하여:

- 업무 단계 추가/수정을 UI에서 직접 가능하게 함
- 계산된 일정을 테이블, 간트 차트, 캘린더로 시각화
- Supabase 백엔드를 통한 팀 공유 데이터 동기화
- JIRA 일감 자동 생성, 이메일/슬랙 연동으로 업무 효율 극대화

### 1.3. 사용자 및 사용 환경

- **사용자**: L10n팀 5인
- **사용 환경**: 회사 내부 (보안 제약 낮음)
- **접근 방식**: Google OAuth 소셜 로그인
- **권한**: 읽기(전체), 쓰기(화이트리스트 5명)

---

## 2. 시스템 아키텍처

### 2.1. 기술 스택 요약

| 레이어 | 기술 | 비고 |
|--------|------|------|
| **프론트엔드** | React 18 + TypeScript + Vite | SPA |
| **백엔드** | Supabase (PostgreSQL + Auth) | 팀 공유 데이터 |
| **데이터 저장** | Supabase + LocalStorage | 하이브리드 |
| **상태 관리** | React Query | 서버 상태 캐싱 |
| **인증** | Google OAuth + Supabase Auth | RLS 정책 적용 |
| **간트 차트** | Frappe Gantt (MIT) | Zero dependencies |
| **캘린더** | FullCalendar v6 (MIT) | React 통합 우수 |
| **이미지 복사** | html2canvas (MIT) | HTML → PNG 변환 |
| **공휴일 API** | 공공데이터포털 API | 한국천문연구원 |

자세한 내용은 **[Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)** 참조

### 2.2. 시스템 구조

```
[사용자 브라우저]
    ↓ Google OAuth
[Supabase Auth] → RLS 정책 검증
    ↓
[프론트엔드 UI]
    ├─ React Query (서버 상태 관리)
    ├─ 프로젝트 선택
    ├─ 업데이트일 입력
    ├─ 영업일 역산 계산 ← [Supabase: Holidays]
    ├─ 테이블 출력 (3개)
    ├─ 간트 차트 (3개) ← [Frappe Gantt]
    ├─ 캘린더 뷰 ← [FullCalendar]
    └─ 설정 관리 ← [Supabase: Projects, Templates, Stages]
    ↓
[Supabase (팀 공유)]
    ├─ Projects (프로젝트 설정)
    ├─ WorkTemplates (업무 단계 템플릿)
    ├─ WorkStages (업무 단계 상세 + 부가 정보)
    ├─ Holidays (공휴일 목록)
    ├─ CalculationResults (계산 결과 - Phase 1.7)
    ├─ ScheduleEntries (테이블 엔트리 - Phase 1.7)
    ├─ JiraAssignees (JIRA 담당자 매핑 - Phase 1.7)
    ├─ JiraEpicMappings (JIRA Epic 매핑)
    └─ JiraTaskMappings (JIRA Task 매핑)
    ↓
[LocalStorage (개인)]
    ├─ UserState (사용자 상태)
    └─ JiraConfig (JIRA API Token)
```

### 2.3. 데이터 흐름

**팀 공유 데이터 (Supabase)**:
1. **사용자 로그인** → Google OAuth → Supabase Auth 세션 생성
2. **프로젝트 조회** → React Query → Supabase RLS 검증 → 전체 프로젝트 목록
3. **업무 단계 조회** → React Query → Supabase → 프로젝트별 템플릿 및 단계
4. **공휴일 조회** → React Query → Supabase → 전체 공휴일 목록
5. **설정 변경** → React Query Mutation → Supabase (화이트리스트 검증) → 자동 캐시 무효화

**개인 데이터 (LocalStorage)**:
1. **업데이트일 입력** → 영업일 역산 계산 (Supabase 공휴일 사용)
2. **테이블 생성** → 업무별 시작/종료일시 계산
3. **결과 저장** → LocalStorage (최신 계산 결과만)
4. **시각화** → 간트 차트, 캘린더 자동 생성
5. **편집** → 텍스트/서식 편집 → LocalStorage 저장
6. **이미지 복사** → html2canvas → 클립보드 복사

---

## 3. 기능 개요

### 3.1. Phase 0: 일정 계산 및 시각화 (완료)

| 기능 | 설명 | 상태 |
|------|------|------|
| **Google OAuth 인증** | Google 계정으로 로그인, Supabase Auth 연동 | ✅ 완료 |
| **Supabase 백엔드** | PostgreSQL 데이터베이스, RLS 정책 적용 | ✅ 완료 |
| **프로젝트 관리** | 프로젝트 추가/수정/삭제 (Supabase) | ✅ 완료 |
| **업무 단계 관리** | 템플릿 및 단계 추가/수정/삭제 (Supabase) | ✅ 완료 |
| **공휴일 관리** | API 불러오기, 수동 추가/삭제 (Supabase) | ✅ 완료 |
| **영업일 역산 계산** | 업데이트일 기준 영업일 역산 (주말/공휴일 제외) | ✅ 완료 |
| **3개 테이블 출력** | 일정표, Ext. 일정표, Int. 일정표 | ✅ 완료 |
| **간트 차트** | 테이블별 간트 차트 (Frappe Gantt) | ✅ 완료 |
| **캘린더 뷰** | 월간 캘린더 (FullCalendar) | ✅ 완료 |
| **테이블 편집** | 텍스트 및 서식 직접 편집 | ✅ 완료 |
| **하위 일감 관리** | +/↓/✕ 버튼으로 하위 일감 추가/삭제 | ✅ 완료 |
| **이미지 복사** | 테이블/차트를 PNG로 복사 (html2canvas) | ✅ 완료 |

자세한 내용은 **[Azrael-PRD-Phase0.md](./Azrael-PRD-Phase0.md)** 참조

### 3.2. Phase 1: JIRA 연동 (✅ 완료)

| 기능 | 설명 | 상태 |
|------|------|------|
| **JIRA 일감 생성** | Epic/Task/Subtask 계층 구조 생성 | ✅ 완료 |
| **JIRA 일감 업데이트** | 기존 일감 날짜/내용 업데이트 | ✅ 완료 |
| **이슈 타입 설정** | 프로젝트별, 업무 단계별 커스텀 | ✅ 완료 |
| **일감 매핑** | stageId → JIRA Issue ID 매핑 | ✅ 완료 |

자세한 내용은 **[Azrael-PRD-Phase1.md](./Azrael-PRD-Phase1.md)** 참조

### 3.2.1. Phase 1.7: 계산 결과 서버화 및 부가 정보 관리 (✅ 완료)

| 기능 | 설명 | 상태 |
|------|------|------|
| **계산 결과 서버 저장** | 프로젝트 + 업데이트일별 팀 공유 | ✅ 완료 |
| **부가 정보 템플릿 관리** | 설명, 담당자, JIRA 설명, JIRA 담당자 | ✅ 완료 |
| **JIRA 담당자 시스템** | 5명 매핑, 드롭다운, 이름 표시 | ✅ 완료 |
| **읽기 전용 테이블** | 완전 읽기 전용 일정표 | ✅ 완료 |
| **이미지 복사 최적화** | 필요한 열만 선택적 복사 | ✅ 완료 |
| **JIRA Description ADF 변환** | 평문 → Atlassian Document Format | ✅ 완료 |

### 3.2.2. Phase 1.8: JIRA 일감 존재 확인 (✅ 완료)

| 기능 | 설명 | 상태 |
|------|------|------|
| **jira-check Edge Function** | JIRA API로 이슈 존재 여부 확인 | ✅ 완료 |
| **JIRA 업데이트 버튼 조건부 활성화** | 실제 JIRA 일감 존재 시에만 활성화 | ✅ 완료 |
| **사용자 JIRA 인증 정보 사용** | 일감 소유자 본인 확인 가능 | ✅ 완료 |

### 3.3. Phase 2: 이메일 생성 (✅ 완료)

| 기능 | 설명 | 상태 |
|------|------|------|
| **이메일 템플릿 시스템** | Tiptap 리치 텍스트 에디터, 변수 치환, 조건부 블록 | ✅ 완료 |
| **이메일 복사** | HTML + 플레인텍스트 동시 클립보드 복사 | ✅ 완료 |
| **이메일 미리보기** | 생성된 이메일 본문 확인 모달 | ✅ 완료 |
| **유료화 상품 협의 일정** | 프로젝트별 Offset 설정, Disclaimer/이메일 변수 | ✅ 완료 |

자세한 내용은 **[Azrael-PRD-Phase2.md](./Azrael-PRD-Phase2.md)** 참조

### 3.4. Phase 3: 슬랙 메시지 발신 (✅ 완료)

| 기능 | 설명 | 상태 |
|------|------|------|
| **Slack User OAuth** | User OAuth Token으로 사용자 계정 메시지 발신 | ✅ 완료 |
| **채널 자동 조회** | Slack API로 채널 목록 조회, 프로젝트-채널 매핑 | ✅ 완료 |
| **메시지 발신** | Slack 채널에 메시지 + 이미지 발신 | ✅ 완료 |
| **이미지 첨부** | files.uploadV2 API로 PNG 이미지 첨부 | ✅ 완료 |

자세한 내용은 **[Azrael-PRD-Phase3.md](./Azrael-PRD-Phase3.md)** 참조

### 3.5. Phase 4: 몰아보기 비교 뷰 (✅ 완료)

| 기능 | 설명 | 상태 |
|------|------|------|
| **몰아보기 슬롯 4개** | 프로젝트별, 사용자별 고정 4개 슬롯 | ✅ 완료 |
| **ViewMode 토글** | 톺아보기(단일) ↔ 몰아보기(4분할) 전환 | ✅ 완료 |
| **몰아보기 CRUD** | 저장, 이름 변경, 테이블 전환(T1/T2/T3), 삭제 | ✅ 완료 |
| **UI 텍스트 감사** | 이모지 제거, 용어 통일 (프리셋→몰아보기, 단일 화면→톺아보기) | ✅ 완료 |

자세한 내용은 **[Azrael-PRD-Phase4.md](./Azrael-PRD-Phase4.md)** 참조

---

## 4. 개발 로드맵

### 4.1. Phase 구성

```
Phase 0: 일정 계산 및 시각화 ✅ 완료 (2026-01-13)
    ↓
Phase 0.5: 하위 일감 템플릿 ✅ 완료 (2026-01-16)
    ↓
Phase 1: JIRA 연동 ✅ 완료 (2026-01-19)
    ↓
Phase 1.7: 계산 결과 서버화 ✅ 완료 (2026-01-20)
    ↓
Phase 1.8: JIRA 일감 확인 ✅ 완료 (2026-01-21)
    ↓
Phase 2: 이메일 생성 ✅ 완료 (2026-02-02)
    ↓
Phase 3: 슬랙 메시지 발신 (✅ 완료)
    ↓
Phase 4: 몰아보기 비교 뷰 ✅ 완료 (2026-02-10)
```

### 4.2. Phase 0 완료 내역

**완료일**: 2026-01-13
**Git Commit**: c178dd9 feat: Phase 0 MVP 완성
**배포**: https://azrael-002.vercel.app/
**데이터베이스**: Supabase PostgreSQL (ap-south-1)

**주요 마일스톤**:
1. ✅ Supabase 마이그레이션 (커밋 0171aaf)
   - LocalStorage 전용 → Supabase + LocalStorage 하이브리드
   - PostgreSQL 스키마 생성 (4개 테이블)
   - RLS 정책 적용 (읽기: 전체, 쓰기: 화이트리스트)
   - React Query 훅 15개 구현

2. ✅ Google OAuth + Supabase Auth 통합
   - @react-oauth/google 라이브러리 사용
   - Supabase 세션 관리
   - 화이트리스트 검증 (L10n팀 5명)

3. ✅ CSV 데이터 임포트
   - 9개 프로젝트
   - 48개 업무 단계
   - 23개 공휴일 (2025-2026)

4. ✅ Event Calendar → FullCalendar 교체
   - React 통합 개선
   - 안정적 API
   - 커뮤니티 지원 우수

### 4.3. Phase 1.7 완료 내역 (2026-01-20)

**완료일**: 2026-01-20
**Git Commit**: 43aee9d
**Edge Functions**: v11
**배포**: https://azrael-002.vercel.app

**주요 구현**:
1. ✅ 계산 결과 서버화
   - DB 테이블: calculation_results, schedule_entries
   - 프로젝트 + 업데이트일별 UPSERT (덮어쓰기)
   - 팀 전체 공유 (RLS: 읽기/쓰기 모두 허용)

2. ✅ 부가 정보 WorkStage 템플릿 관리
   - work_stages 확장: description, assignee, jira_description, jira_assignee_id
   - StageEditModal UI 확장 (부모 + 하위 일감)
   - 모든 업데이트일에 공통 적용

3. ✅ JIRA 담당자 시스템
   - jira_assignees 테이블 (5명 매핑)
   - 드롭다운 UI (한글 이름)
   - 테이블 이름 표시 (Account ID → 조재경, 김민혜 등)

4. ✅ 읽기 전용 테이블
   - T1/T2/T3 모든 편집 기능 제거
   - 설정 > 업무 단계에서만 수정 가능

5. ✅ JIRA Description ADF 변환
   - textToADF() 평문 → Atlassian Document Format
   - 줄바꿈 지원

### 4.4. Phase 1.8 완료 내역 (2026-01-21)

**완료일**: 2026-01-21
**Git Commit**: cafb8ae
**Edge Functions**: jira-check v1

**주요 구현**:
1. ✅ jira-check Edge Function
   - JIRA REST API v3 이슈 존재 확인
   - 사용자 본인의 JIRA 인증 정보 사용
   - 404 응답 시 존재하지 않음으로 판단

2. ✅ JIRA 업데이트 버튼 조건부 활성화
   - 매핑된 Issue Key로 존재 여부 확인
   - 존재하지 않으면 버튼 비활성화 + 툴팁 표시
   - 존재하면 정상 업데이트 가능

### 4.5. Phase 2 완료 내역 (2026-02-02)

**완료일**: 2026-02-02
**Git Commit**: 695223d (코드 품질 개선 포함, 2026-02-06)
**배포**: https://azrael-002.vercel.app

**주요 구현**:
1. ✅ 이메일 템플릿 시스템
   - Tiptap 3.18 리치 텍스트 에디터 (프로젝트별 CRUD)
   - 변수 치환: `{updateDate}`, `{table}`, `{disclaimer}`, `{paidProductDate}` 등
   - 조건부 블록: `{{#if showIosReviewDate}}...{{/if}}`
   - HTML + 플레인텍스트 동시 클립보드 복사

2. ✅ 유료화 상품 협의 일정
   - 프로젝트별 Offset 설정 (영업일 수)
   - CalculationResult에 paidProductDate 추가
   - Disclaimer/이메일 변수: `{paidProductDate}`

3. ✅ 코드 품질 개선 (2026-02-06)
   - 컴포넌트 분할: SettingsScreen 5개 탭, MainScreen useJiraOperations 훅
   - 번들 최적화: 1,719KB → ~560KB (78% 감소, lazy load + code splitting)
   - Frappe Gantt 0.6.1 → 1.0.4 업그레이드
   - ADF 코드 중복 제거 (~560줄 삭제)
   - 매직 넘버 상수화, CSS 토큰 통일, 접근성 개선

### 4.6. Phase 3 완료 내역 (2026-02-10)

**완료일**: 2026-02-10
**배포**: https://azrael-002.vercel.app

**주요 구현**:
1. ✅ Slack User OAuth Token (chat:write, channels:read, groups:read, files:write)
2. ✅ 채널 매핑: 프로젝트별 1:1 매핑, optimistic update
3. ✅ 메시지 템플릿: 기본 제공 + 사용자 정의 CRUD
4. ✅ 메시지 발신: 변수 치환 + Slack Markdown
5. ✅ 이미지 첨부: files.uploadV2 API (FormData 형식)
6. ✅ Edge Functions: slack-oauth-callback, slack-channels, slack-send
7. ✅ 계산 결과 자동 복원: LocalStorage(날짜) + Supabase(데이터) 하이브리드

### 4.7. Phase 4 완료 내역 (2026-02-10)

**완료일**: 2026-02-10
**Git Commit**: 744c896
**배포**: https://azrael-002.vercel.app

**주요 구현**:
1. ✅ 몰아보기 비교 뷰: 4분할 화면(QuadViewScreen), 최대 4개 계산 결과 동시 비교
2. ✅ 몰아보기 CRUD: 저장(PresetSaveModal), 이름 변경, 테이블 전환, 삭제
3. ✅ ViewMode 토글: 톺아보기(단일) ↔ 몰아보기(4분할) 버튼 전환
4. ✅ DB: preset_slots 테이블 (RLS, UNIQUE 2개, CASCADE 2개)
5. ✅ UI 텍스트 감사: 이모지 제거(17개 파일), 용어 통일(프리셋→몰아보기, 단일 화면→톺아보기)
6. ✅ 코드 정리: 데드 코드 제거, buildEntries 중복 추출, CSS 중복 제거

---

## 5. 비기능 요구사항

| 항목 | 요구사항 | 비고 |
|------|----------|------|
| **브라우저 호환성** | Chrome, Edge, Firefox, Safari (최신 2개 버전) | IE11 미지원 |
| **반응형 디자인** | PC 전용 (1280x720 이상) | 모바일/태블릿 미지원 |
| **성능** | 성능 최적화 불필요 (5인 사용, 소량 데이터) | React Query 캐싱 적용 |
| **접근성** | 접근성 고려 안 함 | 내부 5인만 사용 |
| **보안** | Google OAuth + Supabase Auth + RLS | 읽기: 전체, 쓰기: 화이트리스트 |
| **데이터 동기화** | Supabase (팀 공유), LocalStorage (개인) | React Query 자동 리프레시 |

자세한 내용은 **[Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)** 참조

---

## 6. 제약사항 및 전제조건

### 6.1. 제약사항

- **Supabase 의존**: 팀 공유 데이터는 Supabase 필수
- **개인 데이터 동기화 없음**: CalculationResult는 브라우저별 독립
- **버전 관리 없음**: 최신 계산 결과만 유지
- **Supabase 장애 시**: 이전 캐시된 데이터 사용 (React Query)

### 6.2. 전제조건

- **사용자 환경**: PC, 최신 브라우저
- **네트워크**: Supabase 연결 및 공휴일 API 호출 시 인터넷 필요
- **Google 계정**: OAuth 로그인 필수
- **화이트리스트**: Supabase RLS 정책에 5인 이메일 사전 등록

---

## 7. 용어 정리

자세한 용어집은 **[Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)** 참조

**핵심 용어**:
- **영업일**: 주말(토, 일), 공휴일 제외 근무일
- **마감**: 선행 작업의 종료 시점 = L10n팀 작업 시작 시점 (startDateTime)
- **테이블 전달**: L10n팀 작업 종료 시점 (endDateTime)
- **Offset**: 업데이트일 기준 역산할 영업일 수 (양수=과거, 음수=미래)
- **헤즈업**: 유관부서/협력업체에 일정 공유하는 날짜
- **iOS 심사일**: iOS 앱스토어 심사 제출 예정일
- **RLS**: Row Level Security (Supabase 행 단위 접근 제어)

---

## 8. 프로젝트 목록

| 프로젝트 코드 | 프로젝트명 | 설명 | 특수 설정 |
|--------------|-----------|------|----------|
| M4/GL | MIR4 글로벌 서비스 | | 없음 |
| NC/GL (1주) | NIGHT CROWS 글로벌 1주 사이클 | | 독립 프로젝트 |
| NC/GL (2주) | NIGHT CROWS 글로벌 2주 사이클 | | 독립 프로젝트 |
| FB/GL (CDN) | FANTASTIC BASEBALL 글로벌 CDN | | 독립 프로젝트 |
| FB/GL (APP) | FANTASTIC BASEBALL 글로벌 APP | | 독립 프로젝트 |
| FB/JP (CDN) | FANTASTIC BASEBALL 일본 CDN | | 독립 프로젝트 |
| FB/JP (APP) | FANTASTIC BASEBALL 일본 APP | | 독립 프로젝트 |
| LY/GL | LEGEND OF YMIR 글로벌 서비스 | | 없음 |
| 월말정산 | 월말 현지화 비용 정산 | 프로젝트 아니지만 일정 관리 대상 | 없음 |

**타입별 독립 프로젝트 정책**:
- NC/GL, FB 프로젝트는 타입별로 독립 프로젝트로 분리
- 이유: 템플릿 관리 단순화, 타입 전환 시 혼동 방지
- 영향: 프로젝트 드롭다운 목록 9개 (타입 포함)

---

## 9. 성공 지표

### 9.1. Phase 0 성공 기준

- ✅ 5인 모두가 기존 엑셀 시트 대신 Azrael 사용
- ✅ 업무 단계 추가/수정이 UI에서 5분 이내 완료
- ✅ 업데이트일 입력 후 3초 이내 테이블/차트 출력
- ✅ 이미지 복사 기능으로 외부 공유 시간 50% 단축
- ✅ Supabase 백엔드 통한 팀 공유 데이터 실시간 동기화

### 9.2. Phase 2~4 성공 기준

**Phase 2 (이메일 생성)**:
- 이메일 본문 생성 후 발신까지 30초 이내 완료
- 수동 이메일 작성 대비 80% 시간 단축

**Phase 3 (슬랙 메시지)**:
- OAuth 연동 후 메시지 발신까지 10초 이내
- 슬랙 수동 입력 대비 70% 시간 단축

**Phase 4 (몰아보기 비교 뷰)**:
- 몰아보기 저장/불러오기 3초 이내
- 4분할 화면에서 계산 결과 동시 비교 가능

---

## 10. 리스크 관리

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|-----------|
| Supabase 장애 | 중 | React Query 캐시 fallback, 이전 데이터 사용 |
| LocalStorage 데이터 손실 | 낮 | 개인 계산 결과만 영향, 재계산 가능 |
| 브라우저 호환성 이슈 | 낮 | 주요 브라우저 최신 2개 버전만 지원 |
| 공휴일 API 장애 | 낮 | Supabase 캐시 활용, 수동 입력 기능 제공 |
| 라이브러리 업데이트 중단 | 낮 | MIT 라이선스로 포크 가능, 커뮤니티 활발 |

---

## 11. 배포 정보

**배포 플랫폼**: Vercel (프론트엔드), Supabase (Edge Functions)
**배포 URL**: https://azrael-002.vercel.app
**Git Repository**: https://github.com/JaekyungCho2140/azrael-002
**최초 배포**: 2026-01-13
**최신 배포**: 2026-02-10 (Phase 4 + UI 텍스트 감사)

**환경 변수** (Vercel 설정):
```env
VITE_SUPABASE_URL=https://vgoqkyqqkieogrtnmsva.supabase.co
VITE_SUPABASE_ANON_KEY=*** (설정됨)
VITE_GOOGLE_CLIENT_ID=*** (설정됨)
VITE_ALLOWED_USERS=jkcho@wemade.com,mine@wemade.com,srpark@wemade.com,garden0130@wemade.com,hkkim@wemade.com
VITE_HOLIDAY_API_KEY=*** (설정됨)
```

---

## 12. 부록

### 12.1. 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 2026-01-09 | 1.0 | 초안 작성 | L10n팀 + Claude |
| 2026-01-13 | 1.5 | Phase 0 완료 반영, Supabase 마이그레이션 | L10n팀 + Claude |
| 2026-01-14 | 2.0 | 코드베이스 기준 전면 업데이트 | L10n팀 + Claude |
| 2026-01-20 | 3.0 | Phase 1.7 완료 반영, 부가 정보 관리, 계산 결과 서버화 | L10n팀 + Claude |
| 2026-01-21 | 3.1 | Phase 1.8 완료 반영, JIRA 일감 존재 확인, PRD 문서 최신화 | L10n팀 + Claude |
| 2026-01-26 | 4.0 | Phase 2~4 분할 (이메일, 슬랙, 프리셋), 상세 설계 완료 | L10n팀 + Claude |
| 2026-02-02 | 4.5 | Phase 2 구현 완료 반영 | L10n팀 + Claude |
| 2026-02-06 | 5.0 | 코드 품질 개선, 유료화 상품 협의 일정, PRD 최신화 | L10n팀 + Claude |
| 2026-02-10 | 6.0 | Phase 3 슬랙 연동 완료 반영, 계산 결과 자동 복원 | L10n팀 + Claude |
| 2026-02-10 | 7.0 | Phase 4 몰아보기 비교 뷰 완료, UI 텍스트 감사, 코드 정리 | L10n팀 + Claude |

### 12.2. 승인 이력

| 단계 | 승인자 | 날짜 | 서명 |
|------|--------|------|------|
| PRD 검토 | | 2026-01-09 | ✅ |
| Phase 0 배포 승인 | | 2026-01-13 | ✅ |
| Phase 0.5 배포 승인 | | 2026-01-16 | ✅ |
| Phase 1 배포 승인 | | 2026-01-19 | ✅ |
| Phase 1.7 배포 승인 | | 2026-01-20 | ✅ |
| Phase 1.8 배포 승인 | | 2026-01-21 | ✅ |
| Phase 2 배포 승인 | | 2026-02-02 | ✅ |
| Phase 3 배포 승인 | | 2026-02-10 | ✅ |
| Phase 4 배포 승인 | | 2026-02-10 | ✅ |

---

**문서 종료**
