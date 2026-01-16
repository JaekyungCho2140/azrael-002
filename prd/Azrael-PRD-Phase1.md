# Azrael PRD - Phase 1: JIRA 연동

**작성일**: 2026-01-14
**버전**: 2.0
**참조**: [Azrael-PRD-Master.md](./Azrael-PRD-Master.md) | [Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)
**최종 요구사항**: [Phase1-Final-Requirements-Summary.md](./Phase1-Final-Requirements-Summary.md)

**Phase 1 Status**: 🟡 설계 완료 (개발 대기)

**⚠️ 전제조건**: Phase 0.5 완료 필요
- 하위 일감 템플릿 설정 기능
- 테이블 2/3 "JIRA 담당자" 컬럼 추가

---

## 📋 문서 목적

이 문서는 **Phase 1 (JIRA 연동)** 기능을 상세하게 정의합니다:
- JIRA 일감 자동 생성 (Epic/Task/Subtask)
- JIRA 일감 업데이트 (날짜 변경 시)
- JIRA Summary 템플릿 시스템 (변수 커스터마이징)
- JIRA API 인증 및 설정
- Phase 0 수정사항 (테이블 컬럼, 하위 일감 템플릿)

**목표**: 계산된 일정을 JIRA 일감으로 자동 생성하여 수동 작업 시간 90% 절감

---

## 1. 기능 개요

### 1.1. 핵심 기능 3가지

**① 일정 계산** (Phase 0 기존 기능):
- 업데이트일 입력 → 영업일 역산 → 테이블/간트/캘린더 생성

**② JIRA 일감 생성** (Phase 1 신규):
- 계산된 일정 → JIRA Epic/Task/Subtask 자동 생성
- 미리보기 → 확인 → JIRA API 호출
- Supabase에 Epic ID 저장 (팀 공유)

**③ JIRA 일감 업데이트** (Phase 1 신규):
- 일정 재계산 → 기존 Epic/Task/Subtask 날짜 업데이트
- 새 Task 추가 생성 (템플릿 수정 시)
- 삭제된 Task는 수동 정리

### 1.2. JIRA 일감 구조

```
Epic: "260210 업데이트"
├─ Task: "260210 업데이트 일정 헤즈업"
│  └─ Description: 전체 일정 요약
│  └─ Assignee: 현재 로그인 사용자
│
├─ Task: "260210 업데이트 REGULAR" (Ext.)
│  ├─ Subtask: "260210 업데이트 REGULAR 번역"
│  └─ Subtask: "260210 업데이트 REGULAR 검수"
│
├─ Task: "260210 업데이트 EXTRA1" (Ext.)
├─ Task: "260210 업데이트 번역" (Int.)
└─ Task: "260210 업데이트 검수" (Int.)
```

**Issue Type**: Epic → Task → Sub-task
**순서**: 헤즈업 → Ext. 전체 → Int. 전체

⚠️ **Summary 형식은 템플릿으로 커스터마이징 가능** (§4)

---

## 2. 사용자 플로우

### 2.1. JIRA 일감 생성

```
[메인 화면]
  ↓ [계산] 완료
[📋 JIRA 생성] 버튼 클릭
  ↓
[JIRA 설정 확인]
  ├─ 없음 → "설정 필요" 에러
  └─ 있음 → 계속
  ↓
[Epic 중복 체크]
  ├─ 이미 있음 → "업데이트 사용" 에러
  └─ 없음 → 계속
  ↓
[미리보기 모달] (읽기 전용)
  ├─ Epic/Task/Subtask 목록
  └─ [취소] or [생성]
  ↓
[Supabase 선삽입] (VR4-2: 동시 생성 방지)
  ├─ jira_epic_mappings 임시 레코드 생성
  ├─ UNIQUE 제약으로 두 번째 사용자 INSERT 실패
  └─ 실패 → "다른 사용자가 생성 중입니다" 에러
  ↓
[Edge Function 호출]
  ├─ Epic 생성
  ├─ Tasks 생성 (헤즈업 + Ext. + Int.)
  ├─ Subtasks 생성
  └─ 실패 → Supabase 임시 레코드 삭제 + 롤백
  ↓
[Supabase 업데이트]
  ├─ jira_epic_mappings 업데이트 (Epic ID, Key 확정)
  └─ jira_task_mappings 저장 (모든 Task/Subtask stageId 매핑)
  ↓
[성공] JIRA 링크 표시
```

