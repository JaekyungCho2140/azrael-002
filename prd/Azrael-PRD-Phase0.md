# Azrael PRD - Phase 0: 일정 계산 및 시각화

**최종 업데이트**: 2026-02-06
**버전**: 2.2
**참조**: [Azrael-PRD-Master.md](./Azrael-PRD-Master.md) | [Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)

**Phase 0 Status**: ✅ 완료

---

## 📋 문서 목적

이 문서는 **Phase 0의 핵심 기능**을 상세하게 정의합니다:
- 로그인 및 인증 (Google OAuth + Supabase Auth)
- 프로젝트 선택 및 관리 (Supabase)
- 업데이트일 입력 및 영업일 역산 계산
- 3개 테이블 출력 (일정표, Ext., Int.)
- 간트 차트 및 캘린더 시각화
- 이미지 복사 기능
- 설정 관리 (업무 단계, 공휴일)

Phase 0은 **Azrael의 MVP**로, 기존 엑셀 시트를 완전히 대체합니다.

---

## 1. 사용자 플로우

### 1.1. 전체 플로우

```
[로그인 화면]
    ↓ Google OAuth
[Supabase Auth] → 세션 생성 및 화이트리스트 검증
    ↓
[온보딩 (최초만)] → 프로젝트 선택 (강제)
    ↓
[메인 화면]
    ├─ 프로젝트 선택 (드롭다운, Supabase 조회)
    ├─ 업데이트일 입력
    ├─ [계산] 버튼
    ↓
[결과 화면]
    ├─ 상단 날짜 (헤즈업, iOS 심사일)
    ├─ 테이블 1 (일정표)
    ├─ 테이블 2 (Ext. 일정표)
    ├─ 테이블 3 (Int. 일정표)
    ├─ 간트 차트 3개
    ├─ 캘린더 뷰
    └─ [이미지 복사] 버튼들
    ↓
[설정] → 업무 단계, 공휴일 관리 (Supabase)
```

---

## 2. 로그인 및 인증

### 2.1. Google OAuth 로그인

**기술**: @react-oauth/google (v0.13.4)
**스코프**: `profile`, `email`

**UI**:
```
┌─────────────────────────────────┐
│         Azrael                  │
│   L10n 일정 관리 도구            │
│                                 │
│   [🔐 Google로 로그인]          │
│                                 │
│   회사 계정만 접근 가능합니다.    │
└─────────────────────────────────┘
```

**인증 플로우**:
1. Google OAuth 팝업 → 권한 승인
2. Google Access Token 획득
3. **Supabase Auth**: `signInWithIdToken()` 호출
   - Google Token → Supabase 세션 생성
   - RLS 정책에서 `auth.email()` 사용 가능
4. 화이트리스트 검증 (.env)
5. 성공 → 메인 화면 이동
6. 실패 → "접근 권한이 없습니다" 에러

### 2.2. Supabase Auth 통합

**파일**: `src/lib/supabase.ts`

```typescript
export async function signInWithGoogleToken(googleToken: string) {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: googleToken,
  });

  if (error) throw error;
  return data;
}
```

**세션 관리**:
- `persistSession: true` - 로그인 상태 유지
- `autoRefreshToken: true` - 자동 토큰 갱신
- `detectSessionInUrl: true` - URL에서 세션 감지

### 2.3. 권한 관리

**Supabase RLS 정책**:
- **읽기 (SELECT)**: 모든 인증된 사용자 (L10n팀 전체)
- **쓰기 (INSERT/UPDATE/DELETE)**: 화이트리스트 5명만
  - jkcho@wemade.com
  - mine@wemade.com
  - srpark@wemade.com
  - garden0130@wemade.com
  - hkkim@wemade.com

---

## 3. 온보딩

### 3.1. 최초 접속 시

**조건**: `azrael:userState`에 `hasCompletedOnboarding: false`

**UI**:
```
┌─────────────────────────────────────────┐
│  Azrael에 오신 것을 환영합니다!           │
│                                         │
│  먼저 사용할 프로젝트를 선택해주세요:      │
│                                         │
│  ○ M4/GL                                │
│  ○ NC/GL (1주)                          │
│  ○ NC/GL (2주)                          │
│  ○ FB/GL (CDN)                          │
│  ○ FB/GL (APP)                          │
│  ○ FB/JP (CDN)                          │
│  ○ FB/JP (APP)                          │
│  ○ LY/GL                                │
│  ○ 월말정산                              │
│                                         │
│              [시작하기]                  │
└─────────────────────────────────────────┘
```

