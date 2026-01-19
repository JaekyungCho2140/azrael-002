# Azrael Phase 0.5 & Phase 1 개발 로드맵

**프로젝트**: Azrael - L10n 일정 관리 도구
**작성일**: 2026-01-16
**참조**:
- [prd/Azrael-PRD-Phase0.5.md](./prd/Azrael-PRD-Phase0.5.md)
- [prd/Azrael-PRD-Phase1.md](./prd/Azrael-PRD-Phase1.md)
- [prd/Phase1-Final-Requirements-Summary.md](./prd/Phase1-Final-Requirements-Summary.md)

---

## 📋 개발 개요

### Phase 0.5 목표
Phase 1 (JIRA 연동) 개발을 위한 **Phase 0 수정사항**:
- 하위 일감 템플릿 설정 기능 (설정 화면 UI 대폭 변경)
- 테이블 2/3 "JIRA 담당자" 컬럼 추가
- JIRA Summary 템플릿 저장 공간

### Phase 1 목표
**JIRA 일감 자동 생성 및 업데이트**:
- JIRA Epic/Task/Subtask 자동 생성
- 일정 변경 시 JIRA 일감 자동 업데이트
- JIRA Summary 템플릿 시스템 (변수 커스터마이징)
- Supabase Edge Functions를 통한 CORS 우회

### 예상 개발 기간
- **Phase 0.5**: 1주 (5일)
- **Phase 1**: 3-4주 (15-20일)
- **총**: 4-5주

---

## 🏗️ Phase 0.5: Phase 1 전제조건 (Phase 0 수정)

**⚠️ 중요**: Phase 1 개발 전에 **반드시 완료** 필요

### 1. Supabase 스키마 변경

#### 1.1. work_stages 테이블 order 타입 변경
- [x] **order 타입 변경: INTEGER → DECIMAL(5,1)**
  - 목적: 부모 (1.0, 2.0), 하위 일감 (1.1~1.9) 표현
  - Zero-downtime 마이그레이션 전략
  - 참조: [prd/Azrael-PRD-Phase0.5.md §4.2](./prd/Azrael-PRD-Phase0.5.md)

**마이그레이션 SQL**:
```sql
-- 기존 인덱스 삭제
DROP INDEX IF EXISTS idx_work_stages_order;

-- 새 컬럼 생성
ALTER TABLE work_stages ADD COLUMN order_decimal DECIMAL(5,1);

-- 데이터 복사 (INTEGER → DECIMAL 변환)
UPDATE work_stages SET order_decimal = "order"::DECIMAL(5,1);

-- NOT NULL 제약 추가
ALTER TABLE work_stages ALTER COLUMN order_decimal SET NOT NULL;

-- 기존 컬럼 삭제
ALTER TABLE work_stages DROP COLUMN "order";

-- 컬럼명 변경
ALTER TABLE work_stages RENAME COLUMN order_decimal TO "order";

-- 인덱스 재생성
CREATE INDEX idx_work_stages_order ON work_stages("order");
```

#### 1.2. work_stages 테이블 컬럼 추가
- [x] **jira_summary_template TEXT 컬럼 추가**
  - 용도: JIRA Summary 템플릿 저장 (각 업무 단계별)
  - 기본값: NULL (fallback: 기본 형식 사용)
  - 참조: [prd/Azrael-PRD-Phase0.5.md §4.2](./prd/Azrael-PRD-Phase0.5.md)

```sql
ALTER TABLE work_stages
ADD COLUMN jira_summary_template TEXT;

COMMENT ON COLUMN work_stages.jira_summary_template
IS 'JIRA Task/Subtask Summary 템플릿 (예: {date} 업데이트 {taskName})';
```

#### 1.3. projects 테이블 컬럼 추가 (Phase 1 선행)
- [x] **JIRA 관련 컬럼 3개 추가**
  - `jira_project_key TEXT`: JIRA 프로젝트 키 (Phase 1)
  - `jira_epic_template TEXT`: Epic Summary 템플릿 (Phase 0.5)
  - `jira_headsup_template TEXT`: 헤즈업 Task Summary 템플릿 (Phase 0.5)
  - 참조: [prd/Azrael-PRD-Phase0.5.md §4.1](./prd/Azrael-PRD-Phase0.5.md)

```sql
ALTER TABLE projects
ADD COLUMN jira_project_key TEXT,
ADD COLUMN jira_epic_template TEXT,
ADD COLUMN jira_headsup_template TEXT;
```

#### 1.4. 마이그레이션 파일 작성 및 배포
- [x] **통합 마이그레이션 파일 작성**
  - 파일명: `supabase/migrations/002_phase0_5_and_phase1_jira_integration.sql`
  - Phase 0.5 + Phase 1 스키마 변경 통합
  - 참조: [prd/Azrael-PRD-Phase0.5.md §4.3](./prd/Azrael-PRD-Phase0.5.md)

- [x] **Supabase CLI로 마이그레이션 배포**
  ```bash
  supabase db push
  ```
  ✅ 완료: Supabase MCP를 통해 7개 마이그레이션 배포 성공

---

### 2. TypeScript 인터페이스 변경

