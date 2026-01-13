# Azrael PRD - Shared Components

**작성일**: 2026-01-09
**최종 업데이트**: 2026-01-13
**버전**: 1.1
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
| **프로젝트 타입** | NC/GL(1주/2주), FB(CDN/APP) 등 프로젝트별 세부 설정 | 조건부 UI로 선택 |

### 1.2. 일정 계산 용어

| 용어 | 정의 | 비고 |
|------|------|------|
| **영업일** | 주말(토, 일), 공휴일을 제외한 근무일 | 주말 = 토요일 + 일요일 |
| **업데이트일** | 게임 업데이트 배포 예정 날짜 (D-day) | 사용자 입력 |
| **Offset** | 업데이트일 기준 역산할 영업일 수 | 양수(과거), 음수(미래) 모두 가능 |
| **마감** | **L10n팀 작업 시작일시** (선행 작업 부서가 자료를 넘기는 시점) | ⚠️ LLM 주의: "마감"=시작일시 |
| **테이블 전달** | **L10n팀 작업 종료일시** (결과물을 제출하는 시점) | ⚠️ LLM 주의: "테이블전달"=종료일시 |
| **HO** | Hands-Off (시작일시) | Ext./Int. 테이블 사용, "마감"과 동일 개념 |
| **HB** | Hands-Back (종료일시) | Ext./Int. 테이블 사용, "테이블 전달"과 동일 개념 |

**⚠️ 중요: "마감" 용어에 대한 LLM 구현 시 주의사항**:

**배경**: 이 용어는 기존 엑셀 시트에서 사용하던 용어를 그대로 유지한 것입니다.

**핵심 개념**:
- 테이블 1은 **선행 작업 부서(개발사) 관점**의 일정표입니다.
- **"마감" = 선행 작업 부서가 작업을 완료하여 L10n팀에 자료를 넘기는 시점**
- **이것이 곧 L10n팀의 작업 시작 시점**이므로, **데이터 타입은 `startDateTime`**입니다.
- **"테이블 전달" = L10n팀이 작업을 완료하여 결과물을 제출하는 시점**
- **이것이 곧 L10n팀의 작업 종료 시점**이므로, **데이터 타입은 `endDateTime`**입니다.

**LLM 구현 시 절대 실수하지 말 것**:
- ❌ 잘못된 해석: "마감" → `endDateTime` (종료)
- ✅ 올바른 해석: "마감" → `startDateTime` (시작)
- ❌ 잘못된 해석: "테이블 전달" → `startDateTime` (시작)
- ✅ 올바른 해석: "테이블 전달" → `endDateTime` (종료)

**매핑 확인**:
```typescript
// 테이블 1 렌더링 시
컬럼["마감"] = entry.startDateTime.format("MM/DD(요일) HH:MM")
컬럼["테이블 전달"] = entry.endDateTime.format("MM/DD(요일) HH:MM")
```

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
| **하위 일감** | 부모 업무 아래의 세부 업무 (최대 2단계, 부모당 최대 20개) | 계층적 번호 (1, 1.1, 1.2...) |
| **▼/▲ 버튼** | 하위 일감 펼치기/접기 버튼 | 테이블 헤더 오른쪽 |
| **+ 버튼** | 같은 depth 엔트리 추가 버튼 | 현재 엔트리 다음에 삽입 |
| **↓ 버튼** | 하위(subtask) 엔트리 추가 버튼 | JIRA 생성 시 subtask 관계 |

### 1.6. 계층적 인덱싱 규칙 (LLM 구현 시 정확히 따를 것)

**최대 깊이**: 2단계 (부모-자식)
- ✅ 허용: `1`, `1.1`, `1.2`, `2`, `2.1`, `2.2`
- ❌ 금지: `1.1.1` (3단계 이상)

**삭제 시 자동 재정렬**:
- 구조 `1`, `1.1`, `1.2`, `2`에서 `1.1` 삭제 → `1.2`가 `1.1`로 변경
- 모든 하위 번호 자동 재정렬