**동시 생성 방지 (VR4-2)**:
- Supabase 선삽입으로 UNIQUE 제약 활용
- 첫 번째 사용자만 JIRA 생성 진행
- 두 번째 사용자는 INSERT 실패로 차단

### 2.2. JIRA 일감 업데이트

```
[일정 재계산]
  ↓
[🔄 JIRA 업데이트] 버튼 클릭
  ↓
[Epic 확인]
  ├─ 없음 → "먼저 생성" 에러
  └─ 있음 → Epic ID 획득
  ↓
[Task 매칭] (V1-2: stageId 기반)
  ├─ Supabase jira_task_mappings 조회
  ├─ ScheduleEntry.stageId로 매칭
  └─ 매칭 결과:
      ├─ 있음 → Task ID 획득 (업데이트)
      └─ 없음 → 신규 생성
  ↓
[미리보기 모달]
  ├─ 변경사항 표시
  │  ├─ 업데이트: N개 Task
  │  └─ 신규 생성: M개 Task
  └─ [취소] or [업데이트]
  ↓
[Edge Function 호출]
  ├─ Epic 날짜 업데이트
  ├─ Task 업데이트 (issueId 있음)
  ├─ Task 생성 (issueId 없음)
  └─ 실패 → 에러
  ↓
[Supabase 저장]
  └─ jira_task_mappings 업데이트
  ↓
[성공] 완료 메시지
```

**Task 매칭 로직** (V1-2):
- stageId 기준 매칭 (템플릿 변경에 독립적)
- Supabase `jira_task_mappings` 테이블 사용
- Summary 변경되어도 정확한 매칭 보장

**헤즈업 Task 특수 처리**:
- 헤즈업 Task는 WorkStage가 아니므로 특수 stageId 사용
- stageId = **"HEADSUP"** (고정값)
- jira_task_mappings에 `stage_id = "HEADSUP"` 으로 저장

---

## 3. JIRA 필드 매핑

### 3.1. Epic

| JIRA 필드 | 값 | 비고 |
|----------|---|------|
| Summary | 템플릿 (예: "{date} 업데이트") | §4, projects.jira_epic_template |
| Description | 빈 값 | - |
| Start Date | 가장 빠른 날짜 (헤즈업) | 자동 |
| Due Date | 가장 늦은 날짜 | 자동 |
| Issue Type | "Epic" | 고정 |
| Project | projects.jira_project_key | 프로젝트별 |

**Summary 생성**:
- `projects.jira_epic_template` 있으면 사용
- NULL이면 기본 형식: "{date} 업데이트"

### 3.2. Task (헤즈업)

| JIRA 필드 | 값 | 비고 |
|----------|---|------|
| Summary | 템플릿 (예: "{date} 업데이트 일정 헤즈업") | projects.jira_headsup_template |
| Description | 전체 일정 요약 (§3.2.1) | 자동 생성 |
| customfield_10569 | 헤즈업 09:00 (ISO 8601, KST) | 시작일+시각 |
| customfield_10570 | 헤즈업 18:00 (ISO 8601, KST) | 종료일+시각 |
| Assignee | 현재 사용자 Account ID | 자동 |
| Issue Type | "Task" | 고정 |
| Parent | Epic ID | - |

**Summary 생성**:
- `projects.jira_headsup_template` 있으면 사용
- NULL이면 기본 형식: "{date} 업데이트 일정 헤즈업"

#### 3.2.1. 헤즈업 Description 템플릿

```
{date} 업데이트 일정 헤즈업

**업데이트일**: {fullDate}
**헤즈업**: {headsUpDate}

**주요 일정**:
- REGULAR: 01/10 09:00 ~ 01/15 18:00
- EXTRA1: 01/20 09:00 ~ 01/25 18:00
- 번역: 01/10 09:00 ~ 01/12 18:00
- 검수: 01/13 09:00 ~ 01/15 18:00

(자동 생성: Azrael)
```

### 3.3. Task (일반)

| JIRA 필드 | 값 | 비고 |
|----------|---|------|
| Summary | 템플릿 (예: "{date} 업데이트 {taskName}") | WorkStage 설정 |
| Description | jiraDescription 필드 | 빈 값 허용 |
| customfield_10569 | startDateTime (ISO 8601, KST) | 날짜+시각 |
| customfield_10570 | endDateTime (ISO 8601, KST) | 날짜+시각 |
| Assignee | jiraAssignee (Account ID) | 빈 값이면 현재 사용자 |
| Issue Type | "Task" | 고정 |
| Parent | Epic ID | - |

