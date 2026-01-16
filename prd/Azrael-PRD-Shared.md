# Azrael PRD - Shared Components

**작성일**: 2026-01-09
**최종 업데이트**: 2026-01-14
**버전**: 2.0
**참조**: [Azrael-PRD-Master.md](./Azrael-PRD-Master.md)

---

## 📋 문서 목적

이 문서는 Azrael 프로젝트의 **공통 요소**를 정의합니다:
- 용어집 (Glossary)
- 공통 데이터 구조
- 공통 계산 로직
- 기술 스택 상세
- 비기능 요구사항

모든 Phase 문서가 이 문서를 참조합니다.

---

## 1. 용어집 (Glossary)

### 1.1. 프로젝트 관련 용어

| 용어 | 정의 | 비고 |
|------|------|------|
| **프로젝트** | 회사에서 서비스 중인 게임 또는 업무 단위 | M4/GL, NC/GL, FB/GL, FB/JP, LY/GL, 월말정산 |
| **프로젝트 타입** | NC/GL(1주/2주), FB(CDN/APP) 등 프로젝트별 세부 설정 | 타입별 독립 프로젝트로 관리 |

### 1.2. 일정 계산 용어

| 용어 | 정의 | 비고 |
|------|------|------|
| **영업일** | 주말(토, 일), 공휴일을 제외한 근무일 | 주말 = 토요일 + 일요일 |
| **업데이트일** | 게임 업데이트 배포 예정 날짜 (D-day) | 사용자 입력 |
| **Offset** | 업데이트일 기준 역산할 영업일 수 | 양수(과거), 음수(미래) 모두 가능 |
| **마감** | **L10n팀 작업 시작일시** (선행 작업 부서가 자료를 넘기는 시점) | ⚠️ "마감"=시작일시 (startDateTime) |
| **테이블 전달** | **L10n팀 작업 종료일시** (결과물을 제출하는 시점) | ⚠️ "테이블전달"=종료일시 (endDateTime) |
| **HO** | Hands-Off (시작일시) | Ext./Int. 테이블 사용 |
| **HB** | Hands-Back (종료일시) | Ext./Int. 테이블 사용 |

### 1.3. 상단 날짜

| 용어 | 정의 | 계산 방식 |
|------|------|-----------|
| **헤즈업** | 유관부서 및 협력업체에 일정을 사전 공유하는 날짜 | 프로젝트별 Offset 설정 (업데이트일 - N영업일) |
| **iOS 심사일** | iOS 앱스토어 심사 제출 예정일 | 프로젝트별 Offset 설정 (업데이트일 - M영업일) |

### 1.4. 테이블 용어

| 용어 | 정의 | 비고 |
|------|------|------|
| **배치** | 업무 이름 (예: 정기, 1차, 2차, REGULAR, EXTRA0...) | 설정에서 정의 |
| **#** | 인덱스 (1부터 순차 번호, 자동 재정렬) | 삭제 시 자동 재정렬, 추가 시 현재 다음 위치 |
| **설명** | 사용자 입력 텍스트 필드 | 편집 가능 |
| **담당자** | 사용자 입력 텍스트 필드 | 편집 가능 |
| **JIRA 설명** | JIRA 일감 생성 시 설명 필드에 포함될 내용 | 편집 가능 |
| **Disclaimer** | 테이블 하단 메모 (프로젝트별 저장, 최대 6줄 또는 600자) | Bold/Italic/색상(빨강,파랑,검정) |

### 1.5. 하위 일감 용어

| 용어 | 정의 | 비고 |
|------|------|------|
| **하위 일감** | 부모 업무 아래의 세부 업무 (최대 2단계, 부모당 최대 9개) | 계층적 번호 (1, 1.1, 1.2...) |
| **+ 버튼** | 같은 depth 엔트리 추가 버튼 | 현재 엔트리 다음에 삽입 |
| **↓ 버튼** | 하위(subtask) 엔트리 추가 버튼 | JIRA 생성 시 subtask 관계 |
| **✕ 버튼** | 엔트리 삭제 버튼 | CASCADE 삭제 |