**추가 시 삽입 위치 및 번호**:
- **+ 버튼**: 현재 엔트리 바로 다음에 같은 레벨 추가
  - 예: `1.2` 옆 + 클릭 → `1.3` 생성 (기존 `1.3` 이후는 `1.4`, `1.5`...로 밀림)
- **↓ 버튼**: 현재 엔트리의 하위로 추가
  - 예: `1` 옆 ↓ 클릭 → `1.1` 생성 (기존 `1.1` 이후는 `1.2`, `1.3`...로 밀림)

**최대 개수 제한**:
- 부모당 하위 일감 최대 20개
- 초과 시: "하위 일감은 최대 20개까지 추가할 수 있습니다" 에러 표시

---

## 2. 공통 데이터 구조

### 2.1. Project (프로젝트)

```typescript
interface Project {
  id: string;                    // 고유 ID
                                 // 생성 규칙: {게임코드}_{지역}_{타입?}
                                 // 예: "M4_GL", "NC_GL_1week", "FB_GL_CDN"
  name: string;                  // 표시 이름 (예: "M4/GL", "NC/GL (1주)")
  headsUpOffset: number;         // 헤즈업 Offset (영업일)
  iosReviewOffset?: number;      // iOS 심사일 Offset (영업일, 선택적)
  showIosReviewDate: boolean;    // iOS 심사일 표시 여부
  templateId: string;            // 업무 단계 템플릿 ID
  disclaimer: string;            // 테이블 하단 Disclaimer 메모 (최대 6줄/600자, HTML)
  // Round10 Q1: isDeletable 제거 (동적 계산 필드, 저장 안 함)
}

/**
 * Round10 Q1-Q2: 프로젝트-템플릿 참조 무결성 규칙 (LLM 구현 필수)
 *
 * 1. 프로젝트당 정확히 1개의 WorkTemplate (1:1 매핑)
 * 2. 프로젝트 삭제 시: templates.filter(t => t.projectId !== deletedId)
 * 3. 프로젝트 추가 시: 빈 템플릿 생성 { id, projectId, stages: [] }
 * 4. isDeletable 필드는 런타임 계산만 (LocalStorage 저장 안 함)
 *    - 계산 규칙: projects.length > 1
 *    - 마지막 프로젝트는 삭제 불가
 */
```

### 2.2. WorkTemplate (업무 단계 템플릿)

```typescript
interface WorkTemplate {
  id: string;                    // 템플릿 ID (프로젝트별)
  projectId: string;             // 연결된 프로젝트 ID
  stages: WorkStage[];           // 업무 단계 배열
}

interface WorkStage {
  id: string;                    // 업무 단계 ID
  name: string;                  // 배치 이름 (예: "정기", "REGULAR", "번역", "검수")
  startOffsetDays: number;       // 마감(시작일시) 역산 영업일 (업데이트일 기준)
  endOffsetDays: number;         // 테이블 전달(종료일시) 역산 영업일 (업데이트일 기준)
  startTime: string;             // 기본 시작 시각 (HH:MM, 24시간제)
  endTime: string;               // 기본 종료 시각 (HH:MM, 24시간제)
  tableTargets: ('table1'|'table2'|'table3')[]; // 표시할 테이블 목록
  order: number;                 // 표시 순서
  parentStageId?: string;        // Q4: 하위 일감의 경우 부모 Stage ID
  depth: number;                 // Q4: 0=부모, 1=자식 (최대 1)
}

/**
 * Phase 0 최종 구현 변경사항 (2026-01-13):
 * 1. offsetDays → startOffsetDays, endOffsetDays 분리
 *    - startOffsetDays: 마감(startDateTime) 계산용
 *    - endOffsetDays: 테이블 전달(endDateTime) 계산용
 * 2. tableTargets 필드 추가: 각 WorkStage가 어느 테이블에 표시될지 지정
 *    - 예: ["table1", "table2"] → 테이블 1과 2에만 표시
 *    - 빈 배열: 어디에도 표시 안 함
 */
```

### 2.3. ScheduleEntry (일정 엔트리)