#### 2.1. WorkStage 인터페이스 수정
- [x] **jiraSummaryTemplate 필드 추가**
  - 파일: `src/types/index.ts`
  - 타입: `string | undefined`
  - 참조: [prd/Azrael-PRD-Phase0.5.md §10.1](./prd/Azrael-PRD-Phase0.5.md)

```typescript
interface WorkStage {
  id: string;
  name: string;
  startOffsetDays: number;
  endOffsetDays: number;
  startTime: string;
  endTime: string;
  tableTargets: ('table1'|'table2'|'table3')[];
  order: number;                      // number (DECIMAL 5,1)
  parentStageId?: string;
  depth: number;
  jiraSummaryTemplate?: string;       // 신규 추가
}
```

#### 2.2. ScheduleEntry 인터페이스 수정
- [x] **jiraAssignee 필드 추가**
  - 파일: `src/types/index.ts`
  - 타입: `string | undefined` (JIRA Account ID)
  - 참조: [prd/Azrael-PRD-Phase0.5.md §5.1](./prd/Azrael-PRD-Phase0.5.md)

```typescript
interface ScheduleEntry {
  id: string;
  index: number;
  stageId: string;
  stageName: string;
  startDateTime: Date;
  endDateTime: Date;
  description: string;
  assignee?: string;              // 테이블 1 전용
  jiraDescription?: string;       // 테이블 2/3 전용
  jiraAssignee?: string;          // 테이블 2/3 전용 (신규)
  parentId?: string;
  children?: ScheduleEntry[];
  isManualEdit: boolean;
}
```

#### 2.3. Project 인터페이스 수정
- [x] **JIRA 관련 필드 3개 추가**
  - 파일: `src/types/index.ts`

```typescript
interface Project {
  id: string;
  name: string;
  headsUpOffset: number;
  iosReviewOffset?: number;
  showIosReviewDate: boolean;
  templateId: string;
  disclaimer: string;
  jiraProjectKey?: string;        // Phase 1
  jiraEpicTemplate?: string;      // Phase 0.5
  jiraHeadsupTemplate?: string;   // Phase 0.5
}
```

#### 2.4. 타입 오류 수정
- [x] **전체 프로젝트 타입 체크**
  ```bash
  npm run typecheck
  ```
- [x] **발견된 타입 오류 모두 수정**

---

### 3. 테이블 2/3 "JIRA 담당자" 컬럼 추가

#### 3.1. 테이블 구조 변경
- [x] **테이블 2/3 헤더 수정**
  - 변경 전: `| # | 배치 | HO | HB | 설명 | JIRA 설명 | [+][↓][✕] |`
  - 변경 후: `| # | 배치 | HO | HB | 설명 | JIRA 설명 | JIRA 담당자 | [+][↓][✕] |`
  - 위치: "JIRA 설명" 뒤, 버튼 앞
  - 참조: [prd/Azrael-PRD-Phase0.5.md §3.1](./prd/Azrael-PRD-Phase0.5.md)

#### 3.2. 셀 스타일링
- [x] **"JIRA 담당자" 컬럼 CSS 작성**
  - 헤더: "JIRA 담당자" 또는 "Assignee"
  - 너비: 100-120px
  - 정렬: 가운데
  - 편집: contentEditable
  - 표시: 앞 8자 + "..." (전체는 편집 모드에서)
  - 참조: [prd/Phase0.5-Requirements-Questions-Round1.md 질문 5](./prd/Phase0.5-Requirements-Questions-Round1.md)

#### 3.3. 편집 기능 구현
- [x] **셀 편집 로직 구현**
  - 진입: 셀 클릭 → contentEditable 활성화
  - 편집: Account ID 텍스트 입력
  - 종료: 셀 밖 클릭 또는 Enter → LocalStorage 저장
  - 저장: `ScheduleEntry.jiraAssignee` 업데이트
  - 참조: [prd/Azrael-PRD-Phase0.5.md §3.4](./prd/Azrael-PRD-Phase0.5.md)

```typescript
function saveCellEdit(entryId: string, value: string) {
  const entry = findEntryById(entryId);
  entry.jiraAssignee = value.trim() || undefined; // 빈 값은 undefined

  localStorage.setItem(
    `azrael:calculation:${projectId}`,
    JSON.stringify(currentResult)
  );

  showSuccess('저장되었습니다');
}
```

#### 3.4. 모든 엔트리에 표시
- [x] **부모 + 하위 일감 모두에 "JIRA 담당자" 셀 추가**
  - 빈 셀 허용 (Phase 1에서 현재 사용자로 자동 설정)

---

### 4. 설정 화면: 업무 단계 편집 모달 확장

#### 4.1. 아코디언 UI 구현
- [x] **"하위 일감 템플릿" 아코디언 섹션 추가**
  - 초기 상태: 접혀있음 (▶ 하위 일감 템플릿)
  - 클릭: ▶ → ▼ 전환, 하위 일감 목록 표시
  - 상태 관리: React state (세션 단위, 메모리)
  - 참조: [prd/Azrael-PRD-Phase0.5.md §2.2](./prd/Azrael-PRD-Phase0.5.md)

#### 4.2. JIRA Summary 템플릿 입력 필드
- [x] **부모 업무 JIRA Summary 템플릿 필드 추가**
  - 위치: "테이블" 체크박스 아래
  - Placeholder: `"{date} 업데이트 {taskName}"`
  - [?] 툴팁: 사용 가능한 변수 안내
  - 참조: [prd/Phase0.5-Requirements-Questions-Round1.md 질문 6](./prd/Phase0.5-Requirements-Questions-Round1.md)