---

## 2. 공통 데이터 구조

### 2.1. Project (프로젝트)

```typescript
interface Project {
  id: string;                    // 고유 ID (예: "M4_GL", "NC_GL_1week")
  name: string;                  // 표시 이름 (예: "M4/GL", "NC/GL (1주)")
  headsUpOffset: number;         // 헤즈업 Offset (영업일)
  iosReviewOffset?: number;      // iOS 심사일 Offset (영업일, 선택적)
  showIosReviewDate: boolean;    // iOS 심사일 표시 여부
  templateId: string;            // 업무 단계 템플릿 ID
  disclaimer: string;            // 테이블 하단 Disclaimer 메모 (최대 600자, HTML)
  jiraProjectKey?: string;       // JIRA 프로젝트 키 (Phase 1, 예: "M4L10N")
  jiraEpicTemplate?: string;     // JIRA Epic Summary 템플릿 (Phase 0.5)
  jiraHeadsupTemplate?: string;  // JIRA 헤즈업 Task Summary 템플릿 (Phase 0.5)
}
```

**Supabase 테이블**: `projects`
- 추가 필드: `created_at`, `updated_at`, `created_by`
- Phase 0.5 추가: `jira_epic_template`, `jira_headsup_template`
- Phase 1 추가: `jira_project_key`
- 제약조건: `template_id` → `work_templates.id` (외래키)

### 2.2. WorkTemplate (업무 단계 템플릿)

```typescript
interface WorkTemplate {
  id: string;                    // 템플릿 ID (프로젝트별)
  projectId: string;             // 연결된 프로젝트 ID
  stages: WorkStage[];           // 업무 단계 배열
}

interface WorkStage {
  id: string;                    // 업무 단계 ID
  name: string;                  // 배치 이름 (예: "정기", "REGULAR", "번역")
  startOffsetDays: number;       // 마감(시작일시) 역산 영업일
  endOffsetDays: number;         // 테이블 전달(종료일시) 역산 영업일
  startTime: string;             // 기본 시작 시각 (HH:MM, 24시간제)
  endTime: string;               // 기본 종료 시각 (HH:MM, 24시간제)
  tableTargets: ('table1'|'table2'|'table3')[]; // 표시할 테이블 목록
  order: number;                 // 표시 순서 (DECIMAL 5,1: 1.0, 1.1, 1.2...)
  parentStageId?: string;        // 하위 일감의 경우 부모 Stage ID
  depth: number;                 // 0=부모, 1=자식 (최대 1)
  jiraSummaryTemplate?: string;  // JIRA Summary 템플릿 (Phase 0.5, 예: "{date} 업데이트 {taskName}")
}
```

**Supabase 테이블**:
- `work_templates`: 템플릿 메타데이터
- `work_stages`: 업무 단계 상세 정보
- 제약조건:
  - `work_templates.project_id` → `projects.id` (외래키, CASCADE DELETE)
  - `work_stages.template_id` → `work_templates.id` (외래키, CASCADE DELETE)
  - `work_stages.parent_stage_id` → `work_stages.id` (자기 참조, CASCADE DELETE)
  - `work_stages.depth` CHECK: IN (0, 1)
  - `work_stages.order`: DECIMAL(5,1) - 부모 (1.0, 2.0), 하위 (1.1~1.9, 최대 9개)

### 2.3. ScheduleEntry (일정 엔트리)