### 3.4. Subtask

| JIRA 필드 | 값 | 비고 |
|----------|---|------|
| Summary | 템플릿 (예: "{date} 업데이트 {taskName} {subtaskName}") | WorkStage 설정 |
| Description | jiraDescription 필드 | 빈 값 허용 |
| customfield_10569 | startDateTime (ISO 8601, KST) | 날짜+시각 |
| customfield_10570 | endDateTime (ISO 8601, KST) | 날짜+시각 |
| Assignee | jiraAssignee (Account ID) | 빈 값이면 현재 사용자 |
| Issue Type | "Sub-task" | 고정 |
| Parent | Task ID | - |

---

## 4. JIRA Summary 템플릿 시스템

### 4.1. 개요

사용자가 JIRA Summary 형식을 **변수로 커스터마이징** 가능

**적용 범위**: Epic, Task, Subtask 모두

**설정 위치**:
- **Epic 템플릿**: 프로젝트 편집 모달 (설정 → 프로젝트 관리)
- **헤즈업 Task 템플릿**: 프로젝트 편집 모달 (설정 → 프로젝트 관리)
- **일반 Task/Subtask 템플릿**: 업무 단계 편집 모달 (설정 → 업무 단계 관리)

**저장**:
- Epic/헤즈업: Supabase `projects` 테이블 (jira_epic_template, jira_headsup_template)
- Task/Subtask: Supabase `work_stages` 테이블 (jira_summary_template)

### 4.2. 사용 가능한 변수

| 변수 | 설명 | 예시 | 적용 범위 |
|------|------|------|----------|
| {date} | 업데이트일 (YYMMDD) | 260210 | 모두 |
| {headsUp} | 헤즈업 날짜 (MMDD) | 0128 | 모두 |
| {projectName} | 프로젝트명 | M4/GL | 모두 |
| {taskName} | Task 배치명 | REGULAR | Task, Subtask |
| {subtaskName} | Subtask 배치명 | 번역 | Subtask |
| {stageName} | 현재 업무 단계명 | REGULAR 또는 번역 | Task, Subtask |

**문법**: `{variableName}` (중괄호)

### 4.3. 템플릿 예시

```
Epic: "{date} 업데이트"
→ "260210 업데이트"

Task: "{date} 업데이트 {taskName}"
→ "260210 업데이트 REGULAR"

Subtask: "{date} 업데이트 {taskName} {subtaskName}"
→ "260210 업데이트 REGULAR 번역"
```

### 4.4. 설정 UI

업무 단계 편집 모달에 필드 추가:
```
JIRA Summary 템플릿: [?]
[{date} 업데이트 {taskName}_______________]
```

**[?] 툴팁**:
```
사용 가능한 변수:
{date} - 업데이트일 (YYMMDD)
{projectName} - 프로젝트명
{taskName} - Task 배치명
{subtaskName} - Subtask 배치명
```

### 4.5. 검증

**저장 시** (실시간):
- 유효하지 않은 변수 → 에러, 저장 불가
- 예: "{unknownVar}" → "유효하지 않은 변수"

**JIRA 생성 시**:
- 검증 통과했으므로 정상
- 만약 오류: 변수 그대로 유지

### 4.6. 템플릿 기본값 (Fallback)

**상황**: `work_stages.jira_summary_template`이 NULL인 경우

**처리** (V1-5 확정):
```typescript
function getSummary(stage: WorkStage, variables: TemplateVars): string {
  // 템플릿이 설정되어 있으면 사용
  if (stage.jiraSummaryTemplate) {
    return applyTemplate(stage.jiraSummaryTemplate, variables);
  }

  // NULL이면 기본 형식 사용 (fallback)
  if (stage.depth === 0) {
    // Task 기본 형식
    return `${variables.date} 업데이트 ${variables.taskName}`;
  } else {
    // Subtask 기본 형식
    return `${variables.date} 업데이트 ${variables.taskName} ${variables.subtaskName}`;
  }
}
```

**기본 형식**:
- Epic: "{date} 업데이트"
- Task: "{date} 업데이트 {taskName}"
- Subtask: "{date} 업데이트 {taskName} {subtaskName}"