```typescript
interface ScheduleEntry {
  id: string;                    // 엔트리 ID
  index: number;                 // 인덱스 (자동 계산)
  stageId: string;               // WorkStage ID
  stageName: string;             // 배치 이름
  startDateTime: Date;           // 계산된 시작일시
  endDateTime: Date;             // 계산된 종료일시
  description: string;           // Q1: 모든 테이블 공통 - "설명" 컬럼 (편집 가능)
  assignee?: string;             // Q1: 테이블 1 전용 - "담당자" 컬럼 (편집 가능)
  jiraDescription?: string;      // Q1: 테이블 2/3 전용 - "JIRA 설명" 컬럼 (편집 가능)
  parentId?: string;             // 부모 엔트리 ID (하위 일감)
  children?: ScheduleEntry[];    // 하위 일감 배열
  isManualEdit: boolean;         // 수동 편집 여부 (Phase 0에서는 false)
}

// Q1: 렌더링 규칙 (LLM 구현 시 정확히 따를 것)
// - 테이블 1: description, assignee 표시
// - 테이블 2/3: description, jiraDescription 표시
```

### 2.4. CalculationResult (계산 결과)

```typescript
interface CalculationResult {
  projectId: string;             // 프로젝트 ID (타입 정보 포함)
  updateDate: Date;              // 업데이트일
  headsUpDate: Date;             // 계산된 헤즈업 날짜
  iosReviewDate?: Date;          // 계산된 iOS 심사일
  table1Entries: ScheduleEntry[]; // 테이블 1 엔트리
  table2Entries: ScheduleEntry[]; // 테이블 2 (Ext.) 엔트리
  table3Entries: ScheduleEntry[]; // 테이블 3 (Int.) 엔트리
  calculatedAt: Date;            // 계산 시각
}
// Q1: projectType 제거 (타입별 독립 프로젝트 정책)
```

### 2.5. Holiday (공휴일)

```typescript
interface Holiday {
  date: Date;                    // 공휴일 날짜
  name: string;                  // 공휴일 이름 (예: "신정", "설날")
  isManual: boolean;             // 수동 추가 여부 (API vs 수동)
}
```

### 2.6. UserState (사용자 상태)

```typescript
interface UserState {
  email: string;                 // 사용자 이메일
  lastProjectId: string;         // 마지막 사용 프로젝트 ID
  hasCompletedOnboarding: boolean; // 온보딩 완료 여부
}
// Q1: lastProjectType 제거 (타입별 독립 프로젝트 정책)
```

---

## 3. 공통 계산 로직

### 3.1. 영업일 역산 함수

```javascript
/**
 * 업데이트일 기준 N 영업일 역산
 * @param {Date} updateDate - 업데이트일 (D-day)
 * @param {number} offsetDays - 역산할 영업일 (양수 = 과거, 음수 = 미래)
 * @param {Date[]} holidays - 공휴일 배열
 * @returns {Date} 계산된 날짜
 */
function calculateBusinessDate(updateDate, offsetDays, holidays) {
  let currentDate = new Date(updateDate);
  let remainingDays = Math.abs(offsetDays);
  const direction = offsetDays >= 0 ? -1 : 1; // 양수면 과거(-), 음수면 미래(+)

  while (remainingDays > 0) {
    currentDate.setDate(currentDate.getDate() + direction);

    // 주말 체크 (토요일=6, 일요일=0)
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue; // 주말은 영업일에서 제외, 카운트 안 함
    }

    // 공휴일 체크
    const isHoliday = holidays.some(holiday =>
      holiday.getFullYear() === currentDate.getFullYear() &&
      holiday.getMonth() === currentDate.getMonth() &&
      holiday.getDate() === currentDate.getDate()
    );
    if (isHoliday) {
      continue; // 공휴일은 영업일에서 제외, 카운트 안 함
    }

    // 영업일 카운트
    remainingDays--;
  }

  return currentDate;
}
```