```typescript
// 툴팁 내용
사용 가능한 변수:
{date} - 업데이트일 (YYMMDD)
{headsUp} - 헤즈업 날짜 (MMDD)
{projectName} - 프로젝트명
{taskName} - Task 배치명
{subtaskName} - Subtask 배치명 (하위 일감만)
{stageName} - 현재 업무 단계명
```

#### 4.3. 하위 일감 인라인 폼 구현
- [x] **하위 일감 목록 렌더링**
  - 각 하위 일감마다 인라인 폼 표시
  - 필드: 배치명, 시작 Offset, 종료 Offset, 시작 시각, 종료 시각, 테이블 체크박스, JIRA Summary 템플릿
  - 인덱스 자동 번호 (1, 2, 3...)
  - 참조: [prd/Azrael-PRD-Phase0.5.md §2.1](./prd/Azrael-PRD-Phase0.5.md)

#### 4.4. [+ 하위 일감 추가] 버튼
- [x] **버튼 클릭 시 새 인라인 폼 추가**
  - 기본값:
    - 배치명: 빈 값 (사용자 입력 필요)
    - Offset: 빈 값 (사용자 입력 필요)
    - 시각: 빈 값 (사용자 입력 필요)
    - 테이블: 부모와 동일
    - JIRA Summary: `"{date} 업데이트 {taskName} {subtaskName}"`
  - 참조: [prd/Phase0.5-Requirements-Questions-Round1.md 질문 2](./prd/Phase0.5-Requirements-Questions-Round1.md)

#### 4.5. [✕ 삭제] 버튼
- [x] **확인 다이얼로그 표시**
  - "이 하위 일감을 삭제하시겠습니까?" 확인
  - 확인 → 폼 제거 (아직 저장 안 됨)
  - 인덱스 자동 재정렬
  - 참조: [prd/Phase0.5-Requirements-Questions-Round1.md 질문 7](./prd/Phase0.5-Requirements-Questions-Round1.md)

#### 4.6. 하위 일감 depth 제한
- [x] **하위 일감 (depth=1) 편집 시 "하위 일감 템플릿" 섹션 숨김**
  - 최대 2단계만 허용
  - 하위의 하위는 생성 불가
  - 참조: [prd/Phase0.5-Requirements-Questions-Round1.md 질문 3](./prd/Phase0.5-Requirements-Questions-Round1.md)

#### 4.7. [저장] 동작 구현
- [x] **하위 일감 개수 검증**
  - 최대 9개 제한
  - 초과 시: "하위 일감은 최대 9개까지 추가할 수 있습니다" 에러
  - 참조: [prd/Azrael-PRD-Phase0.5.md §2.5](./prd/Azrael-PRD-Phase0.5.md)

- [x] **부모 WorkStage 업데이트**
  - Supabase `work_stages` UPDATE (배치명, Offset, 시각, 테이블, JIRA Summary)

- [x] **기존 하위 일감 삭제**
  - Supabase에서 `parent_stage_id = {부모ID}` 레코드 모두 삭제
  - CASCADE로 하위의 하위도 삭제

- [x] **새 하위 일감 생성**
  - 폼에 입력된 하위 일감들을 순서대로 INSERT
  - `parent_stage_id` = 부모 ID
  - `depth` = 1
  - `order` = 부모.order + (0.1 * 인덱스)
    - 예: 부모 order=1.0 → 하위: 1.1, 1.2, 1.3

- [x] **React Query 캐시 무효화**
  - `invalidateQueries(['templates'])`

- [x] **성공 메시지 표시**
  - "저장되었습니다"

---

### 5. 설정 화면: 프로젝트 편집 모달 확장

#### 5.1. JIRA 프로젝트 키 필드 추가
- [x] **"JIRA 프로젝트 키" 입력 필드 추가**
  - 위치: Disclaimer 필드 아래
  - Placeholder: "예: M4L10N, NCL10N"
  - 용도: Phase 1 JIRA Epic 생성 시 사용
  - 참조: [prd/Phase1-Final-Requirements-Summary.md §4.1](./prd/Phase1-Final-Requirements-Summary.md)

#### 5.2. Epic/헤즈업 Task Summary 템플릿 필드 추가
- [x] **"Epic Summary 템플릿" 입력 필드**
  - Placeholder: `"{date} 업데이트"`
  - [?] 툴팁: 사용 가능한 변수 안내
  - 기본값: NULL (Phase 1에서 fallback 사용)

- [x] **"헤즈업 Task Summary 템플릿" 입력 필드**
  - Placeholder: `"{date} 업데이트 일정 헤즈업"`
  - [?] 툴팁: 사용 가능한 변수 안내
  - 기본값: NULL (Phase 1에서 fallback 사용)

- [x] **프로젝트 저장 시 Supabase 업데이트**
  - `jira_project_key`, `jira_epic_template`, `jira_headsup_template` 저장

---

### 6. Supabase API 훅 수정

#### 6.1. useSaveTemplate 훅 수정
- [x] **하위 일감 저장 로직 추가**
  - 참조: [prd/Azrael-PRD-Phase0.5.md §9.1](./prd/Azrael-PRD-Phase0.5.md)