**장점**: 즉시 사용 가능 (템플릿 설정 선택적)

---

## 5. JIRA 인증 및 설정

### 5.1. 인증 방식

**Basic Authentication**:
```
Authorization: Basic base64(email:api_token)
```

**이메일**: Google OAuth 이메일 (jkcho@wemade.com)
**API Token**: 사용자 입력

### 5.2. 설정 데이터

**LocalStorage**:
```typescript
interface JiraConfig {
  apiToken: string;   // 평문 저장
  accountId: string;  // 자동 조회
}
```

**환경 변수** (.env):
```env
VITE_JIRA_URL=https://wemade.atlassian.net
VITE_JIRA_CUSTOM_FIELD_START=customfield_10569
VITE_JIRA_CUSTOM_FIELD_END=customfield_10570
```

### 5.3. 설정 UI

**탭**: 설정 → "JIRA 연동 설정" (신규)

```
┌───────────────────────────────────────┐
│ JIRA 연동 설정                         │
├───────────────────────────────────────┤
│                                       │
│ JIRA API Token:                       │
│ [********************]  [👁️ 표시]    │
│                                       │
│          [🔗 연동 테스트]  [저장]     │
│                                       │
│ ✅ JIRA 연동 성공!                    │
│ 계정: jkcho@wemade.com                │
│ Account ID: 5b10a2844c...             │
└───────────────────────────────────────┘
```

**연동 테스트**:
1. Google OAuth 이메일 + API Token
2. `/rest/api/3/myself` 호출
3. Account ID 획득 및 표시
4. LocalStorage 저장

---

## 6. 미리보기 모달

### 6.1. UI

```
┌────────────────────────────────────────┐
│ JIRA 일감 미리보기                      │
├────────────────────────────────────────┤
│                                        │
│ 📦 Epic: 260210 업데이트                │
│    01/28 ~ 02/15                       │
│                                        │
│ ├─ 📋 [Task] 260210 업데이트 일정 헤즈업│
│ │    01/28 09:00 ~ 18:00              │
│ │                                      │
│ ├─ 📋 [Task] 260210 업데이트 REGULAR   │
│ │    01/10 09:00 ~ 01/15 18:00        │
│ │  ├─ 📄 [Sub-task] ... 번역          │
│ │  └─ 📄 [Sub-task] ... 검수          │
│ │                                      │
│ └─ 📋 [Task] 260210 업데이트 EXTRA1    │
│                                        │
│ 총 1 Epic, 3 Tasks, 2 Subtasks         │
│                                        │
│              [취소]  [JIRA 생성]       │
└────────────────────────────────────────┘
```

**표시**: Summary, 날짜, Issue Type, 통계
**비표시**: Assignee, Description

---

## 7. Supabase 스키마 변경

**통합 마이그레이션**: Phase 0.5와 Phase 1의 모든 스키마 변경을 하나의 마이그레이션 파일로 통합

**파일**: `supabase/migrations/002_phase0_5_and_phase1_jira_integration.sql`

**상세 내용**: [Azrael-PRD-Phase0.5.md](./Azrael-PRD-Phase0.5.md) §4.3 참조

**변경 사항 요약**:

### 7.1. projects 테이블 (3개 컬럼 추가)
- `jira_project_key TEXT` - JIRA 프로젝트 키 (Phase 1)
- `jira_epic_template TEXT` - Epic Summary 템플릿 (Phase 0.5)
- `jira_headsup_template TEXT` - 헤즈업 Task Summary 템플릿 (Phase 0.5)

### 7.2. work_stages 테이블 (2개 변경)
- `order` 타입 변경: INTEGER → DECIMAL(5,1) (Phase 0.5)
- `jira_summary_template TEXT` 컬럼 추가 (Phase 0.5)

### 7.3. jira_epic_mappings 테이블 (신규, Phase 1)
- Epic ID 추적 (프로젝트 + 업데이트일별)
- RLS 정책: 읽기(전체), 쓰기(화이트리스트 5명)

### 7.4. jira_task_mappings 테이블 (신규, Phase 1)
- Task/Subtask stageId 매핑
- 목적: 템플릿 변경 시에도 정확한 업데이트 매칭
- RLS 정책: 읽기(전체), 쓰기(화이트리스트 5명)