```typescript
interface ScheduleEntry {
  id: string;                    // 엔트리 ID
  index: number;                 // 인덱스 (자동 계산)
  stageId: string;               // WorkStage ID
  stageName: string;             // 배치 이름
  startDateTime: Date;           // 계산된 시작일시
  endDateTime: Date;             // 계산된 종료일시
  description: string;           // 모든 테이블 공통 - "설명" 컬럼
  assignee?: string;             // 테이블 1 전용 - "담당자" 컬럼
  jiraDescription?: string;      // 테이블 2/3 전용 - "JIRA 설명" 컬럼
  jiraAssignee?: string;         // 테이블 2/3 전용 - "JIRA 담당자" (Phase 0.5, Account ID)
  parentId?: string;             // 부모 엔트리 ID (하위 일감)
  children?: ScheduleEntry[];    // 하위 일감 배열
  isManualEdit: boolean;         // 수동 편집 여부
}
```

**저장 위치**: LocalStorage (개인 데이터)
- `azrael:calculation:{projectId}`에 CalculationResult의 일부로 저장

### 2.4. CalculationResult (계산 결과)

```typescript
interface CalculationResult {
  projectId: string;             // 프로젝트 ID
  updateDate: Date;              // 업데이트일
  headsUpDate: Date;             // 계산된 헤즈업 날짜
  iosReviewDate?: Date;          // 계산된 iOS 심사일
  table1Entries: ScheduleEntry[]; // 테이블 1 엔트리
  table2Entries: ScheduleEntry[]; // 테이블 2 (Ext.) 엔트리
  table3Entries: ScheduleEntry[]; // 테이블 3 (Int.) 엔트리
  calculatedAt: Date;            // 계산 시각
}
```

**저장 위치**: LocalStorage (개인 데이터)
- 키: `azrael:calculation:{projectId}`
- 최신 계산 결과만 유지

### 2.5. Holiday (공휴일)

```typescript
interface Holiday {
  date: Date;                    // 공휴일 날짜
  name: string;                  // 공휴일 이름 (예: "신정", "설날")
  isManual: boolean;             // 수동 추가 여부 (API vs 수동)
}
```

**Supabase 테이블**: `holidays`
- 추가 필드: `id` (UUID), `created_at`, `created_by`
- 제약조건: `date` UNIQUE

### 2.6. UserState (사용자 상태)

```typescript
interface UserState {
  email: string;                 // 사용자 이메일
  lastProjectId: string;         // 마지막 사용 프로젝트 ID
  hasCompletedOnboarding: boolean; // 온보딩 완료 여부
}
```

**저장 위치**: LocalStorage (개인 데이터)
- 키: `azrael:userState`

---

## 3. 데이터 저장 아키텍처

### 3.1. 하이브리드 스토리지 (Supabase + LocalStorage)

**Supabase (팀 공유 데이터)**:
- Projects: 프로젝트 설정
- WorkTemplates: 업무 단계 템플릿
- WorkStages: 업무 단계 상세
- Holidays: 공휴일 목록

**LocalStorage (개인 데이터)**:
- CalculationResult: 계산 결과 (최신만)
- UserState: 사용자 상태 (온보딩, 마지막 프로젝트)

### 3.2. Supabase 스키마

```sql
-- Projects
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  heads_up_offset INTEGER NOT NULL,
  ios_review_offset INTEGER,
  show_ios_review_date BOOLEAN NOT NULL DEFAULT false,
  template_id TEXT NOT NULL,
  disclaimer TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL
);

-- Work Templates
CREATE TABLE work_templates (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Work Stages
CREATE TABLE work_stages (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_offset_days INTEGER NOT NULL,
  end_offset_days INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  "order" DECIMAL(5,1) NOT NULL,
  parent_stage_id TEXT,
  depth INTEGER NOT NULL DEFAULT 0,
  table_targets TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (template_id) REFERENCES work_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_stage_id) REFERENCES work_stages(id) ON DELETE CASCADE,
  CHECK (depth IN (0, 1))
);

-- Holidays
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);
```

### 3.3. RLS (Row Level Security) 정책

**읽기 권한**: 모든 인증된 사용자
```sql
CREATE POLICY "Anyone can read {table}"
  ON {table} FOR SELECT
  USING (auth.role() = 'authenticated');
```