**핵심 규칙** (LLM 구현 시 정확히 따를 것):
- **주말 제외**: 토요일(6), 일요일(0) 완전 제외
- **공휴일 제외**: 공휴일 배열에 포함된 날짜 완전 제외
- **중복 카운트 방지**: 알고리즘상 주말 체크가 먼저 실행되므로, 주말에 해당하는 공휴일은 주말 단계에서 이미 제외됨. 공휴일 체크는 평일에만 실행됨.
- **음수 Offset**: 업데이트일 이후 미래 날짜 계산 (음수 = direction +1)
- **Offset=0 정책** (Q2): 업데이트일을 그대로 반환 (영업일 검증 안 함)
  - 가정: 사용자가 주말/공휴일을 업데이트일로 입력하지 않을 것으로 기대
  - 업데이트일은 항상 유효한 영업일이라고 가정

### 3.2. 시작/종료일시 계산

```javascript
/**
 * WorkStage로부터 시작/종료일시 계산
 * @param {Date} updateDate - 업데이트일
 * @param {WorkStage} stage - 업무 단계
 * @param {Date[]} holidays - 공휴일 배열
 * @returns {{ startDateTime: Date, endDateTime: Date }}
 */
function calculateDateTimeFromStage(updateDate, stage, holidays) {
  // 1. 날짜 계산 (영업일 역산)
  const date = calculateBusinessDate(updateDate, stage.offsetDays, holidays);

  // 2. 시각 추가
  const [startHour, startMin] = stage.startTime.split(':').map(Number);
  const [endHour, endMin] = stage.endTime.split(':').map(Number);

  const startDateTime = new Date(date);
  startDateTime.setHours(startHour, startMin, 0, 0);

  const endDateTime = new Date(date);
  endDateTime.setHours(endHour, endMin, 0, 0);

  return { startDateTime, endDateTime };
}
```

### 3.3. 헤즈업/iOS 심사일 계산

```javascript
/**
 * 프로젝트별 Offset으로 헤즈업 날짜 계산
 */
function calculateHeadsUpDate(updateDate, project, holidays) {
  return calculateBusinessDate(updateDate, project.headsUpOffset, holidays);
}

/**
 * 프로젝트별 Offset으로 iOS 심사일 계산
 */
function calculateIosReviewDate(updateDate, project, holidays) {
  if (!project.showIosReviewDate) {
    return null;
  }
  return calculateBusinessDate(updateDate, project.iosReviewOffset, holidays);
}
```

### 3.4. 날짜 형식 변환 함수 (Q6: LLM 구현 필수)

```javascript
/**
 * Date → 테이블 출력 형식 변환
 * @param {Date} date
 * @returns {string} "MM/DD(요일) HH:MM" 형식
 * @example formatTableDate(new Date('2026-01-28 09:00')) → "01/28(화) 09:00"
 */
function formatTableDate(date) {
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
 * @param {Date} date
 * @returns {string} "YYYY-MM-DD (요일)" 형식
 * @example formatUpdateDate(new Date('2026-02-10')) → "2026-02-10 (월)"
 */
function formatUpdateDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = weekdays[date.getDay()];

  return `${yyyy}-${mm}-${dd} (${dayOfWeek})`;
}
```

---

## 4. 기술 스택 상세

### 4.1. 프론트엔드

| 기술 | 용도 | 라이선스 | 비고 |
|------|------|----------|------|
| HTML5 | 마크업 | - | 시맨틱 태그 사용 |
| CSS3 | 스타일링 | - | Flexbox/Grid 레이아웃 |
| JavaScript (ES6+) | 로직 | - | Vanilla 또는 React (선택) |

### 4.2. 주요 라이브러리