```typescript
mutationFn: async (template: WorkTemplate) => {
  // 1. 기존 work_stages 삭제 (template_id)
  await supabase
    .from('work_stages')
    .delete()
    .eq('template_id', template.id);

  // 2. 새 work_stages INSERT (parent_stage_id, jira_summary_template 포함)
  const stages = template.stages.map(stage => ({
    ...stage,
    template_id: template.id,
    parent_stage_id: stage.parentStageId || null,
    jira_summary_template: stage.jiraSummaryTemplate || null
  }));

  await supabase
    .from('work_stages')
    .insert(stages);
}
```

---

### 7. 테스트

#### 7.1. 단위 테스트
- [x] **order 타입 변경 테스트**
  - DECIMAL(5,1) 정렬 검증 (1.0, 1.1, 1.2, 2.0)

#### 7.2. 통합 테스트
- [x] **하위 일감 템플릿 CRUD 테스트**
  - 추가 → 저장 → Supabase 조회 → 검증
  - 수정 → 저장 → Supabase 조회 → 검증
  - 삭제 → 저장 → Supabase 조회 → 검증 (CASCADE)

- [x] **테이블 "JIRA 담당자" 편집 테스트**
  - 셀 클릭 → 편집 → 저장 → LocalStorage 검증
  - 빈 값 저장 → undefined 검증

- [x] **JIRA Summary 템플릿 저장 테스트**
  - 부모 업무 템플릿 저장 → Supabase 조회
  - 하위 일감 템플릿 저장 → Supabase 조회

---

## 🔗 Phase 1: JIRA 연동

**⚠️ 전제조건**: Phase 0.5 완료 필수

### 8. Supabase 스키마 추가 (Phase 1 전용)

#### 8.1. jira_epic_mappings 테이블 생성
- [x] **Epic ID 추적 테이블 생성**
  - 참조: [prd/Phase1-Final-Requirements-Summary.md §5.1.2](./prd/Phase1-Final-Requirements-Summary.md)

```sql
CREATE TABLE jira_epic_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  update_date DATE NOT NULL,
  epic_id TEXT NOT NULL,         -- JIRA Epic ID (내부 ID)
  epic_key TEXT NOT NULL,        -- JIRA Epic Key (예: "L10N-45")
  epic_url TEXT,                 -- JIRA Epic URL
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL,
  UNIQUE(project_id, update_date),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT
);

ALTER TABLE jira_epic_mappings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_jira_epic_mappings_project_date
  ON jira_epic_mappings(project_id, update_date);
```

#### 8.2. jira_task_mappings 테이블 생성
- [x] **Task/Subtask stageId 매핑 테이블 생성**
  - 목적: 템플릿 변경 시에도 정확한 업데이트 매칭
  - 참조: [prd/Azrael-PRD-Phase1.md §7](./prd/Azrael-PRD-Phase1.md)

```sql
CREATE TABLE jira_task_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_mapping_id UUID NOT NULL,
  stage_id TEXT NOT NULL,              -- WorkStage ID 또는 "HEADSUP"
  is_headsup BOOLEAN NOT NULL DEFAULT FALSE,
  task_id TEXT NOT NULL,               -- JIRA Task/Subtask ID
  task_key TEXT NOT NULL,              -- JIRA Task/Subtask Key
  task_url TEXT,
  issue_type TEXT NOT NULL,            -- "Task" or "Sub-task"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(epic_mapping_id, stage_id),
  FOREIGN KEY (epic_mapping_id) REFERENCES jira_epic_mappings(id) ON DELETE CASCADE,
  CONSTRAINT check_issue_type CHECK (issue_type IN ('Task', 'Sub-task')),
  CONSTRAINT check_headsup_consistency CHECK (
    (is_headsup = TRUE AND stage_id = 'HEADSUP') OR
    (is_headsup = FALSE AND stage_id != 'HEADSUP')
  )
);

ALTER TABLE jira_task_mappings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_jira_task_mappings_epic
  ON jira_task_mappings(epic_mapping_id);

CREATE INDEX idx_jira_task_mappings_stage
  ON jira_task_mappings(stage_id);
```

#### 8.3. RLS 정책 설정
- [x] **jira_epic_mappings RLS 정책**
  - 읽기: 모든 인증된 사용자
  - 쓰기: 화이트리스트 5명만

- [x] **jira_task_mappings RLS 정책**
  - 읽기: 모든 인증된 사용자
  - 쓰기: 화이트리스트 5명만

#### 8.4. updated_at 자동 갱신 트리거
- [x] **트리거 함수 생성 (존재하지 않으면)**
  ```sql
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  ```

- [x] **jira_epic_mappings 트리거 생성**
  ```sql
  CREATE TRIGGER update_jira_epic_mappings_updated_at
    BEFORE UPDATE ON jira_epic_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  ```

- [x] **jira_task_mappings 트리거 생성**
  ```sql
  CREATE TRIGGER update_jira_task_mappings_updated_at
    BEFORE UPDATE ON jira_task_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  ```

---

### 9. JIRA 인증 및 설정 UI

#### 9.1. LocalStorage JiraConfig 구조
- [x] **JiraConfig 인터페이스 정의**
  - 파일: `src/types/index.ts`