**동작**:
1. 프로젝트 선택 (라디오 버튼)
2. "시작하기" 클릭
3. LocalStorage `UserState` 업데이트:
   - `lastProjectId`: 선택한 프로젝트 ID
   - `hasCompletedOnboarding`: true
4. 메인 화면 이동

---

## 4. 메인 화면

### 4.1. 레이아웃

```
┌────────────────────────────────────────────────────────┐
│ Azrael                            [⚙️ 설정] [로그아웃]  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  프로젝트: [M4/GL ▼]                                   │
│                                                        │
│  업데이트일: [2026-02-10 (월) 📅]  [계산]             │
│                                                        │
│  (마지막 계산 결과가 있으면 표시)                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 4.2. 프로젝트 선택 드롭다운

**데이터 소스**: Supabase (`useProjects()` 훅)
**정렬**: 이름 순
**항목**:
```
M4/GL
NC/GL (1주)
NC/GL (2주)
FB/GL (CDN)
FB/GL (APP)
FB/JP (CDN)
FB/JP (APP)
LY/GL
월말정산
```

### 4.3. 업데이트일 입력

**형태**: Date Picker (HTML5 input type="date")
**출력 형식**: `YYYY-MM-DD (요일)` (예: `2026-02-10 (월)`)

**동작**:
1. 입력칸 클릭 → Date Picker 팝업
2. 날짜 선택 → 자동으로 요일 계산하여 표시
3. 키보드로 직접 입력 가능 (YYYY-MM-DD 형식)

### 4.4. [계산] 버튼

**동작**:
1. 입력 검증 (업데이트일 유효성)
2. **Supabase에서 템플릿 및 공휴일 조회** (React Query 캐시 사용)
3. 영업일 역산 계산 (Shared.md §4 참조)
4. 테이블 생성 (§5)
5. 간트 차트 생성 (§6)
6. 캘린더 생성 (§7)
7. **Supabase에 계산 결과 저장** (팀 공유 데이터)
8. 결과 화면 렌더링

---

## 5. 테이블 출력

### 5.1. 전체 구조

```
[상단 날짜]
  헤즈업: MM/DD(요일)
  iOS 심사일: MM/DD(요일) (조건부)
  유료화 상품 협의일: MM/DD(요일) (조건부)

[테이블 1: YY-MM-DD 업데이트 일정표]
  #, 배치, 마감, 테이블 전달, 설명, 담당자

[테이블 2: Ext. YY-MM-DD 업데이트 일정표]
  #, 배치, HO, HB, 설명, JIRA 설명, [+][↓][✕]

[테이블 3: Int. YY-MM-DD 업데이트 일정표]
  #, 배치, HO, HB, 설명, JIRA 설명, [+][↓][✕]

[간트 차트 3개] [각각 이미지 복사 버튼]
[캘린더 뷰] [이미지 복사 버튼]
```

### 5.2. 테이블 1: 일정표

**헤더**:
```
| # | 배치 | 마감 | 테이블 전달 | 설명 | 담당자 |
```

**출력 형식**:
- 마감 / 테이블 전달: `MM/DD(요일) HH:MM` (예: `01/28(화) 09:00`)
- 모든 컬럼 가운데 정렬

**Disclaimer**:
- 위치: 테이블 하단 (테이블 1만 표시)
- 제한: 최대 600자
- 서식: 커스텀 태그 지원 (`<b>`, `<r>`, `<g>`, `<bl>`, `<u>`)
- 저장: Supabase `projects.disclaimer`

### 5.3. 테이블 2/3: Ext./Int. 일정표

**헤더**:
```
| # | 배치 | HO | HB | 설명 | JIRA 설명 | JIRA 담당자 |
```

**하위 일감 구조**:
- 최대 깊이: 2단계 (부모-자식)
- 인덱싱: 계층적 번호 (1, 1.1, 1.2, 2, 2.1...)
- 들여쓰기: 하위 일감 시각적 표시

**예시**:
```
┌────┬──────────┬────────────┬────────────┬──────┬──────────┬───────┐
│ #  │  배치    │     HO     │     HB     │ 설명 │JIRA 설명 │담당자 │
├────┼──────────┼────────────┼────────────┼──────┼──────────┼───────┤
│ 1  │ REGULAR  │ 01/10 09:00│ 01/15 18:00│      │          │ 조재경│
│1.1 │  ㄴ번역  │ 01/10 09:00│ 01/12 18:00│      │          │ 김민혜│
│1.2 │  ㄴ검수  │ 01/13 09:00│ 01/15 18:00│      │          │ 박선률│
│ 2  │ EXTRA1   │ 01/20 09:00│ 01/25 18:00│      │          │ 조재경│
└────┴──────────┴────────────┴────────────┴──────┴──────────┴───────┘
```

**하위 일감 편집**:
하위 일감 추가/삭제는 **설정 > 업무 단계**에서 수행합니다.

---

## 6. 간트 차트

### 6.1. 라이브러리

**선정**: Frappe Gantt (v1.0.4)
**라이선스**: MIT
**의존성**: Zero dependencies

### 6.2. 배치

**개수**: 3개 (테이블별 1개)
**위치**: 각 테이블 아래

```
[테이블 1]
  ↓