**쓰기 권한**: 화이트리스트 사용자만 (L10n팀 5명)
```sql
CREATE POLICY "Whitelisted users can modify {table}"
  ON {table} FOR {INSERT|UPDATE|DELETE}
  USING (auth.email() IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com'
  ));
```

### 3.4. LocalStorage 스키마

```
azrael:calculation:{projectId} → CalculationResult
azrael:userState              → UserState
```

**Date 직렬화 처리**:
```typescript
// 저장: JSON.stringify() - Date → ISO 8601 문자열
localStorage.setItem('key', JSON.stringify(data));

// 로드: JSON.parse() 후 Date 필드 수동 복원
const data = JSON.parse(localStorage.getItem('key'));
data.updateDate = new Date(data.updateDate);
data.headsUpDate = new Date(data.headsUpDate);
// ... 모든 Date 필드 복원
```

---

## 4. 공통 계산 로직

### 4.1. 영업일 역산 함수

```typescript
/**
 * 업데이트일 기준 N 영업일 역산
 * @param updateDate - 업데이트일 (D-day)
 * @param offsetDays - 역산할 영업일 (양수=과거, 음수=미래)
 * @param holidays - 공휴일 배열
 * @returns 계산된 날짜
 */
function calculateBusinessDate(
  updateDate: Date,
  offsetDays: number,
  holidays: Date[]
): Date {
  let currentDate = new Date(updateDate);
  let remainingDays = Math.abs(offsetDays);
  const direction = offsetDays >= 0 ? -1 : 1; // 양수면 과거(-), 음수면 미래(+)

  while (remainingDays > 0) {
    currentDate.setDate(currentDate.getDate() + direction);

    // 주말 체크 (토요일=6, 일요일=0)
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue; // 주말은 영업일에서 제외
    }

    // 공휴일 체크
    const isHoliday = holidays.some(holiday =>
      holiday.getFullYear() === currentDate.getFullYear() &&
      holiday.getMonth() === currentDate.getMonth() &&
      holiday.getDate() === currentDate.getDate()
    );
    if (isHoliday) {
      continue; // 공휴일은 영업일에서 제외
    }

    // 영업일 카운트
    remainingDays--;
  }

  return currentDate;
}
```

### 4.2. 시작/종료일시 계산

```typescript
/**
 * WorkStage로부터 시작/종료일시 계산
 */
function calculateDateTimeFromStage(
  updateDate: Date,
  stage: WorkStage,
  holidays: Date[]
): { startDateTime: Date, endDateTime: Date } {
  // 시작일 계산
  const startDate = calculateBusinessDate(
    updateDate,
    stage.startOffsetDays,
    holidays
  );
  const [startHour, startMin] = stage.startTime.split(':').map(Number);
  const startDateTime = new Date(startDate);
  startDateTime.setHours(startHour, startMin, 0, 0);

  // 종료일 계산
  const endDate = calculateBusinessDate(
    updateDate,
    stage.endOffsetDays,
    holidays
  );
  const [endHour, endMin] = stage.endTime.split(':').map(Number);
  const endDateTime = new Date(endDate);
  endDateTime.setHours(endHour, endMin, 0, 0);

  return { startDateTime, endDateTime };
}
```

### 4.3. 날짜 형식 변환 함수

```typescript
/**
 * Date → 테이블 출력 형식 변환
 * @returns "MM/DD(요일) HH:MM" 형식
 * @example "01/28(화) 09:00"
 */
function formatTableDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = weekdays[date.getDay()];
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');

  return `${mm}/${dd}(${dayOfWeek}) ${hh}:${min}`;
}

/**
 * Date → 업데이트일 입력 형식 변환
 * @returns "YYYY-MM-DD (요일)" 형식
 * @example "2026-02-10 (월)"
 */
function formatUpdateDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = weekdays[date.getDay()];

  return `${yyyy}-${mm}-${dd} (${dayOfWeek})`;
}
```

---

## 5. 기술 스택 상세