```typescript
interface JiraConfig {
  apiToken: string;      // JIRA API Token (평문 저장)
  accountId: string;     // 현재 사용자 JIRA Account ID
}
```

#### 9.2. 설정 화면: "JIRA 연동 설정" 탭 추가
- [x] **새 탭 "JIRA 연동 설정" 구현**
  - 위치: 설정 화면 (프로젝트 관리, 업무 단계 관리, 공휴일 관리 옆)

- [x] **JIRA API Token 입력 필드**
  - Input type: password
  - [표시/숨김] 버튼 구현 (눈 아이콘)

- [x] **[연동 테스트] 버튼 구현**
  - Google OAuth 이메일 획득
  - JIRA API 인증 헤더 생성: `Basic base64(email:apiToken)`
  - `/rest/api/3/myself` 호출 → Account ID 자동 조회
  - LocalStorage 저장: `jiraConfig`
  - 성공 메시지: "✅ JIRA 연동 성공! 계정: {email}, Account ID: {accountId}"
  - 참조: [prd/Phase1-Final-Requirements-Summary.md §4.2](./prd/Phase1-Final-Requirements-Summary.md)

- [x] **[저장] 버튼 구현**
  - LocalStorage에 API Token 저장

- [x] **연동 상태 표시**
  - 성공 시: "✅ JIRA 연동 성공!"
  - 실패 시: "❌ JIRA 연동 실패: {에러 메시지}"

---

### 10. 메인 화면: JIRA 버튼 추가

#### 10.1. [📋 JIRA 생성] 버튼
- [x] **버튼 UI 추가**
  - 위치: [계산] 버튼 옆
  - 아이콘: 📋
  - 텍스트: "JIRA 생성"

- [x] **활성화 조건 구현**
  - 계산 완료 + JIRA 설정 완료
  - 비활성화 시: 툴팁 "일정 계산 후 사용 가능"

#### 10.2. [🔄 JIRA 업데이트] 버튼
- [x] **버튼 UI 추가**
  - 위치: [JIRA 생성] 버튼 옆
  - 아이콘: 🔄
  - 텍스트: "JIRA 업데이트"

- [x] **활성화 조건 구현**
  - Epic이 생성되어 있음 (Supabase jira_epic_mappings 조회)
  - 비활성화 시: 툴팁 "먼저 JIRA 생성 필요"

---

### 11. JIRA Summary 템플릿 시스템

#### 11.1. 템플릿 변수 치환 엔진
- [x] **변수 치환 함수 구현**
  - 파일: `src/lib/jira/templates.ts`

```typescript
interface TemplateVars {
  date: string;          // YYMMDD
  headsUp: string;       // MMDD
  projectName: string;
  taskName: string;
  subtaskName?: string;
  stageName: string;
}

function applyTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/{date}/g, vars.date)
    .replace(/{headsUp}/g, vars.headsUp)
    .replace(/{projectName}/g, vars.projectName)
    .replace(/{taskName}/g, vars.taskName)
    .replace(/{subtaskName}/g, vars.subtaskName || '')
    .replace(/{stageName}/g, vars.stageName);
}
```

#### 11.2. 템플릿 검증 함수
- [x] **유효한 변수 체크 함수**
  - 설정 저장 시 실시간 검증
  - 유효하지 않은 변수 감지 → 에러 표시

```typescript
const VALID_VARIABLES = [
  'date', 'headsUp', 'projectName', 'taskName', 'subtaskName', 'stageName'
];

function validateTemplate(template: string): { valid: boolean; invalidVars: string[] } {
  const varRegex = /{(\w+)}/g;
  const invalidVars: string[] = [];
  let match;

  while ((match = varRegex.exec(template)) !== null) {
    const varName = match[1];
    if (!VALID_VARIABLES.includes(varName)) {
      invalidVars.push(varName);
    }
  }

  return {
    valid: invalidVars.length === 0,
    invalidVars
  };
}
```

#### 11.3. Summary 생성 함수 (Fallback 포함)
- [x] **getSummary 함수 구현**
  - 템플릿 있으면 사용, NULL이면 기본 형식
  - 참조: [prd/Azrael-PRD-Phase1.md §4.6](./prd/Azrael-PRD-Phase1.md)

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

---

### 12. JIRA 미리보기 모달

#### 12.1. 미리보기 모달 UI 구현
- [x] **모달 컴포넌트 생성**
  - 파일: `src/components/JiraPreviewModal.tsx`
  - 참조: [prd/Phase1-Final-Requirements-Summary.md §6.4](./prd/Phase1-Final-Requirements-Summary.md)

- [x] **Epic 정보 표시**
  - Summary, 시작일/종료일

- [x] **Task 목록 표시 (계층 구조)**
  - 헤즈업 Task
  - Ext. 테이블 Tasks (Subtasks 포함)
  - Int. 테이블 Tasks

- [x] **통계 표시**
  - 총 Epic, Task, Subtask 개수

- [x] **[취소] / [JIRA 생성] 버튼**
  - 취소: 모달 닫기
  - JIRA 생성: Edge Function 호출

---

### 13. Supabase Edge Functions 구현