| 라이브러리 | 용도 | 버전 | 라이선스 | 번들 크기 | GitHub |
|-----------|------|------|----------|----------|--------|
| **Frappe Gantt** | 간트 차트 | 1.0.3+ | MIT | ~50-80KB | [frappe/gantt](https://github.com/frappe/gantt) |
| **FullCalendar** | 캘린더 | 6.1.0+ | MIT | ~200KB | [fullcalendar/fullcalendar](https://github.com/fullcalendar/fullcalendar) |
| **html2canvas** | 이미지 복사 | 1.4.1+ | MIT | ~100KB | [niklasvh/html2canvas](https://github.com/niklasvh/html2canvas) |

**선정 이유**:
- **Frappe Gantt**: Zero dependencies, 의존성 화살표 지원, MIT 라이선스, 활발한 유지보수
- **FullCalendar**: 업계 표준 캘린더 라이브러리, 풍부한 기능, MIT 라이선스, React 공식 지원
  - Event Calendar에서 FullCalendar로 교체 (Phase 0 개발 중)
  - 이유: React 통합 용이, 더 안정적인 API, 커뮤니티 지원 우수
- **html2canvas**: 가장 안정적이고 널리 사용되는 HTML→PNG 변환 라이브러리

자세한 조사 내용:
- **간트**: [talkwiththeuser/gantt-library-research.md](../talkwiththeuser/gantt-library-research.md)
- **캘린더**: [talkwiththeuser/calendar-library-research.md](../talkwiththeuser/calendar-library-research.md)

### 4.3. 인증 및 저장

| 기술 | 용도 | 비고 |
|------|------|------|
| Gmail OAuth 2.0 | 소셜 로그인 | Google Identity Services |
| LocalStorage | 데이터 저장 | 브라우저 내장 API (5-10MB 제한) |
| .env 파일 | 화이트리스트, API 키 | 환경 변수 관리 |

### 4.4. 외부 API

| API | 용도 | 제공자 | 인증 |
|-----|------|--------|------|
| 공공데이터포털 - 특일정보 API | 공휴일 데이터 | 한국천문연구원 | API 키 (.env) |
| Gmail OAuth API | 소셜 로그인 | Google | OAuth 2.0 |

**공휴일 API 상세** (Q9: LLM 구현 시 정확한 파싱 필수):
- **엔드포인트**: `GET /B090041/openapi/service/SpcdeInfoService/getRestDeInfo`
- **파라미터**: `solYear=2026&ServiceKey=[키]`
- **응답 형식**: XML
- **호출 시점**: 사용자가 "공휴일 불러오기" 버튼 클릭 시 (수동)

**응답 예시**:
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
        <dateName>1월1일</dateName>
        <isHoliday>Y</isHoliday>
        <locdate>20260101</locdate>
        <seq>1</seq>
      </item>
      <item>
        <dateKind>01</dateKind>
        <dateName>설날</dateName>
        <isHoliday>Y</isHoliday>
        <locdate>20260128</locdate>
        <seq>1</seq>
      </item>
    </items>
  </body>
</response>
```

**파싱 로직** (LLM이 반드시 구현해야 함):
```javascript
// 1. DOMParser로 XML 파싱
const parser = new DOMParser();
const xmlDoc = parser.parseFromString(xmlResponse, "text/xml");

// 2. resultCode 확인
const resultCode = xmlDoc.querySelector('resultCode')?.textContent;
if (resultCode !== '00') {
  throw new Error('API 오류: ' + xmlDoc.querySelector('resultMsg')?.textContent);
}

// 3. item 요소 추출
const items = xmlDoc.querySelectorAll('item');
const holidays = [];

items.forEach(item => {
  const locdateStr = item.querySelector('locdate').textContent; // "20260101"
  const dateName = item.querySelector('dateName').textContent;  // "1월1일"

  // 4. YYYYMMDD → Date 변환 (Q3: 로컬 시간대 사용)
  const year = parseInt(locdateStr.substring(0, 4));
  const month = parseInt(locdateStr.substring(4, 6));
  const day = parseInt(locdateStr.substring(6, 8));
  const date = new Date(year, month - 1, day); // 로컬 시간대, month는 0-based

  // 5. Holiday 객체 생성
  holidays.push({
    date: date,
    name: dateName,
    isManual: false
  });
});

// 6. LocalStorage 저장 (기존 API 공휴일 덮어쓰기, 수동 추가는 유지)
const manualHolidays = existingHolidays.filter(h => h.isManual);
const allHolidays = [...holidays, ...manualHolidays];
localStorage.setItem('azrael:holidays', JSON.stringify(allHolidays));
```

**에러 처리**:
- API 호출 실패 → "공휴일 API 호출에 실패했습니다. 네트워크를 확인하거나 수동으로 추가해주세요."
- XML 파싱 실패 → "공휴일 데이터 파싱에 실패했습니다. 관리자에게 문의하세요."
- resultCode ≠ "00" → API 오류 메시지 표시

---

## 5. LocalStorage 스키마

### 5.1. 저장 키 구조 (Q1: {type?} 제거)

```
azrael:projects              → Project[] (프로젝트 목록)
azrael:templates             → WorkTemplate[] (업무 템플릿)
azrael:holidays              → Holiday[] (공휴일 목록)
azrael:calculation:{projectId} → CalculationResult (계산 결과, 최신만)
azrael:userState             → UserState (사용자 상태)
```

**⚠️ 변경 사항**: 타입별 독립 프로젝트 정책으로 인해 `:{type?}` 제거
- 이전: `azrael:calculation:NC_GL:1week`
- 현재: `azrael:calculation:NC_GL_1week` (projectId에 타입 포함)

**LocalStorage Date 직렬화 처리** (Q1: LLM 구현 필수):
```javascript
// 저장 시: JSON.stringify() - Date 자동으로 ISO 8601 문자열로 변환
localStorage.setItem('azrael:calculation:M4_GL', JSON.stringify(calculationResult));

// 로드 시: JSON.parse() 후 Date 필드 수동 복원
function loadCalculationResult(projectId) {
  const json = localStorage.getItem(`azrael:calculation:${projectId}`);
  if (!json) return null;

  const result = JSON.parse(json);

  // Date 필드 복원 (필수)
  result.updateDate = new Date(result.updateDate);
  result.headsUpDate = new Date(result.headsUpDate);
  if (result.iosReviewDate) result.iosReviewDate = new Date(result.iosReviewDate);
  result.calculatedAt = new Date(result.calculatedAt);

  // ScheduleEntry의 Date 필드 복원
  const reviveEntries = (entries) => {
    entries.forEach(entry => {
      entry.startDateTime = new Date(entry.startDateTime);
      entry.endDateTime = new Date(entry.endDateTime);
      if (entry.children) reviveEntries(entry.children);
    });
  };

  reviveEntries(result.table1Entries);
  reviveEntries(result.table2Entries);
  reviveEntries(result.table3Entries);

  return result;
}
// Round12 Q1: 함수명 통일 (reviveEntries)

// Holiday 로드도 동일
function loadHolidays() {
  const json = localStorage.getItem('azrael:holidays');
  if (!json) return [];

  const holidays = JSON.parse(json);
  holidays.forEach(h => h.date = new Date(h.date));
  return holidays;
}
```

### 5.2. 예시 데이터

```json
// azrael:projects (Q3: 타입별 독립 프로젝트)
[
  {
    "id": "M4_GL",
    "name": "M4/GL",
    "headsUpOffset": 10,
    "showIosReviewDate": false,
    "templateId": "template_M4_GL",
    "disclaimer": "긴급 변경 시 사전 공지 필요"
  },
  {
    "id": "NC_GL_1week",
    "name": "NC/GL (1주)",
    "headsUpOffset": 7,
    "showIosReviewDate": false,
    "templateId": "template_NC_GL_1week",
    "disclaimer": ""
  },
  {
    "id": "NC_GL_2week",
    "name": "NC/GL (2주)",
    "headsUpOffset": 10,
    "showIosReviewDate": false,
    "templateId": "template_NC_GL_2week",
    "disclaimer": ""
  }
// Round10 Q1: isDeletable 필드 제거 (저장 안 함, 로드 시 동적 계산)
]

// azrael:holidays
[
  {
    "date": "2026-01-01",
    "name": "신정",
    "isManual": false
  },
  {
    "date": "2026-01-28",
    "name": "설날",
    "isManual": false
  }
]

// azrael:userState
{
  "email": "user@company.com",
  "lastProjectId": "M4_GL",
  "hasCompletedOnboarding": true
}
```

### 5.3. 초기 데이터 시드 (Q7: LLM 구현 필수)

**정책**: 최초 실행 시 **9개 기본 프로젝트 자동 생성** (템플릿은 빈 상태)

**자동 생성 프로젝트**:
```javascript
const DEFAULT_PROJECTS = [
  { id: "M4_GL", name: "M4/GL", headsUpOffset: 10, showIosReviewDate: false, templateId: "template_M4_GL", disclaimer: "" },
  { id: "NC_GL_1week", name: "NC/GL (1주)", headsUpOffset: 7, showIosReviewDate: false, templateId: "template_NC_GL_1week", disclaimer: "" },
  { id: "NC_GL_2week", name: "NC/GL (2주)", headsUpOffset: 10, showIosReviewDate: false, templateId: "template_NC_GL_2week", disclaimer: "" },
  { id: "FB_GL_CDN", name: "FB/GL (CDN)", headsUpOffset: 10, showIosReviewDate: false, templateId: "template_FB_GL_CDN", disclaimer: "" },
  { id: "FB_GL_APP", name: "FB/GL (APP)", headsUpOffset: 10, showIosReviewDate: false, templateId: "template_FB_GL_APP", disclaimer: "" },
  { id: "FB_JP_CDN", name: "FB/JP (CDN)", headsUpOffset: 10, showIosReviewDate: false, templateId: "template_FB_JP_CDN", disclaimer: "" },
  { id: "FB_JP_APP", name: "FB/JP (APP)", headsUpOffset: 10, showIosReviewDate: false, templateId: "template_FB_JP_APP", disclaimer: "" },
  { id: "LY_GL", name: "LY/GL", headsUpOffset: 10, showIosReviewDate: false, templateId: "template_LY_GL", disclaimer: "" },
  { id: "MONTHLY", name: "월말정산", headsUpOffset: 5, showIosReviewDate: false, templateId: "template_MONTHLY", disclaimer: "" }
];
// Round10 Q1: isDeletable 필드 제거 (저장 안 함)

/**
 * 초기 데이터 생성 로직 (LLM이 앱 최초 실행 시 구현)
 */
function initializeDefaultData() {
  // LocalStorage가 비어있으면 기본 데이터 생성
  if (!localStorage.getItem('azrael:projects')) {
    localStorage.setItem('azrael:projects', JSON.stringify(DEFAULT_PROJECTS));
    localStorage.setItem('azrael:templates', JSON.stringify([])); // 템플릿은 빈 배열
    localStorage.setItem('azrael:holidays', JSON.stringify([]));  // 공휴일도 빈 배열
  }
}
```

**⚠️ 템플릿은 사용자가 설정에서 직접 추가**:
- 프로젝트별 업무 패턴이 다르므로 기본 템플릿 제공하지 않음
- 사용자가 "업무 단계 관리"에서 수동 추가

---

## 6. 비기능 요구사항

### 6.1. 브라우저 호환성

**지원 브라우저**:
- Chrome: 최신 2개 버전
- Edge: 최신 2개 버전
- Firefox: 최신 2개 버전
- Safari: 최신 2개 버전

**미지원**:
- Internet Explorer (모든 버전)
- 모바일 브라우저

### 6.2. 반응형 디자인

**지원**: PC 전용 (1280x720 이상 해상도)
**미지원**: 모바일, 태블릿

### 6.3. 성능

**목표**: 성능 목표 없음 (4인 사용, 소량 데이터)
**예상**:
- 일정 계산: < 1초
- 테이블 렌더링: < 500ms
- 간트/캘린더 렌더링: < 1초

### 6.4. 접근성

**목표**: 접근성 고려 안 함 (내부 4인만 사용)
**구현**: 기본적인 키보드 네비게이션만 제공

### 6.5. 보안

**인증**: Gmail OAuth 2.0 + .env 화이트리스트
**데이터 보호**: LocalStorage (브라우저 보안 의존)
**API 키 관리**: .env 파일 (코드에 하드코딩 금지)

**⚠️ 화이트리스트 보안 한계** (Q19: LLM 구현 시 인지할 것):
- 클라이언트 전용 앱에서 `.env`는 빌드 시 번들에 포함되어 **소스 코드 노출 가능**
- **허용 정책**: "회사 내부 전용, 소스 노출 허용" (4인만 사용, 민감 데이터 없음)
- **위험도**: 낮음 (내부 도구, 업무 일정만 저장)

### 6.6. 동시 편집 충돌 정책 (Q10)

**Phase 0 정책**: Last Write Wins (마지막 저장이 우선)
- LocalStorage는 **브라우저별 독립 저장소**이므로 사용자 간 충돌 없음
- 단, **같은 브라우저에서 여러 탭** 열린 경우 → 마지막 저장이 이전 저장 덮어쓰기

**권장 사용 방식**:
- 4인이 역할 분담하여 서로 다른 프로젝트 관리
- 또는 1명만 설정 변경, 나머지는 조회/계산만 사용

**Phase 1+ 검토 사항**:
- 낙관적 잠금: LocalStorage 타임스탬프 체크
- 충돌 감지 시: "다른 탭에서 설정을 변경했습니다. 새로고침 후 다시 시도하세요" 경고

---

## 7. 에러 처리

### 7.1. 공휴일 API 호출 실패

- **대응**: "API 호출에 실패했습니다. 네트워크를 확인하거나 수동으로 공휴일을 추가해주세요." 메시지 표시
- **fallback**: LocalStorage에 캐시된 공휴일 사용

### 7.2. LocalStorage 용량 초과

- **대응**: "저장 공간이 부족합니다. 브라우저 설정에서 저장 공간을 확인해주세요." 메시지 표시
- **예상**: 발생 가능성 낮음 (프로젝트 6개, 템플릿, 공휴일 등 < 1MB)

### 7.3. 화이트리스트 외 사용자 접근

- **대응**: "접근 권한이 없습니다. 관리자에게 문의하세요." 메시지 표시
- **리다이렉트**: 로그인 화면으로 돌아가기

### 7.4. 간트 차트/캘린더 렌더링 실패 (Q22)

**Frappe Gantt 초기화 실패**:
```javascript
try {
  const gantt = new Gantt('#gantt-table1', tasks, options);
} catch (err) {
  console.error('간트 차트 초기화 실패:', err);
  showError('간트 차트를 표시할 수 없습니다. 테이블로 확인해주세요.');
  // 대체 UI: 간트 차트 영역에 "표시 불가" 메시지 표시
}
```

**Event Calendar 초기화 실패**:
- 동일한 try-catch 패턴 적용
- fallback: "캘린더를 표시할 수 없습니다. 테이블로 확인해주세요."

### 7.5. 프로젝트 삭제 시 데이터 정리 (Q20: LLM이 누락 없이 구현해야 함)

**삭제 전 검증**:
```javascript
// Q21: 마지막 프로젝트는 삭제 불가
const projects = getProjects();
if (projects.length === 1) {
  showError('마지막 프로젝트는 삭제할 수 없습니다. 최소 1개 프로젝트 필요');
  return;
}
```

**삭제 범위** (Round12 제안1: LLM 구현 필수):
1. `azrael:projects` 배열에서 해당 프로젝트 객체 제거
2. `azrael:templates` 배열에서 `projectId`가 일치하는 템플릿 제거
3. `azrael:calculation:{projectId}` 키 삭제 (프로젝트당 1개 계산 결과만 존재)
4. `azrael:userState.lastProjectId`가 삭제된 프로젝트 ID면:
   - 남은 프로젝트 중 첫 번째로 변경
   - (프로젝트가 0개인 경우는 발생하지 않음 - 마지막 프로젝트 삭제 불가 정책)

---

## 8. 참조 문서

- **Master**: [Azrael-PRD-Master.md](./Azrael-PRD-Master.md)
- **Phase 0**: [Azrael-PRD-Phase0.md](./Azrael-PRD-Phase0.md)
- **Phase 1**: [Azrael-PRD-Phase1.md](./Azrael-PRD-Phase1.md)
- **Phase 2**: [Azrael-PRD-Phase2.md](./Azrael-PRD-Phase2.md)
- **Phase 3**: [Azrael-PRD-Phase3.md](./Azrael-PRD-Phase3.md)

---

**문서 종료**