**헤즈업 Task 특수 처리**:
- stageId = **"HEADSUP"** (고정값, WorkStage 아님)
- jira_task_mappings에 `stage_id = "HEADSUP"` 저장

---

## 8. Supabase Edge Functions (CORS 우회)

**배경**: JIRA Cloud는 CORS를 차단하므로 브라우저에서 직접 호출 불가

**해결**: Supabase Edge Functions를 프록시로 사용

### 8.1. Edge Function: jira-create

**파일**: `supabase/functions/jira-create/index.ts`

**요청 구조** (명확화):
```typescript
{
  projectKey: string;
  epic: {
    summary: string;
    startDate: string;  // ISO 8601, KST
    endDate: string;    // ISO 8601, KST
  };
  tasks: {
    stageId: string;    // WorkStage ID 또는 "HEADSUP" (헤즈업 Task)
    type: 'Task' | 'Sub-task';
    summary: string;
    description?: string;
    startDate: string;
    endDate: string;
    assignee?: string;  // Account ID
    parentStageId?: string;  // Subtask의 경우 부모 Task stageId
  }[];
  jiraAuth: {
    email: string;
    apiToken: string;
  };
}
```

**Note**: Epic과 Tasks/Subtasks를 구분하여 요청

**응답**:
```typescript
{
  success: boolean;
  createdIssues: {
    id: string;
    key: string;
    type: string;
  }[];
  error?: string;
}
```

**로직**:
1. JIRA API 순차 호출 (Epic → Tasks → Subtasks)
2. 생성된 Issue ID 수집
3. 실패 시 역순 삭제 (롤백)
4. 결과 반환

### 8.2. Edge Function: jira-update

**파일**: `supabase/functions/jira-update/index.ts`

**요청**:
```typescript
{
  epicId: string;
  updates: {
    issueId?: string;  // 있으면 UPDATE, 없으면 CREATE
    stageId: string;
    summary: string;
    startDate: string;
    endDate: string;
    assignee?: string;
  }[];
  jiraAuth: {
    email: string;
    apiToken: string;
  };
}
```

**응답**:
```typescript
{
  success: boolean;
  updatedCount: number;
  createdCount: number;
  error?: string;
}
```

### 8.3. 클라이언트 호출