#### 13.1. Edge Function 프로젝트 설정
- [x] **Supabase CLI 설치**
  ```bash
  npm install -g supabase
  ```
  ✅ 완료: 사용자가 설치 완료

- [x] **Supabase 프로젝트 링크**
  ```bash
  supabase link --project-ref vgoqkyqqkieogrtnmsva
  ```
  ✅ 완료: 인증 완료

- [ ] **환경 변수 설정 (Supabase Dashboard)** 🔴 사용자 수동 작업 필요
  - `JIRA_URL=https://wemade.atlassian.net`
  - `JIRA_CUSTOM_FIELD_START=customfield_10569`
  - `JIRA_CUSTOM_FIELD_END=customfield_10570`

#### 13.2. Edge Function: jira-create
- [x] **함수 생성**
  - 파일: `supabase/functions/jira-create/index.ts`
  - 참조: [prd/Azrael-PRD-Phase1.md §8.1](./prd/Azrael-PRD-Phase1.md)

- [x] **요청 구조 정의**
  ```typescript
  interface CreateJiraRequest {
    projectKey: string;
    epic: {
      summary: string;
      startDate: string;  // ISO 8601, KST
      endDate: string;
    };
    tasks: {
      stageId: string;    // WorkStage ID 또는 "HEADSUP"
      type: 'Task' | 'Sub-task';
      summary: string;
      description?: string;
      startDate: string;
      endDate: string;
      assignee?: string;
      parentStageId?: string;  // Subtask의 경우 부모 Task stageId
    }[];
    jiraAuth: {
      email: string;
      apiToken: string;
    };
  }
  ```

- [x] **Epic 생성 구현**
  - POST `/rest/api/3/issue`
  - Epic ID 획득

- [x] **Tasks 생성 구현 (순서대로)**
  1. 헤즈업 Task
  2. Ext. 테이블 Tasks
  3. Subtasks (부모 Task 하위)
  4. Int. 테이블 Tasks

- [x] **Rate Limit 처리 구현**
  - 각 API 호출 사이 100ms 대기
  - 429 응답 시 에러 표시
  - 참조: [prd/Azrael-PRD-Phase1.md §8.4](./prd/Azrael-PRD-Phase1.md)

- [x] **롤백 로직 구현**
  - 실패 시 역순으로 생성된 일감 삭제
  - 롤백 실패 시 생성된 Issue Key 목록 반환
  - 참조: [prd/Phase1-Final-Requirements-Summary.md §9.1](./prd/Phase1-Final-Requirements-Summary.md)

- [x] **응답 구조 정의**
  ```typescript
  interface CreateJiraResponse {
    success: boolean;
    createdIssues: {
      id: string;
      key: string;
      type: string;
      stageId: string;
    }[];
    error?: string;
  }
  ```

#### 13.3. Edge Function: jira-update
- [x] **함수 생성**
  - 파일: `supabase/functions/jira-update/index.ts`
  - 참조: [prd/Azrael-PRD-Phase1.md §8.2](./prd/Azrael-PRD-Phase1.md)

- [x] **요청 구조 정의**
  ```typescript
  interface UpdateJiraRequest {
    epicId: string;
    epicUpdate: {
      startDate: string;
      endDate: string;
    };
    updates: {
      issueId?: string;  // 있으면 UPDATE, 없으면 CREATE
      stageId: string;
      summary: string;
      startDate: string;
      endDate: string;
      assignee?: string;
      issueType: 'Task' | 'Sub-task';
      parentTaskId?: string;  // Subtask의 경우 부모 Task ID
    }[];
    jiraAuth: {
      email: string;
      apiToken: string;
    };
  }
  ```

- [x] **Epic 날짜 업데이트 구현**
  - PUT `/rest/api/3/issue/{epicId}`

- [x] **Task/Subtask 업데이트 구현**
  - issueId 있음: 날짜 업데이트 (PUT)
  - issueId 없음: 새로 생성 (POST)

- [x] **Rate Limit 처리 구현**
  - 각 API 호출 사이 100ms 대기

- [x] **응답 구조 정의**
  ```typescript
  interface UpdateJiraResponse {
    success: boolean;
    updatedCount: number;
    createdCount: number;
    createdIssues?: {
      id: string;
      key: string;
      stageId: string;
    }[];
    error?: string;
  }
  ```

#### 13.4. Edge Functions 배포
- [ ] **로컬 테스트** (선택적)
  ```bash
  # .env.local 파일 생성
  echo "JIRA_URL=https://wemade.atlassian.net" > supabase/functions/.env.local
  echo "JIRA_CUSTOM_FIELD_START=customfield_10569" >> supabase/functions/.env.local
  echo "JIRA_CUSTOM_FIELD_END=customfield_10570" >> supabase/functions/.env.local

  # 로컬 서버 시작
  supabase functions serve --env-file supabase/functions/.env.local

  # 테스트 호출
  curl -i --location --request POST 'http://localhost:54321/functions/v1/jira-create' \
    --header 'Authorization: Bearer ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"projectKey":"TEST",...}'
  ```

- [x] **프로덕션 배포**
  ```bash
  supabase functions deploy jira-create
  supabase functions deploy jira-update
  ```
  ✅ 완료: Supabase MCP를 통해 배포 성공
  - jira-create: ID 6df1117b..., 상태 ACTIVE
  - jira-update: ID 45d01e2d..., 상태 ACTIVE