[간트 차트 1] [📋 이미지 복사]

[테이블 2]
  ↓
[간트 차트 2] [📋 이미지 복사]

[테이블 3]
  ↓
[간트 차트 3] [📋 이미지 복사]
```

### 6.3. 기본 설정

**X축**: 날짜 (Day 단위), 전체 업무 기간 자동 조정
**Y축**: 업무 목록, 계층 구조 들여쓰기
**의존성 화살표**: 순차적 업무 간 자동 연결
**상호작용**: 정적 표시 (드래그 비활성화)
**툴팁**: 호버 시 시작/종료 시각 표시

### 6.4. 구현 예시

```typescript
import Gantt from 'frappe-gantt';

const tasks = table1Entries.map((entry, index) => ({
  id: entry.id,
  name: entry.stageName,
  start: entry.startDateTime,
  end: entry.endDateTime,
  progress: 100,
  dependencies: index > 0 ? table1Entries[index - 1].id : ''
}));

const gantt = new Gantt('#gantt-table1', tasks, {
  view_mode: 'Day',
  bar_height: 30,
  arrow_curve: 5,
  language: 'ko',
  custom_popup_html: function(task) {
    const entry = entryMap.get(task.id);
    const startTime = entry.startDateTime.toLocaleTimeString('ko-KR', {
      hour: '2-digit', minute: '2-digit', hour12: false
    });
    const endTime = entry.endDateTime.toLocaleTimeString('ko-KR', {
      hour: '2-digit', minute: '2-digit', hour12: false
    });
    return `<div><h5>${task.name}</h5><p>${startTime} ~ ${endTime}</p></div>`;
  }
});
```

---

## 7. 캘린더 뷰

### 7.1. 라이브러리

**선정**: FullCalendar (v6.1.20)
**라이선스**: MIT
**패키지**:
- `@fullcalendar/core`
- `@fullcalendar/daygrid`
- `@fullcalendar/react`

### 7.2. 형식

**뷰**: 월간 캘린더 (dayGridMonth)
**레이아웃**: 표준 달력 형식 (일~토)

```
      2026년 2월
일  월  화  수  목  금  토
                    1
 2   3   4   5   6   7   8
 9  10  11  12  13  14  15
```

### 7.3. 업무 표시

**형태**: 색상 바 (Bar)
**색상** (Design.md §2.4 참조):
- 테이블1: Azrael Orange (#FF9800)
- 테이블2: Teal (#009688)
- 테이블3: Deep Purple (#673AB7)

**툴팁**: 브라우저 기본 툴팁 (`title` 속성)
- 내용: `{배치}: {HO} ~ {HB}`
- 예: `정기: 01/10 09:00 ~ 01/15 18:00`

### 7.4. 구현 예시

```typescript
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

const events = [
  ...table1Entries.map(e => ({
    title: e.stageName,
    start: e.startDateTime,
    end: e.endDateTime,
    backgroundColor: '#FF9800'
  })),
  ...table2Entries.map(e => ({
    title: e.stageName,
    start: e.startDateTime,
    end: e.endDateTime,
    backgroundColor: '#009688'
  })),
  ...table3Entries.map(e => ({
    title: e.stageName,
    start: e.startDateTime,
    end: e.endDateTime,
    backgroundColor: '#673AB7'
  }))
];