### 5.1. 프론트엔드

| 기술 | 용도 | 버전 |
|------|------|------|
| React | UI 프레임워크 | 18.3.1 |
| TypeScript | 타입 안전성 | 5.6.3 |
| Vite | 빌드 도구 | 5.4.11 |
| CSS3 | 스타일링 | - |

### 5.2. 백엔드 & 데이터베이스

| 기술 | 용도 | 버전 |
|------|------|------|
| Supabase | PostgreSQL 데이터베이스, 인증 | - |
| @supabase/supabase-js | Supabase 클라이언트 | 2.90.1 |
| @tanstack/react-query | 서버 상태 관리, 캐싱 | 5.90.16 |

### 5.3. 주요 라이브러리

| 라이브러리 | 용도 | 버전 | 라이선스 |
|-----------|------|------|----------|
| **Frappe Gantt** | 간트 차트 | 0.6.1+ | MIT |
| **FullCalendar** | 캘린더 | 6.1.20+ | MIT |
| **html2canvas** | 이미지 복사 | 1.4.1+ | MIT |
| **@react-oauth/google** | Google OAuth | 0.13.4 | MIT |

**선정 이유**:
- **Frappe Gantt**: Zero dependencies, 의존성 화살표 지원
- **FullCalendar**: React 통합 우수, 안정적 API, 커뮤니티 활발
- **html2canvas**: 가장 안정적인 HTML→PNG 변환 라이브러리
- **@react-oauth/google**: 공식 React Google OAuth 라이브러리

### 5.4. 인증 및 저장

| 기술 | 용도 |
|------|------|
| Google OAuth 2.0 | 소셜 로그인 |
| Supabase Auth | 세션 관리, RLS 정책 적용 |
| LocalStorage | 개인 데이터 저장 (CalculationResult, UserState) |

### 5.5. 외부 API

| API | 용도 | 제공자 |
|-----|------|--------|
| 공공데이터포털 - 특일정보 API | 공휴일 데이터 | 한국천문연구원 |
| Google Identity Services | Google OAuth 인증 | Google |

**공휴일 API 상세**:
- 엔드포인트: `/B090041/openapi/service/SpcdeInfoService/getRestDeInfo`
- 파라미터: `solYear=2026&ServiceKey=[키]`
- 응답 형식: XML
- 호출 시점: 사용자가 "공휴일 불러오기" 버튼 클릭

---

## 6. API 레이어 (React Query 훅)

### 6.1. Projects API

```typescript
// useProjects() - 전체 프로젝트 목록 조회
// useCreateProject() - 프로젝트 생성
// useUpdateProject() - 프로젝트 수정
// useDeleteProject() - 프로젝트 삭제
```

### 6.2. Templates API

```typescript
// useTemplates() - 전체 템플릿 목록 조회
// useTemplateByProjectId() - 특정 프로젝트의 템플릿 조회
// useCreateTemplate() - 템플릿 생성
// useSaveTemplate() - 템플릿 저장 (stages 포함, 전체 교체)
// useDeleteTemplate() - 템플릿 삭제
```

### 6.3. Holidays API

```typescript
// useHolidays() - 전체 공휴일 목록 조회
// useCreateHoliday() - 단일 공휴일 추가
// useCreateHolidays() - 여러 공휴일 추가 (배치)
// useDeleteHoliday() - 공휴일 삭제
// useSyncApiHolidays() - 공공 API에서 공휴일 동기화
```

### 6.4. React Query 설정

**캐싱 전략**:
- `staleTime`: 5분 (데이터가 신선하다고 간주하는 시간)
- `refetchOnWindowFocus`: true (창 포커스 시 자동 리프레시)
- 낙관적 업데이트 적용 (mutation 시 즉시 UI 업데이트)

---

## 7. 비기능 요구사항

### 7.1. 브라우저 호환성