---

### 14. JIRA 일감 생성 플로우

#### 14.1. [JIRA 생성] 버튼 클릭 핸들러
- [x] **JIRA 설정 확인**
  - LocalStorage `jiraConfig` 체크
  - 없으면: "JIRA 연동 설정 필요" 에러 → 설정 화면 이동

- [x] **프로젝트 키 확인**
  - `projects.jira_project_key` NULL 체크
  - 없으면: "JIRA 프로젝트 키 설정 필요" 에러 → 프로젝트 편집

- [x] **Epic 중복 체크**
  - Supabase `jira_epic_mappings` 조회 (project_id, update_date)
  - 이미 있으면: "이미 생성된 Epic이 있습니다" 에러 → 중단

- [x] **미리보기 모달 표시**
  - Epic, Tasks, Subtasks 정보 표시
  - 사용자 확인 대기

#### 14.2. 미리보기 모달 [JIRA 생성] 버튼
- [x] **Supabase 선삽입 (VR4-2: 동시 생성 방지)**
  - `jira_epic_mappings` 임시 레코드 생성 (epic_id = 'PENDING')
  - UNIQUE 제약으로 두 번째 사용자 INSERT 실패
  - 실패 시: "다른 사용자가 생성 중입니다" 에러
  - 참조: [prd/Azrael-PRD-Phase1.md §2.1](./prd/Azrael-PRD-Phase1.md)

- [x] **Edge Function 호출**
  - `POST /functions/v1/jira-create`
  - 요청 데이터: Epic, Tasks, Subtasks
  - 로딩 표시

- [x] **성공 처리**
  - Supabase `jira_epic_mappings` 업데이트 (Epic ID, Key 확정)
  - Supabase `jira_task_mappings` 저장 (모든 Task/Subtask stageId 매핑)
  - 성공 메시지: "JIRA 일감이 생성되었습니다"
  - JIRA Epic 링크 표시

- [x] **실패 처리 (롤백)**
  - Supabase 임시 레코드 삭제
  - 에러 메시지 표시

- [x] **Supabase 저장 실패 처리 (VR2-4)**
  - 3회 재시도 (Exponential Backoff: 1초, 2초, 4초)
  - retryWithBackoff 함수 사용
  - 참조: [prd/Azrael-PRD-Phase1.md §10.7](./prd/Azrael-PRD-Phase1.md)

---

### 15. JIRA 일감 업데이트 플로우

#### 15.1. [JIRA 업데이트] 버튼 클릭 핸들러
- [x] **Epic 확인**
  - Supabase `jira_epic_mappings` 조회
  - 없으면: "먼저 JIRA 생성 필요" 에러

- [x] **Task 매칭 (stageId 기반)**
  - Supabase `jira_task_mappings` 조회
  - ScheduleEntry.stageId로 매칭
  - 매칭 성공: Task ID 획득 (업데이트)
  - 매칭 실패: 신규 생성
  - 헤즈업 Task: stageId = "HEADSUP" (고정값)
  - 참조: [prd/Azrael-PRD-Phase1.md §2.2](./prd/Azrael-PRD-Phase1.md)

- [x] **확인 다이얼로그 표시**
  - 변경사항 표시:
    - 업데이트: N개 Task
    - 신규 생성: M개 Task
  - 사용자 확인 대기

#### 15.2. [업데이트] 확인
- [x] **Edge Function 호출**
  - `POST /functions/v1/jira-update`
  - 요청 데이터: Epic 날짜, Task 업데이트/생성 목록

- [x] **성공 처리**
  - Supabase `jira_task_mappings` 업데이트 (새 Task 추가)
  - 성공 메시지: "JIRA 일감이 업데이트되었습니다"

- [x] **실패 처리**
  - 에러 메시지 표시

---

### 16. 에러 처리

#### 16.1. JIRA 설정 없음
- [x] **에러 메시지 구현**
  - "JIRA 연동 설정이 필요합니다"
  - 안내 메시지 포함

#### 16.2. 프로젝트 키 없음
- [x] **에러 메시지 구현**
  - "JIRA 프로젝트 키 설정이 필요합니다"
  - 안내 메시지 포함

#### 16.3. Epic 중복
- [x] **에러 메시지 구현**
  - "이미 생성된 Epic이 있습니다. [JIRA 업데이트]를 사용하세요."

#### 16.4. Epic 수동 삭제됨
- [ ] **에러 처리 구현**
  - JIRA API 조회 실패 (404)
  - "Epic을 찾을 수 없습니다 ({epicKey}). JIRA에서 삭제되었을 수 있습니다."
  - [매핑 삭제] 버튼 → Supabase jira_epic_mappings 레코드 삭제
  - 참조: [prd/Azrael-PRD-Phase1.md §10.5](./prd/Azrael-PRD-Phase1.md)

#### 16.5. 템플릿 검증 오류
- [ ] **실시간 검증 구현**
  - 설정 저장 시 유효하지 않은 변수 감지
  - 빨간 밑줄 표시
  - "유효하지 않은 변수: {unknownVar}" 에러
  - 저장 불가