```typescript
// src/lib/jira/edgeFunctions.ts
async function createJiraIssues(data: CreateJiraRequest) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/jira-create`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }
  );

  if (!response.ok) throw new Error('JIRA 생성 실패');
  return await response.json();
}
```

### 8.4. JIRA API Rate Limit 처리 (V1-6)

**배경**: JIRA Cloud API Rate Limit

**Note**: 실제 Rate Limit 값은 JIRA 계정 타입에 따라 다름
- Free: 20 req/10초
- Standard: 100 req/10초
- Premium: 더 높음
- **개발 중 실제 값 확인 필요** (Response Header: `X-RateLimit-Limit`)

**해결**: Edge Function 내부에서 배치 간격 추가 (안전한 기본값: 100ms)

```typescript
// supabase/functions/jira-create/index.ts
async function createIssuesWithRateLimit(issues, jiraAuth) {
  const createdIssues = [];

  for (const issue of issues) {
    // JIRA API 호출
    const result = await callJiraAPI(issue, jiraAuth);
    createdIssues.push(result);

    // 다음 호출 전 100ms 대기 (Rate Limit 회피)
    if (createdIssues.length < issues.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return createdIssues;
}
```

**영향**:
- Task 50개 생성 시: 5초 소요
- Rate Limit 회피
- 사용자는 로딩 표시만 확인

**429 응답 처리** (VR2-2):
- 100ms 간격으로도 429 발생 시: 에러 표시
- 에러 메시지: "JIRA 요청 한도 초과. 잠시 후 다시 시도하세요."
- **재시도 로직은 Phase 1.5 이후 개선 과제** (현재 보류)

### 8.5. Edge Functions 배포 가이드

**Supabase CLI 설치**:
```bash
npm install -g supabase
```

**프로젝트 링크**:
```bash
supabase link --project-ref vgoqkyqqkieogrtnmsva
```

**배포**:
```bash
supabase functions deploy jira-create
supabase functions deploy jira-update
```

**환경 변수 설정** (Supabase Dashboard → Edge Functions → Secrets):
```
JIRA_URL=https://wemade.atlassian.net
JIRA_CUSTOM_FIELD_START=customfield_10569
JIRA_CUSTOM_FIELD_END=customfield_10570
```

**로컬 테스트**:
```bash
# .env.local 파일 생성
echo "JIRA_URL=https://wemade.atlassian.net" > .env.local

# 로컬 서버 시작
supabase functions serve --env-file .env.local

# 테스트 호출
curl -i --location --request POST 'http://localhost:54321/functions/v1/jira-create' \
  --header 'Authorization: Bearer ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"projectKey":"TEST",...}'
```

---

## 9. Phase 0 수정사항

### 9.1. 테이블 2/3 컬럼 추가

**새 컬럼**: "JIRA 담당자"

**헤더**:
```
| # | 배치 | HO | HB | 설명 | JIRA 설명 | JIRA 담당자 | [+][↓][✕] |
```

**데이터**: Account ID
**필수**: 선택적 (빈 값이면 현재 사용자)

**ScheduleEntry**:
```typescript
interface ScheduleEntry {
  // ...
  jiraAssignee?: string;
}
```

### 9.2. 하위 일감 템플릿 설정

업무 단계 편집 모달에 아코디언 추가:
- 하위 일감 목록
- 인라인 폼으로 추가/편집
- Supabase parent_stage_id 활용

자세한 내용: [Azrael-PRD-Phase0.5.md](./Azrael-PRD-Phase0.5.md) 참조

---

## 10. 에러 처리

### 10.1. JIRA 설정 없음
- "JIRA 연동 설정 필요" → 설정 이동

### 10.2. 프로젝트 키 없음
- "JIRA 프로젝트 키 설정 필요" → 프로젝트 편집

### 10.3. Epic 중복
- "이미 생성됨, 업데이트 사용" 에러

### 10.4. 생성 실패
- 전체 롤백 (역순 삭제)
- 에러 메시지: "JIRA 일감 생성에 실패했습니다: {error.message}"

**롤백 실패 시** (VR2-5):
- 일부 일감 삭제 실패 가능
- 에러 메시지:
  ```
  일감 생성 실패. 다음 일감이 JIRA에 남아있습니다:
  - Epic: PROJ-123
  - Task: PROJ-124 (헤즈업)
  - Task: PROJ-125 (REGULAR)
  - Subtask: PROJ-126 (REGULAR 번역)

  JIRA에서 수동 삭제하세요.
  ```
- Edge Function이 생성된 모든 Issue Key 목록 반환

### 10.5. Epic 수동 삭제됨
- "Epic 없음 ({epicKey}), 매핑 삭제?" 확인
- 확인 → Supabase jira_epic_mappings 삭제

### 10.6. Edge Function 타임아웃 (VR2-3)
- **상황**: 50초 초과 시 Edge Function 타임아웃
- **에러 메시지**: "시간 초과로 일감 생성 상태를 확인할 수 없습니다. JIRA에서 직접 확인해주세요."
- **정보 제공**: 가능한 Epic Key 표시 (부분 생성 가능성)
- **사용자 조치**: JIRA에서 수동 확인

### 10.7. Supabase 저장 실패 (VR2-4)
- **상황**: JIRA 생성 성공 → Supabase jira_epic_mappings 저장 실패
- **처리**:
  1. 3회 재시도 (Exponential Backoff: 1초, 2초, 4초)
  2. 3회 실패 → 에러 표시
- **에러 메시지**: "JIRA 일감은 생성되었으나 연결 정보 저장에 실패했습니다. Epic: {epicKey}. 다음 생성 시 주의하세요."
- **영향**: JIRA에 일감 존재, Supabase에 매핑 없음 (불일치 상태)
- **복구**: 사용자가 다음 생성 시 Epic 중복 확인 가능, 또는 JIRA에서 수동 삭제

---

## 11. 개발 일정

**Phase 0.5**: 1주 (하위 일감 템플릿, 테이블 컬럼)
**Phase 1**: 3-4주 (JIRA API, 템플릿, 미리보기)
**총**: 4-5주

---

## 12. 참조 문서

- **Master**: [Azrael-PRD-Master.md](./Azrael-PRD-Master.md)
- **Shared**: [Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)
- **Phase 0**: [Azrael-PRD-Phase0.md](./Azrael-PRD-Phase0.md)
- **최종 요구사항**: [Phase1-Final-Requirements-Summary.md](./Phase1-Final-Requirements-Summary.md)

---

**문서 종료**