<FullCalendar
  plugins={[dayGridPlugin]}
  initialView="dayGridMonth"
  events={events}
  locale="ko"
/>
```

---

## 8. 이미지 복사

### 8.1. 트리거 UI

**위치**: 각 테이블, 간트 차트, 캘린더 옆
**형태**: 버튼 `[📋 이미지 복사]`
**총 개수**: 7개 (테이블 3개 + 간트 3개 + 캘린더 1개)

### 8.2. 기술

**라이브러리**: html2canvas (v1.4.1)
**출력 형식**: PNG
**해상도**: 2배 (scale: 2, Retina 대응)

### 8.3. 동작

1. 버튼 클릭
2. 로딩 표시 ("이미지 생성 중...")
3. html2canvas로 요소 캡처
4. Canvas → PNG Blob 변환
5. Clipboard API로 클립보드에 복사
6. 성공 메시지 표시

**Fallback**: Clipboard API 미지원 시 이미지 다운로드

### 8.4. 구현 예시

```typescript
import html2canvas from 'html2canvas';

async function copyElementAsImage(elementId: string) {
  if (!navigator.clipboard?.write) {
    // Fallback: 다운로드
    const canvas = await html2canvas(element, { scale: 2 });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `azrael-${elementId}.png`;
    a.click();
    return;
  }

  const canvas = await html2canvas(element, { scale: 2, useCORS: true });
  canvas.toBlob(async (blob) => {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    showSuccess('이미지가 클립보드에 복사되었습니다');
  });
}
```

---

## 9. 테이블 표시 (읽기 전용)

### 9.1. 읽기 전용 원칙

계산 결과 테이블(T1/T2/T3)은 **완전 읽기 전용**입니다.

- 부가 정보(설명, 담당자, JIRA 설명, JIRA 담당자)는 **설정 > 업무 단계**에서 편집
- WorkStage 템플릿의 값이 계산 시 자동으로 ScheduleEntry에 복사됨
- 모든 업데이트일에 공통 적용되어 일관성 유지

### 9.2. 테이블 컬럼 (읽기 전용)

**테이블 1**:
- #, 배치, 마감, 테이블 전달, 설명, 담당자

**테이블 2/3**:
- #, 배치, HO, HB, 설명, JIRA 설명, JIRA 담당자

### 9.3. 편집 위치

부가 정보 편집은 **설정 > 업무 단계 > [편집] 버튼**에서만 가능합니다.
참조: [Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md) §12.2

---

## 10. 설정 화면

### 10.1. 레이아웃

**진입**: 상단 메뉴 → [⚙️ 설정]

**UI**:
```
┌────────────────────────────────────────┐
│ 설정                          [← 돌아가기] │
├────────────────────────────────────────┤
│  ┌───────────┬───────────────────────┐│
│  │ 프로젝트   │                       ││
│  │ 업무 단계  │  (내용 영역)           ││
│  │ 공휴일     │                       ││
│  └───────────┴───────────────────────┘│
└────────────────────────────────────────┘
```

### 10.2. 프로젝트 관리

**데이터 소스**: Supabase (`useProjects()` 훅)

**UI**:
```
프로젝트 관리

┌────────┬──────┬──────┐
│ 이름   │ 편집 │ 삭제 │
├────────┼──────┼──────┤
│ M4/GL  │ [편집]│ [삭제]│
│NC/GL(1주)│[편집]│ [삭제]│
└────────┴──────┴──────┘

[+ 새 프로젝트 추가]
```

**프로젝트 추가/편집 모달**:
```
┌─────────────────────────────────┐
│  프로젝트 편집: M4/GL            │
├─────────────────────────────────┤
│  이름: [M4/GL_________]         │
│                                 │
│  헤즈업 Offset: [10] 영업일 전   │
│  iOS 심사일 표시: ☐ 예          │
│  iOS 심사일 Offset: [7] 영업일 전│
│                                 │
│  Disclaimer:                    │
│  [________________________]     │
│                                 │
│            [취소]  [저장]       │
└─────────────────────────────────┘
```

**동작**:
- **추가**: `useCreateProject()` mutation → Supabase INSERT
- **편집**: `useUpdateProject()` mutation → Supabase UPDATE
- **삭제**: `useDeleteProject()` mutation → Supabase DELETE (CASCADE)

### 10.3. 업무 단계 관리

**데이터 소스**: Supabase (`useTemplateByProjectId()` 훅)

**UI**:
```
업무 단계 템플릿