#### 16.6. Edge Function 타임아웃 (VR2-3)
- [ ] **타임아웃 에러 처리**
  - 50초 초과 시: "시간 초과로 일감 생성 상태를 확인할 수 없습니다. JIRA에서 직접 확인해주세요."
  - 가능한 Epic Key 표시 (부분 생성 가능성)
  - 참조: [prd/Azrael-PRD-Phase1.md §10.6](./prd/Azrael-PRD-Phase1.md)

#### 16.7. JIRA API Rate Limit (429)
- [ ] **Rate Limit 에러 처리**
  - "JIRA 요청 한도 초과. 잠시 후 다시 시도하세요." 에러
  - 참조: [prd/Azrael-PRD-Phase1.md §8.4](./prd/Azrael-PRD-Phase1.md)

---

### 17. 테스트

#### 17.1. 단위 테스트
- [ ] **템플릿 변수 치환 테스트**
  - 모든 변수 치환 검증
  - 빈 변수 처리 검증

- [ ] **템플릿 검증 테스트**
  - 유효한 변수 검증
  - 유효하지 않은 변수 감지

#### 17.2. 통합 테스트 (Supabase)
- [ ] **Epic 생성 테스트**
  - jira_epic_mappings INSERT 검증
  - UNIQUE 제약 검증 (중복 방지)

- [ ] **Task 매칭 테스트**
  - stageId 기반 매칭 검증
  - 헤즈업 Task (stageId = "HEADSUP") 검증

#### 17.3. Edge Functions 테스트
- [ ] **jira-create 로컬 테스트**
  - Epic 생성 검증
  - Tasks 생성 검증 (헤즈업 → Ext. → Int.)
  - Subtasks 생성 검증
  - 롤백 로직 검증

- [ ] **jira-update 로컬 테스트**
  - Epic 날짜 업데이트 검증
  - Task 업데이트 검증
  - 신규 Task 생성 검증

#### 17.4. E2E 테스트 (수동)
- [ ] **JIRA 생성 E2E**
  - [계산] → [JIRA 생성] → 미리보기 → 생성 → JIRA 확인

- [ ] **JIRA 업데이트 E2E**
  - 일정 재계산 → [JIRA 업데이트] → 미리보기 → 업데이트 → JIRA 확인

- [ ] **템플릿 커스터마이징 E2E**
  - 설정 → 업무 단계 편집 → JIRA Summary 템플릿 수정 → 저장 → JIRA 생성 → Summary 확인

---

## 📊 완료 체크리스트

### Phase 0.5 완료 기준
- [x] **모든 Supabase 스키마 변경 완료** (work_stages order, jira_summary_template, projects JIRA 컬럼)
- [x] **테이블 2/3 "JIRA 담당자" 컬럼 표시 및 편집 가능**
- [x] **설정 → 업무 단계 편집 모달에 "하위 일감 템플릿" 아코디언 구현**
- [x] **하위 일감 추가/편집/삭제 기능 정상 동작**
- [x] **프로젝트 편집 모달에 JIRA 프로젝트 키, Epic/헤즈업 템플릿 필드 추가**
- [x] **모든 타입 체크 통과** (`npm run typecheck`)
- [ ] **통합 테스트 성공** (Supabase 배포 후)

### Phase 1 완료 기준
- [x] **Supabase jira_epic_mappings, jira_task_mappings 테이블 생성 및 RLS 설정** ✅ 배포 완료
- [x] **설정 → JIRA 연동 설정 탭 구현 및 연동 테스트 기능** ✅ 구현 완료
- [x] **메인 화면 [JIRA 생성] / [JIRA 업데이트] 버튼 추가** ✅ 구현 완료
- [x] **JIRA Summary 템플릿 시스템 구현 (변수 치환 엔진)** ✅ 구현 완료
- [x] **JIRA 미리보기 모달 구현** ✅ 구현 완료
- [x] **Supabase Edge Functions (jira-create, jira-update) 배포** ✅ 배포 완료
- [x] **JIRA 일감 생성 플로우 완성** ✅ 구현 완료 (Epic 중복 체크, Edge Function 호출, Supabase 저장)
- [x] **JIRA 일감 업데이트 플로우 구현** ✅ 구현 완료 (Task 매칭, Edge Function 호출)
- [ ] **Edge Functions 환경 변수 설정** 🔴 사용자 수동 작업 필요 (2분)
- [ ] **E2E 테스트** (환경 변수 설정 후)
- [ ] **고급 에러 처리** (Epic 수동 삭제, 타임아웃 - 선택적, Phase 1.5+)

---

## 🎯 Next Steps (Phase 2+)

Phase 1 완료 및 사용자 피드백 수집 후:

1. **Phase 2: 이메일 생성** 상세 설계
   - 현재 이메일 작성 패턴 분석
   - 템플릿 설계
   - 참조: [prd/Azrael-PRD-Phase2.md](./prd/Azrael-PRD-Phase2.md)

2. **Phase 3: 슬랙 연동** 상세 설계
   - 슬랙 사용 패턴 분석
   - Slack App 설계
   - 참조: [prd/Azrael-PRD-Phase3.md](./prd/Azrael-PRD-Phase3.md)

---

**문서 종료**

**개발 서버**: http://localhost:3000
**Supabase 프로젝트**: vgoqkyqqkieogrtnmsva
**JIRA URL**: https://wemade.atlassian.net

**다음 단계**: Phase 0.5 개발 시작