**지원 브라우저**:
- Chrome: 최신 2개 버전
- Edge: 최신 2개 버전
- Firefox: 최신 2개 버전
- Safari: 최신 2개 버전

**미지원**:
- Internet Explorer (모든 버전)
- 모바일 브라우저

### 7.2. 반응형 디자인

**지원**: PC 전용 (1280x720 이상 해상도)
**미지원**: 모바일, 태블릿

### 7.3. 성능

**목표**: 성능 최적화 불필요 (5인 사용, 소량 데이터)
**예상**:
- 일정 계산: < 1초
- 테이블 렌더링: < 500ms
- 간트/캘린더 렌더링: < 1초

### 7.4. 접근성

**목표**: 접근성 고려 안 함 (내부 5인만 사용)
**구현**: 기본적인 키보드 네비게이션만 제공

### 7.5. 보안

**인증**: Google OAuth + Supabase Auth
**접근 제어**: RLS 정책 (읽기: 전체, 쓰기: 화이트리스트 5명)
**데이터 보호**: Supabase (팀 공유), LocalStorage (개인)
**API 키 관리**: .env 파일 (코드에 하드코딩 금지)

### 7.6. 데이터 동기화

**Supabase 데이터** (공유):
- 실시간 동기화: React Query 자동 리프레시
- 충돌 해결: Last Write Wins

**LocalStorage 데이터** (개인):
- 브라우저별 독립 저장소
- 동기화 없음 (개인 작업 공간)

---

## 8. 에러 처리

### 8.1. Supabase 연결 실패

- **대응**: "데이터베이스 연결에 실패했습니다. 네트워크를 확인해주세요." 메시지 표시
- **fallback**: 이전 캐시된 데이터 사용 (React Query)

### 8.2. 공휴일 API 호출 실패

- **대응**: "API 호출에 실패했습니다. 네트워크를 확인하거나 수동으로 공휴일을 추가해주세요." 메시지 표시
- **fallback**: Supabase의 캐시된 공휴일 사용

### 8.3. 화이트리스트 외 사용자 접근

- **대응**: "접근 권한이 없습니다. 관리자에게 문의하세요." 메시지 표시
- **리다이렉트**: 로그인 화면으로 돌아가기

### 8.4. 프로젝트 삭제 시 데이터 정리

**CASCADE 삭제**:
1. `projects` 삭제 → `work_templates` 자동 삭제
2. `work_templates` 삭제 → `work_stages` 자동 삭제
3. `work_stages` (부모) 삭제 → 하위 `work_stages` 자동 삭제

**LocalStorage 정리**:
- `azrael:calculation:{projectId}` 키 삭제
- `azrael:userState.lastProjectId` 업데이트 (다른 프로젝트로 변경)

---

## 9. 초기 데이터

### 9.1. 기본 프로젝트 목록 (9개)

CSV 임포트를 통해 Supabase에 저장됨:
1. M4/GL
2. NC/GL (1주)
3. NC/GL (2주)
4. FB/GL (CDN)
5. FB/GL (APP)
6. FB/JP (CDN)
7. FB/JP (APP)
8. LY/GL
9. 월말정산

### 9.2. 업무 단계 템플릿

각 프로젝트별로 CSV 임포트를 통해 Supabase에 저장됨 (총 48개 업무 단계).

### 9.3. 공휴일 데이터

2025-2026년 한국 공휴일 23개가 Supabase에 저장됨.

---

## 10. 참조 문서

- **Master**: [Azrael-PRD-Master.md](./Azrael-PRD-Master.md)
- **Phase 0**: [Azrael-PRD-Phase0.md](./Azrael-PRD-Phase0.md)
- **Phase 1**: [Azrael-PRD-Phase1.md](./Azrael-PRD-Phase1.md)
- **Phase 2**: [Azrael-PRD-Phase2.md](./Azrael-PRD-Phase2.md)
- **Phase 3**: [Azrael-PRD-Phase3.md](./Azrael-PRD-Phase3.md)

---

**문서 종료**