프로젝트 선택: [M4/GL ▼]

┌───┬──────┬──────────┬──────────┬────────┬────┬────┐
│ # │ 배치 │시작 Offset│종료 Offset│  시각  │편집│삭제│
├───┼──────┼──────────┼──────────┼────────┼────┼────┤
│ 1 │ 정기 │   10     │    8     │09:00-18:00│[편집]│[삭제]│
│ 2 │ 1차  │    5     │    3     │09:00-18:00│[편집]│[삭제]│
└───┴──────┴──────────┴──────────┴────────┴────┴────┘

테이블 위치: ☑ 테이블1  ☑ 테이블2  ☑ 테이블3

[+ 업무 단계 추가]
```

**업무 단계 추가/편집 모달**:
```
┌─────────────────────────────────┐
│  업무 단계 편집                  │
├─────────────────────────────────┤
│  배치 이름: [정기______]         │
│                                 │
│  마감(시작) Offset: [10] 영업일 전│
│  테이블 전달(종료) Offset: [8] 영업일 전│
│                                 │
│  시작 시각: [09]:[00]           │
│  종료 시각: [18]:[00]           │
│                                 │
│  표시할 테이블:                  │
│  ☑ 테이블1  ☑ 테이블2  ☑ 테이블3 │
│                                 │
│            [취소]  [저장]       │
└─────────────────────────────────┘
```

**동작**:
- **추가/편집/삭제**: `useSaveTemplate()` mutation → Supabase 전체 템플릿 교체
- CASCADE 삭제: 템플릿 삭제 시 모든 WorkStages 자동 삭제

### 10.4. 공휴일 관리

**데이터 소스**: Supabase (`useHolidays()` 훅)

**UI**:
```
공휴일 관리

[🔄 공휴일 불러오기 (API)]  올해: 2026년

┌────────────┬──────────┬────────┬──────┐
│   날짜     │   이름   │  출처  │ 삭제 │
├────────────┼──────────┼────────┼──────┤
│ 2026-01-01 │   신정   │  API   │  -   │
│ 2026-01-28 │   설날   │  API   │ [삭제]│
│ 2026-05-01 │근로자의 날│ 수동   │ [삭제]│
└────────────┴──────────┴────────┴──────┘

[+ 공휴일 수동 추가]
```

**[공휴일 불러오기] 동작**:
1. 공공데이터포털 API 호출
2. XML 파싱 → Holiday[] 변환
3. `useSyncApiHolidays()` mutation → Supabase에 저장
4. 성공 메시지 표시

**[수동 추가] 동작**:
- `useCreateHoliday()` mutation → Supabase INSERT

**[삭제] 동작**:
- `useDeleteHoliday()` mutation → Supabase DELETE

---

## 11. 비기능 요구사항

**브라우저**: Chrome, Edge, Firefox, Safari (최신 2개 버전)
**해상도**: 1280x720 이상
**네트워크**: Supabase 연결 필요 (공유 데이터), 공휴일 API 선택적
**성능**: 계산 < 1초, 렌더링 < 1초

자세한 내용은 **[Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)** §7 참조

---

## 12. 에러 처리

| 상황 | 처리 |
|------|------|
| Supabase 연결 실패 | "데이터베이스 연결 실패" 에러, React Query 캐시 사용 |
| 업데이트일 미입력 | "업데이트일을 입력해주세요" 에러 |
| 공휴일 API 실패 | "API 호출 실패. 수동 추가하거나 나중에 다시 시도하세요" 에러 |
| 이미지 복사 실패 | "이미지 복사 실패", 다운로드 제안 |
| 화이트리스트 외 접근 | "접근 권한이 없습니다" 에러, 로그인 화면으로 리다이렉트 |

---

## 13. 참조 문서

- **Master**: [Azrael-PRD-Master.md](./Azrael-PRD-Master.md)
- **Shared**: [Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)
- **Design**: [Azrael-PRD-Design.md](./Azrael-PRD-Design.md)
- **Phase 1**: [Azrael-PRD-Phase1.md](./Azrael-PRD-Phase1.md)
- **Phase 2**: [Azrael-PRD-Phase2.md](./Azrael-PRD-Phase2.md)
- **Phase 3**: [Azrael-PRD-Phase3.md](./Azrael-PRD-Phase3.md)

---

**문서 종료**
