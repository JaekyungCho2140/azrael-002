# Azrael PRD - Phase 0: 일정 계산 및 시각화

**작성일**: 2026-01-09
**최종 업데이트**: 2026-01-13
**버전**: 1.1
**참조**: [Azrael-PRD-Master.md](./Azrael-PRD-Master.md) | [Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)

**Phase 0 Status**: ✅ MVP 완료 (2026-01-13)

---

## 📋 문서 목적

이 문서는 **Phase 0의 핵심 기능**을 상세하게 정의합니다:
- 로그인 및 인증
- 프로젝트 선택 및 관리
- 업데이트일 입력 및 영업일 역산 계산
- 3개 테이블 출력 (일정표, Ext., Int.)
- 간트 차트 및 캘린더 시각화
- 이미지 복사 기능
- 설정 관리 (업무 단계, 공휴일)

Phase 0은 **Azrael의 MVP**로, 이 단계만으로도 기존 엑셀 시트를 대체할 수 있습니다.

---

## 1. 사용자 플로우

### 1.1. 전체 플로우

```
[로그인 화면]
    ↓ Gmail OAuth
[인증 검증] → 화이트리스트 체크 (.env)
    ↓
[온보딩 (최초만)] → 프로젝트 선택 (강제)
    ↓
[메인 화면]
    ├─ 프로젝트 선택 (드롭다운)
    ├─ 타입 선택 (NC/GL, FB 조건부)
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
[편집] → 텍스트/서식 편집 → LocalStorage 저장
    ↓
[설정] → 업무 단계, 공휴일 관리
```

### 1.2. 상세 플로우

**최초 사용자**:
1. 로그인 → Gmail OAuth → 화이트리스트 검증
2. 온보딩 화면 → 프로젝트 선택 (건너뛰기 불가)
3. 메인 화면 → 업데이트일 입력 화면

**재방문 사용자**:
1. 로그인 → 마지막 사용 프로젝트 화면으로 이동
2. 마지막 계산 결과 자동 로드 (있으면)

---

## 2. 로그인 및 인증

### 2.1. Gmail OAuth 로그인

**기술**: Google Identity Services (OAuth 2.0)
**스코프**: `profile`, `email` (기본 프로필 정보만)

**UI**:
```
┌─────────────────────────────────┐
│         Azrael                  │
│   L10n 일정 관리 도구            │
│                                 │
│   [🔐 Gmail로 로그인]           │
│                                 │
│   회사 계정만 접근 가능합니다.    │
└─────────────────────────────────┘
```

**인증 플로우**:
1. 사용자 "Gmail로 로그인" 버튼 클릭
2. Google OAuth 팝업 → 권한 승인
3. 이메일 주소 획득 → 화이트리스트 검증
4. 검증 성공 → 메인 화면 이동
5. 검증 실패 → "접근 권한이 없습니다" 에러 표시

### 2.2. 화이트리스트 검증

**관리 방식**: `.env` 파일에 허용 이메일 목록

**`.env` 예시**:
```env
ALLOWED_USERS=user1@company.com,user2@company.com,user3@company.com,user4@company.com
HOLIDAY_API_KEY=your_api_key_here
```

**검증 로직**:
```javascript
const allowedUsers = process.env.ALLOWED_USERS.split(',');
const userEmail = oauthResponse.email;

if (!allowedUsers.includes(userEmail)) {
  throw new Error('접근 권한이 없습니다. 관리자에게 문의하세요.');
}
```

### 2.3. 권한 관리

**Phase 0 정책**: 모든 사용자 동일 권한
- 프로젝트 추가/삭제: ✅ 모두 가능
- 설정 변경: ✅ 모두 가능
- 공휴일 관리: ✅ 모두 가능

---

## 3. 온보딩

### 3.1. 최초 접속 시

**조건**: `azrael:userState`에 `hasCompletedOnboarding: false`

**UI** (Q3: 타입별 독립 프로젝트 반영):
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
│                                         │
│  ⚠️ 이 화면은 최초 1회만 표시됩니다.      │
└─────────────────────────────────────────┘
```

**동작**:
1. 프로젝트 선택 (라디오 버튼)
2. "시작하기" 클릭
3. `UserState` 업데이트:
   - `lastProjectId`: 선택한 프로젝트 ID
   - `hasCompletedOnboarding`: true
4. 메인 화면 이동

---

## 4. 메인 화면 - 프로젝트 선택 및 업데이트일 입력

### 4.1. 레이아웃 (Q3: 타입 선택 UI 제거)

```
┌────────────────────────────────────────────────────────┐
│ Azrael                            [⚙️ 설정] [로그아웃]  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  프로젝트: [M4/GL ▼]                                   │
│                                                        │
│  업데이트일: [2026-02-10 (월) 📅]  [계산]             │
│                                                        │
│  ────────── 또는 ──────────                            │
│                                                        │
│  (마지막 계산 결과 표시 영역)                           │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 4.2. 프로젝트 선택 드롭다운

**위치**: 화면 상단 좌측
**형태**: 드롭다운 메뉴

**항목** (Q3: 타입별 독립 프로젝트):
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
──────────
+ 새 프로젝트 추가
```

**동작**:
1. 드롭다운 클릭 → 프로젝트 목록 표시
2. 프로젝트 선택 → 해당 프로젝트 화면으로 전환
3. "새 프로젝트 추가" → 프로젝트 추가 모달 표시 (§4.8)

### 4.3. 업데이트일 입력

**⚠️ 변경 사항** (Q3): 타입 선택 UI 제거
- NC/GL, FB는 타입별로 독립 프로젝트로 분리
- 조건부 UI (라디오 버튼) 불필요
- 프로젝트 드롭다운에서 바로 선택

### 4.4. 업데이트일 입력 (원래 4.4 내용)

**형태**: Date Picker + 키보드 입력 병행
**출력 형식**: `YYYY-MM-DD (요일)` (예: `2026-02-10 (월)`)

**UI**:
```
업데이트일: [2026-02-10 (월) 📅]
```

**동작**:
1. 입력칸 클릭 → Date Picker 팝업
2. 날짜 선택 → 자동으로 요일 계산하여 표시
3. 키보드로 직접 입력도 가능 (YYYY-MM-DD 형식)

### 4.5. [계산] 버튼

**위치**: 업데이트일 입력 오른쪽
**동작**:
1. 버튼 클릭
2. 입력 검증 (업데이트일이 유효한 날짜인지)
3. 공휴일 데이터 로드 (LocalStorage)
4. 영업일 역산 계산 (Shared.md §3.1-3.3 참조)
5. 테이블 생성 (§5)
6. 간트 차트 생성 (§6)
7. 캘린더 생성 (§7)
8. LocalStorage에 계산 결과 저장
9. 결과 화면 렌더링

### 4.6. 마지막 계산 결과 표시

**조건**: LocalStorage에 해당 프로젝트의 계산 결과가 있는 경우
**위치**: 업데이트일 입력 아래

**UI**:
```
  ────────── 또는 ──────────

  마지막 계산: 2026-02-10 업데이트
  (2026-01-08 15:30에 계산됨)

  [결과 보기]
```

**동작**:
1. "결과 보기" 클릭 → 저장된 계산 결과 로드 및 표시
2. 새로 계산하려면 위에서 업데이트일 입력 → [계산]

### 4.7. 드롭다운 메뉴

**위치**: 화면 상단 우측
**항목**:
- ⚙️ **설정**: 설정 화면으로 이동 (§8)
- 🚪 **로그아웃**: 로그아웃 후 로그인 화면으로

### 4.8. 프로젝트 추가 모달

**트리거**: 프로젝트 드롭다운 → "+ 새 프로젝트 추가"

**UI**:
```
┌────────────────────────────────┐
│  새 프로젝트 추가               │
├────────────────────────────────┤
│                                │
│  프로젝트 이름:                 │
│  [________________]            │
│  (예: MIR5/GL)                 │
│                                │
│              [취소]  [추가]    │
└────────────────────────────────┘
```

**동작**:
1. 프로젝트 이름 입력
2. [추가] 클릭
3. 새 `Project` 생성:
   - `id`: 이름 기반 자동 생성 (예: "MIR5_GL")
   - `name`: 사용자 입력
   - `headsUpOffset`: 10 (기본값)
   - `showIosReviewDate`: false (기본값)
   - `templateId`: `template_{id}` (자동 생성)
   - `disclaimer`: "" (빈 문자열)
   - Round10 Q1: `isDeletable` 필드 없음 (동적 계산)
4. 빈 `WorkTemplate` 생성 (Round10 Q2):
   - `id`: `templateId`
   - `projectId`: 새 프로젝트 id
   - `stages`: [] (빈 배열, 사용자가 설정에서 추가)
5. LocalStorage 저장 (프로젝트 + 템플릿)
6. 프로젝트 목록 갱신
7. 새 프로젝트로 전환

**프로젝트 삭제**:
- 설정 → 프로젝트 관리에서 삭제 가능 (§8.1)

---

## 5. 테이블 출력

### 5.1. 전체 구조

계산 완료 후 다음 순서로 출력:

```
[상단 날짜]
  헤즈업: MM/DD(요일)
  iOS 심사일: MM/DD(요일) (조건부)

[테이블 1: YY-MM-DD 업데이트 일정표]
  #, 배치, 마감, 테이블 전달, 설명, 담당자

[테이블 2: Ext. YY-MM-DD 업데이트 일정표]
  #, 배치, HO, HB, 설명, JIRA 설명
  (▲/▼ 하위 일감 펼치기/접기)

[테이블 3: Int. YY-MM-DD 업데이트 일정표]
  #, 배치, HO, HB, 설명, JIRA 설명
  (▲/▼ 하위 일감 펼치기/접기)

[간트 차트 3개]
[캘린더 뷰]
```

### 5.2. 상단 날짜

**UI**:
```
┌──────────────────────────────────┐
│  헤즈업: 01/28(화)               │
│  iOS 심사일: 02/03(월)           │
└──────────────────────────────────┘
```

**계산**:
- **헤즈업**: `calculateHeadsUpDate(업데이트일, project, holidays)` (Shared.md §3.3)
- **iOS 심사일**: `calculateIosReviewDate(업데이트일, project, holidays)` (Shared.md §3.3)
  - `project.showIosReviewDate: false`이면 표시 안 함

**출력 형식**: `MM/DD(요일)` (예: `01/28(화)`)

### 5.3. 테이블 1: `{YY-MM-DD} 업데이트 일정표`

**테이블명**: 예) `26-02-10 업데이트 일정표`

**헤더**:
```
| # | 배치 | 마감 | 테이블 전달 | 설명 | 담당자 |
```

**컬럼 정의**:

| 컬럼 | 설명 | 데이터 타입 | 편집 가능 | 출력 형식 |
|------|------|------------|----------|----------|
| # | 인덱스 (1부터 순차) | 자동 계산 | ❌ | 숫자 |
| 배치 | 업무 이름 | WorkStage.name | ❌ | 텍스트 |
| 마감 | 시작일시 (L10n팀 작업 시작) | 계산 | ❌ | MM/DD(요일) HH:MM |
| 테이블 전달 | 종료일시 | 계산 | ❌ | MM/DD(요일) HH:MM |
| 설명 | 사용자 입력 | 텍스트 | ✅ | 텍스트 + 서식 |
| 담당자 | 사용자 입력 | 텍스트 | ✅ | 텍스트 + 서식 |

**정렬**: 가운데 정렬

**예시**:
```
┌────┬────────┬──────────────┬──────────────┬────────┬────────┐
│ #  │  배치  │    마감      │  테이블 전달 │  설명  │ 담당자 │
├────┼────────┼──────────────┼──────────────┼────────┼────────┤
│ 1  │  정기  │ 01/10(금) 09:00 │ 01/15(수) 18:00 │        │        │
│ 2  │  1차   │ 01/20(월) 09:00 │ 01/25(토) 18:00 │        │        │
│ 3  │  2차   │ 02/01(일) 09:00 │ 02/05(목) 18:00 │        │        │
└────┴────────┴──────────────┴──────────────┴────────┴────────┘

Disclaimer:
[사용자 메모 입력 영역 - 최대 6줄]
```

**Disclaimer 메모** (Q6: LLM 구현 시 정량적 기준 준수):
- **위치**: 테이블 1 하단 (대표로 편집, 테이블 2/3에도 동일 내용 표시)
- **형태**: 텍스트 입력 영역 (textarea)
- **제한**: 최대 6줄 또는 600자 중 먼저 도달하는 것
  - **줄 카운트 기준** (Q6): textarea의 scrollHeight 기반 시각적 줄 수
  - 자동 wrap 허용 (긴 텍스트는 자동으로 다음 줄)
  - 6줄 초과 또는 600자 초과 시: "Disclaimer는 최대 6줄/600자까지 입력 가능합니다" 에러
- **서식**: Bold, Italic, 색상 3종 (빨강, 파랑, 검정) - HTML 태그
- **저장**: 프로젝트별 저장 (`Project.disclaimer`), HTML 형식
- **편집**: 클릭 → 편집 모드 → 셀 밖 클릭 또는 Ctrl+S → `Project.disclaimer` 업데이트 → LocalStorage 저장
- **표시**: 테이블 2/3의 Disclaimer는 읽기 전용 (테이블 1 내용 동기화)

### 5.4. 테이블 2: `Ext. {YY-MM-DD} 업데이트 일정표`

**테이블명**: 예) `Ext. 26-02-10 업데이트 일정표`

**헤더**:
```
| ▼▲ | # | 배치 | HO | HB | 설명 | JIRA 설명 | [+] [↓] |
```

**컬럼 정의**:

| 컬럼 | 설명 | 데이터 타입 | 편집 가능 | 출력 형식 |
|------|------|------------|----------|----------|
| ▼▲ | 하위 일감 펼치기/접기 | 버튼 | - | 아이콘 |
| # | 인덱스 (계층적) | 자동 계산 | ❌ | 1, 1.1, 1.2... |
| 배치 | 업무 이름 | WorkStage.name | ❌ | 텍스트 |
| HO | Hands-Off (시작일시) | 계산 | ❌ | MM/DD(요일) HH:MM |
| HB | Hands-Back (종료일시) | 계산 | ❌ | MM/DD(요일) HH:MM |
| 설명 | 사용자 입력 | 텍스트 | ✅ | 텍스트 + 서식 |
| JIRA 설명 | JIRA 일감 설명 필드 | 텍스트 | ✅ | 텍스트 + 서식 |
| [+] | 같은 레벨 엔트리 추가 | 버튼 | - | + |
| [↓] | 하위 일감 추가 | 버튼 | - | ↓ |

**하위 일감 구조**:
- **최대 깊이**: 2단계 (부모 - 자식)
- **인덱싱**: 계층적 번호 (1, 1.1, 1.2, 2, 2.1...)
- **들여쓰기**: 하위 일감은 들여쓰기로 시각적 표시

**예시** (펼쳐진 상태):
```
┌───┬────┬──────────┬────────────┬────────────┬──────┬────────────┬────┐
│▲▼│ #  │  배치    │     HO     │     HB     │ 설명 │ JIRA 설명  │ +↓ │
├───┼────┼──────────┼────────────┼────────────┼──────┼────────────┼────┤
│ ▼ │ 1  │ REGULAR  │ 01/10 09:00│ 01/15 18:00│      │            │ +↓ │
│   │1.1 │  ㄴ번역  │ 01/10 09:00│ 01/12 18:00│      │            │ +↓ │
│   │1.2 │  ㄴ검수  │ 01/13 09:00│ 01/15 18:00│      │            │ +↓ │
│ ▼ │ 2  │ EXTRA1   │ 01/20 09:00│ 01/25 18:00│      │            │ +↓ │
└───┴────┴──────────┴────────────┴────────────┴──────┴────────────┴────┘
```

**▼/▲ 버튼 동작**:
- **▼ (펼침)**: 하위 일감 표시
- **▲ (접음)**: 하위 일감 숨김
- **기본 상태**: 펼쳐짐

**+ 버튼 동작**:
1. 클릭 → 현재 엔트리 **바로 다음에** 같은 레벨 엔트리 추가
2. 새 엔트리 기본값:
   - 배치: "새 업무"
   - HO/HB: 부모와 동일 (수동 편집 필요)
   - 설명, JIRA 설명: 빈 문자열
3. 인덱스 자동 재정렬

**↓ 버튼 동작** (Q13, Q2, Round9 Q1: 하위 일감도 템플릿으로 설정):
1. 클릭 → 현재 엔트리의 **하위 일감** 추가
2. **검증**:
   - 최대 깊이(2단계) 체크: 이미 자식이면 → "최대 2단계까지만 지원합니다" 에러
   - 최대 개수 체크: 부모의 하위 일감이 20개면 → "하위 일감은 최대 20개까지 추가할 수 있습니다" 에러
3. 새 하위 엔트리 기본값:
   - 부모 ID 설정 (`parentId`)
   - **부모 엔트리의 children 배열에 추가** (양방향 관계 필수)
   - 인덱스: 부모.자식수+1 (예: 1.3)
   - **HO/HB: 템플릿에서 설정된 하위 일감 Offset 사용** (부모와 무관)
     - 하위 일감도 WorkTemplate에 별도 정의 (업무 단계 설정에서 관리)
     - 업데이트일 기준으로 독립 계산 (부모 날짜 상속 안 함)
   - 설명, JIRA 설명: 빈 문자열
   - 들여쓰기 적용

**구현 예시** (Round9 Q1: LLM 필수 참조):
```javascript
function addSubtask(parentEntry, newStageFromTemplate) {
  // 1. 새 하위 일감 생성
  const newSubtask = {
    id: generateId(),
    parentId: parentEntry.id,  // 단방향 참조
    stageId: newStageFromTemplate.id,
    stageName: newStageFromTemplate.name,
    startDateTime: calculateDateTimeFromStage(updateDate, newStageFromTemplate, holidays).startDateTime,
    endDateTime: calculateDateTimeFromStage(updateDate, newStageFromTemplate, holidays).endDateTime,
    description: '',
    jiraDescription: '',
    isManualEdit: false
  };

  // 2. 양방향 관계 설정 (필수!)
  if (!parentEntry.children) {
    parentEntry.children = [];
  }
  parentEntry.children.push(newSubtask);

  // 3. LocalStorage 저장
  saveCalculationResult(currentResult);
}
```

**↓ 버튼 동작 예시** (Q2: LLM 구현 시 참고):
```
업데이트일: 2026-02-10 (월)

부모 REGULAR:
- Offset=10 → 01/28(화) 09:00 ~ 02/01(토) 18:00

ㄴ 번역 (하위 일감):
- Offset=10, startTime=09:00, endTime=12:00
- 계산: 01/28(화) 09:00 ~ 01/28(화) 12:00
- 부모와 같은 시작일이지만, 시작/종료 시각이 다름

ㄴ 검수 (하위 일감):
- Offset=9, startTime=13:00, endTime=18:00
- 계산: 01/29(수) 13:00 ~ 01/29(수) 18:00
- 부모보다 1영업일 늦게 시작 (순차 작업)

⚠️ 주의: 하위 일감은 부모와 무관하게 업데이트일 기준으로 계산되므로,
템플릿 설정 시 Offset을 신중하게 설정해야 합니다.
```

**삭제 버튼** (Round10 Q3: 양방향 참조 정리):
- 각 엔트리 오른쪽에 [X] 버튼
- 클릭 → "정말 삭제하시겠습니까?" 확인 → 삭제
- 하위 일감이 있으면 → "하위 일감도 함께 삭제됩니다" 경고
- 삭제 후 인덱스 자동 재정렬

**삭제 로직** (Round10 Q3: LLM 구현 필수):
```javascript
// 부모 삭제 시 (cascade)
function deleteEntry(entry) {
  if (entry.children && entry.children.length > 0) {
    confirm("하위 일감도 함께 삭제됩니다");
    // children의 모든 id를 table2Entries에서 제거
    entry.children.forEach(child => {
      table2Entries = table2Entries.filter(e => e.id !== child.id);
    });
  }
  table2Entries = table2Entries.filter(e => e.id !== entry.id);
  saveCalculationResult(currentResult);
}

// 자식 삭제 시 (부모 children 배열 동기화)
function deleteSubtask(entry) {
  const parent = table2Entries.find(e => e.id === entry.parentId);
  if (parent && parent.children) {
    parent.children = parent.children.filter(c => c.id !== entry.id);
  }
  table2Entries = table2Entries.filter(e => e.id !== entry.id);
  saveCalculationResult(currentResult);
}
```

### 5.5. 테이블 3: `Int. {YY-MM-DD} 업데이트 일정표`

테이블 2와 동일한 구조 (§5.4 참조)

**차이점**: 없음 (동일한 형식, 데이터만 다름)

---

## 6. 간트 차트

### 6.1. 라이브러리

**선정**: Frappe Gantt (v1.0.3+)
**라이선스**: MIT
**의존성**: Zero dependencies
**크기**: ~50-80KB (minified)

자세한 조사: [talkwiththeuser/gantt-library-research.md](../talkwiththeuser/gantt-library-research.md)

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

### 6.3. X축 (시간축) - Q6: Frappe Gantt 기본 동작 따름

**단위**: 날짜 (Day 단위)
**범위**: 전체 업무 기간 (가장 빠른 시작일 ~ 가장 늦은 종료일)
**자동 조정**: ✅ (Frappe Gantt 기본 기능)

**시각 정보 표시** (Round11 Q1: 원본 데이터 참조 방식):
- **구현 방식**: `custom_popup_html`로 호버 시 툴팁에 시각 표시
- **형식**: `HH:MM ~ HH:MM` (24시간제)
- **코드 예시** (Round11 Q1: ScheduleEntry 원본 참조):
```javascript
// 간트 차트 생성 전에 원본 데이터 Map 생성
const entryMap = new Map(table1Entries.map(e => [e.id, e]));

// 간트 차트 옵션
const ganttOptions = {
  // ... 기타 옵션

  custom_popup_html: function(task) {
    // Round11 Q1: 원본 ScheduleEntry에서 시각 정보 조회 (Single Source of Truth)
    const entry = entryMap.get(task.id);
    if (!entry) {
      return `<div class="details-container"><h5>${task.name}</h5></div>`;
    }

    const startTime = entry.startDateTime.toLocaleTimeString('ko-KR', {
      hour: '2-digit', minute: '2-digit', hour12: false
    });
    const endTime = entry.endDateTime.toLocaleTimeString('ko-KR', {
      hour: '2-digit', minute: '2-digit', hour12: false
    });

    return `
      <div class="details-container">
        <h5>${task.name}</h5>
        <p>${startTime} ~ ${endTime}</p>
      </div>
    `;
  }
};

const gantt = new Gantt('#gantt-table1', tasks, ganttOptions);
```

**장점**:
- ✅ Single Source of Truth (entry.startDateTime만 관리)
- ✅ 데이터 동기화 불필요 (편집 시 자동 반영)
- ✅ 라이브러리 private 필드 의존 제거

### 6.4. Y축 (업무 목록) - Q3: 테이블 상태 동기화

**구성**: 테이블 엔트리 순서대로 표시
**계층 구조**: 들여쓰기로 표현 (Frappe Gantt 기본 지원)
**하위 일감 표시** (Q3):
- 테이블에서 ▲ 버튼으로 접힌 경우 → 간트 차트에서도 하위 일감 숨김
- 테이블에서 ▼ 버튼으로 펼친 경우 → 간트 차트에도 하위 일감 표시
- **테이블과 간트 차트의 표시 상태 동기화**

**동기화 구현 가이드** (Q3: LLM 구현 필수):
```javascript
// 1. 테이블 ▼/▲ 버튼 클릭 시 상태 관리
const collapsedParentIds = new Set(); // 접힌 부모 ID 집합

function toggleSubtasks(parentId) {
  if (collapsedParentIds.has(parentId)) {
    collapsedParentIds.delete(parentId); // 펼침
  } else {
    collapsedParentIds.add(parentId);    // 접음
  }
  // 테이블과 간트 차트 재렌더링
  renderTable();
  renderGanttChart();
}

// 2. 간트 차트 재생성 (필터링된 엔트리만 표시)
function renderGanttChart() {
  const visibleEntries = allEntries.filter(entry =>
    !entry.parentId || !collapsedParentIds.has(entry.parentId)
  );

  gantt = new Gantt('#gantt-table2', visibleEntries, {
    view_mode: 'Day',
    // ... 기타 옵션
  });
}
```

**예시** (펼침 상태):
```
REGULAR
  ㄴ 번역
  ㄴ 검수
EXTRA1
```

**예시** (접힘 상태):
```
REGULAR
EXTRA1
```

### 6.5. 의존성 화살표

**표시**: ✅ (Frappe Gantt `dependencies` 속성 사용)
**규칙**: 순차적 업무 간 자동 연결

**예시**:
```
정기 ───→ 1차 ───→ 2차
```

### 6.6. 상호작용

**모드**: 정적 표시 (Static)
**드래그 앤 드롭**: ❌ 비활성화
**툴팁**: ❌ (시각 라벨로 충분)
**클릭**: ❌ (상호작용 없음)

### 6.7. 구현 예시 (Round11 Q1: 원본 데이터 참조)

```javascript
import Gantt from 'frappe-gantt';

// Round11 Q1: 원본 ScheduleEntry Map 생성 (Single Source of Truth)
const entryMap = new Map(table1Entries.map(e => [e.id, e]));

// 테이블 엔트리를 Gantt 태스크로 변환
const tasks = table1Entries.map((entry, index) => ({
  id: entry.id,
  name: entry.stageName,
  start: entry.startDateTime,
  end: entry.endDateTime,
  progress: 100,
  // Round12 Q2: 실제 entry.id 참조 (Frappe Gantt 의존성 요구사항)
  dependencies: index > 0 ? table1Entries[index - 1].id : ''
}));

// 간트 차트 생성
const gantt = new Gantt('#gantt-table1', tasks, {
  view_mode: 'Day',
  date_format: 'YYYY-MM-DD',
  arrow_curve: 5,
  bar_height: 30,
  bar_corner_radius: 3,
  padding: 18,
  language: 'ko',

  // Round11 Q1: 툴팁에서 원본 데이터 참조
  custom_popup_html: function(task) {
    const entry = entryMap.get(task.id);
    if (!entry) {
      return `<div class="details-container"><h5>${task.name}</h5></div>`;
    }

    const startTime = entry.startDateTime.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const endTime = entry.endDateTime.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    return `
      <div class="details-container">
        <h5>${task.name}</h5>
        <p>${startTime} ~ ${endTime}</p>
      </div>
    `;
  }
});

```

---

## 7. 캘린더 뷰

### 7.1. 라이브러리

**선정**: FullCalendar (v6.1.0+)
**라이선스**: MIT
**의존성**: React (공식 래퍼 @fullcalendar/react 사용)
**크기**: ~200KB

**변경 이력**: Event Calendar에서 FullCalendar로 교체 (Phase 0 개발 중)
- 이유: React 통합 용이, 더 안정적인 API, 커뮤니티 지원 우수
- Event Calendar는 경량이나 React 통합 시 이벤트 핸들링 복잡도 증가

자세한 조사: [talkwiththeuser/calendar-library-research.md](../talkwiththeuser/calendar-library-research.md)

### 7.2. 형식

**뷰**: 월간 캘린더 (dayGridMonth)
**레이아웃**: 표준 달력 형식 (일~토)

```
      2026년 2월
일  월  화  수  목  금  토
                    1
 2   3   4   5   6   7   8
 9  10  11  12  13  14  15
...
```

### 7.3. 업무 표시

**형태**: 색상 바 (Bar)
**위치**: 날짜 칸 하단
**색상** (Round11: Azrael-PRD-Design.md §2.4 참조):
- 테이블1: Azrael Orange (#FF9800)
- 테이블2: Teal (#009688)
- 테이블3: Deep Purple (#673AB7)

**예시**:
```
┌─────┐
│ 10  │
│─────│ ← 주황 바 (테이블1 - 정기)
│─────│ ← 청록 바 (테이블2 - REGULAR)
│─────│ ← 보라 바 (테이블3 - REGULAR)
└─────┘
```

**호버 툴팁** (Q18: LLM 구현 방식):
- 색상 바에 마우스 올리면 툴팁 표시
- 내용: `{배치}: {HO} ~ {HB}`
- 예: `정기: 01/10 09:00 ~ 01/15 18:00`
- **구현**: 브라우저 기본 툴팁 사용 (`title` 속성)
  - Event Calendar의 `eventDidMount` 콜백에서 `info.el.title` 설정
  - 추가 라이브러리(Tippy.js 등) 불필요

### 7.4. 여러 업무 처리

**방식**: 세로로 쌓기 (Vertical Stacking)
**제한**: 없음 (칸 높이 자동 조정)

**예시** (한 날짜에 3개 업무):
```
┌─────┐
│ 10  │
│─────│ ← 업무 1
│─────│ ← 업무 2
│─────│ ← 업무 3
└─────┘
```

### 7.5. 네비게이션

**버튼**: [◀ 이전 달] [2026년 2월] [다음 달 ▶]
**기본 표시**: 업데이트일이 속한 달

### 7.6. 구현 예시

```javascript
import EventCalendar from '@event-calendar/core';
import DayGrid from '@event-calendar/day-grid';

// 모든 테이블 엔트리를 이벤트로 변환 (Round11: Design.md 색상 적용)
const events = [
  ...table1Entries.map(e => ({
    title: e.stageName,
    start: e.startDateTime,
    end: e.endDateTime,
    backgroundColor: '#FF9800', // Azrael Orange (Design.md §2.4)
    extendedProps: {
      description: `${e.stageName}: ${formatTime(e.startDateTime)} ~ ${formatTime(e.endDateTime)}`
    }
  })),
  ...table2Entries.map(e => ({
    title: e.stageName,
    start: e.startDateTime,
    end: e.endDateTime,
    backgroundColor: '#009688', // Teal (Design.md §2.4)
    extendedProps: {
      description: `${e.stageName}: ${formatTime(e.startDateTime)} ~ ${formatTime(e.endDateTime)}`
    }
  })),
  ...table3Entries.map(e => ({
    title: e.stageName,
    start: e.startDateTime,
    end: e.endDateTime,
    backgroundColor: '#673AB7', // Deep Purple (Design.md §2.4)
    extendedProps: {
      description: `${e.stageName}: ${formatTime(e.startDateTime)} ~ ${formatTime(e.endDateTime)}`
    }
  }))
];

// 캘린더 생성
const ec = new EventCalendar({
  target: document.getElementById('calendar'),
  props: {
    plugins: [DayGrid],
    options: {
      view: 'dayGridMonth',
      events: events,
      eventDidMount: function(info) {
        info.el.title = info.event.extendedProps.description; // 툴팁
      }
    }
  }
});
```

---

## 8. 이미지 복사

### 8.1. 트리거 UI

**위치**: 각 테이블, 간트 차트, 캘린더 옆
**형태**: 버튼 `[📋 이미지 복사]`

**배치 예시**:
```
[테이블 1]                [📋 이미지 복사]

[간트 차트 1]             [📋 이미지 복사]

[캘린더]                  [📋 이미지 복사]
```

### 8.2. 기술 (Q16: LLM 구현 시 정확한 스펙 적용)

**라이브러리**: html2canvas (v1.4.1+)
**라이선스**: MIT
**출력 형식**: PNG
**해상도**: 2배 (scale: 2)
- 원본 요소 크기의 2배로 렌더링
- Retina 디스플레이 대응 (고해상도 모니터에서도 선명)
- 예: 1000x500px 테이블 → 2000x1000px 이미지 생성

### 8.3. 동작

1. [이미지 복사] 버튼 클릭
2. 로딩 표시 ("이미지 생성 중...")
3. html2canvas로 해당 요소 캡처
4. Canvas → PNG Blob 변환 (scale: 2)
5. Clipboard API로 클립보드에 복사
6. 성공 메시지 ("이미지가 클립보드에 복사되었습니다")

### 8.4. 캡처 범위 (Q17: LLM 구현 시 정확히 구현)

**대상**: 버튼이 연결된 요소만 (테이블/차트/캘린더)
**스크롤 처리**:
- 캡처 전: 대상 요소의 `overflow` 스타일을 일시적으로 `visible`로 전환
- 캡처: 전체 콘텐츠 크기로 canvas 생성 (보이지 않는 부분 포함)
- 캡처 후: 원래 `overflow` 스타일 복원
- 스크롤바는 캡처하지 않음

### 8.5. 구현 예시 (Q9: Clipboard API fallback 추가)

```javascript
import html2canvas from 'html2canvas';

async function copyElementAsImage(elementId) {
  const element = document.getElementById(elementId);

  // Q9: Clipboard API 지원 여부 확인
  if (!navigator.clipboard || !navigator.clipboard.write) {
    const shouldDownload = confirm(
      '이 브라우저는 클립보드 복사를 지원하지 않습니다.\n이미지를 다운로드하시겠습니까?'
    );

    if (shouldDownload) {
      await downloadElementAsImage(elementId);
    }
    return;
  }

  try {
    showLoading('이미지 생성 중...');

    const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });

    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);

        hideLoading();
        showSuccess('이미지가 클립보드에 복사되었습니다');
      } catch (err) {
        hideLoading();

        // Q9: Clipboard 실패 시 다운로드 제안
        const shouldDownload = confirm(
          '클립보드 복사에 실패했습니다.\n이미지를 다운로드하시겠습니까?'
        );

        if (shouldDownload) {
          const url = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = url;
          a.download = `azrael-${elementId}-${Date.now()}.png`;
          a.click();
        }
      }
    }, 'image/png');

  } catch (err) {
    hideLoading();
    showError('이미지 생성에 실패했습니다: ' + err.message);
  }
}
```

---

## 9. 테이블 편집

### 9.1. 편집 가능한 셀

**테이블 1**: 설명, 담당자
**테이블 2/3**: 설명, JIRA 설명

**편집 불가**: #, 배치, 마감, 테이블 전달, HO, HB (계산값)

### 9.2. 편집 모드 (Q5: 충돌 방지)

**진입**: 편집 가능 셀 클릭 → 편집 모드
**종료**: 셀 밖 클릭 또는 Enter → 자동 저장

**편집 충돌 방지** (Q5: LLM 구현 필수):
- **동시 편집 제한**: 편집 중인 셀 하나씩만 활성화
- **다른 셀 클릭 시**:
  1. 현재 편집 중인 셀 저장 완료
  2. 저장 성공 후 새 셀 활성화
  3. 저장 실패 시: 에러 표시, 새 셀 활성화 안 함

### 9.3. 서식 지원 (Q5: LLM 구현 시 정확한 범위만 구현)

**지원**: Bold, Italic, 색상 3종
- **Bold**: `<b>텍스트</b>` 또는 `<strong>텍스트</strong>`
- **Italic**: `<i>텍스트</i>` 또는 `<em>텍스트</em>`
- **색상**: `<span style="color:red">텍스트</span>` (빨강, 파랑, 검정만)

**툴바**: 셀 선택 시 상단에 미니 툴바 표시
```
[B] [I] [빨강] [파랑] [검정]
```

**저장 형식**: HTML (Q5: Markdown 아님)
- `contentEditable`의 `innerHTML` 결과를 그대로 저장
- 렌더링 시 `innerHTML`로 직접 표시
- 구현 단순, Markdown 파서 불필요

### 9.4. Undo/Redo

**지원**: ❌ (불필요)
**대안**: 브라우저 새로고침 → 마지막 저장 상태 복원

### 9.5. 저장 (Round10 Q4: 롤백 추가)

**시점**: 셀 편집 종료 시 (셀 밖 클릭 또는 Enter)
**대상**: LocalStorage

```javascript
function saveCellEdit(entryId, field, value) {
  // Round10 Q4: 저장 실패 시 롤백
  const backup = JSON.stringify(currentResult);

  try {
    const entry = findEntryById(entryId);
    entry[field] = value;

    // LocalStorage 업데이트
    saveCalculationResult(currentResult);
    showSuccess('저장되었습니다', { duration: 1000 });

  } catch (err) {
    // 롤백
    currentResult = JSON.parse(backup);
    reviveDates(currentResult); // Date 복원 (Shared.md §5.1 참조)
    showError('저장 실패: ' + err.message);
  }
}
```

---

## 10. 설정 화면

### 10.1. 진입

**트리거**: 상단 메뉴 → [⚙️ 설정]

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

**탭**: 프로젝트

**UI**:
```
프로젝트 관리

┌────────┬──────────┬────────┬──────┐
│ 이름   │   타입   │ 설정   │ 삭제 │
├────────┼──────────┼────────┼──────┤
│ M4/GL  │    -     │ [편집] │ [삭제]│
│ NC/GL  │ 1주/2주  │ [편집] │ [삭제]│
│ FB/GL  │ CDN/APP  │ [편집] │ [삭제]│
└────────┴──────────┴────────┴──────┘

[+ 새 프로젝트 추가]
```

**[편집] 모달**:
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
│  [________________________]     │
│  ...                            │
│                                 │
│            [취소]  [저장]       │
└─────────────────────────────────┘
```

**[삭제] 동작** (Q21: 마지막 프로젝트 삭제 불가):
1. **검증**: 프로젝트가 1개만 남았으면 → "마지막 프로젝트는 삭제할 수 없습니다. 최소 1개 프로젝트 필요" 에러
2. 클릭 → "정말 삭제하시겠습니까? 모든 설정과 계산 결과가 사라집니다." 확인
3. 확인 → 프로젝트 삭제 (Shared.md §7.5 참조)
4. 프로젝트 목록 갱신
5. 삭제된 프로젝트가 현재 선택 프로젝트면 → 남은 첫 번째 프로젝트로 자동 전환

### 10.3. 업무 단계 관리

**탭**: 업무 단계

**UI** (Q3: 타입 선택 제거):
```
업무 단계 템플릿

프로젝트 선택: [M4/GL ▼]

┌───┬──────┬─────────┬──────────┬──────────┬────┬────┐
│ # │ 액션 │ Offset  │ 시작 시각│ 종료 시각│ 편집│ 삭제│
├───┼──────┼─────────┼──────────┼──────────┼────┼────┤
│ 1 │ 정기 │   10    │  09:00   │  18:00   │[편집]│[삭제]│
│ 2 │ 1차  │    5    │  09:00   │  18:00   │[편집]│[삭제]│
│ 3 │ 2차  │    2    │  09:00   │  18:00   │[편집]│[삭제]│
└───┴──────┴─────────┴──────────┴──────────┴────┴────┘

[+ 업무 단계 추가]
```

**⚠️ 하위 일감 템플릿** (Q13):
- 하위 일감(번역, 검수 등)도 템플릿에 별도 등록
- Offset은 업데이트일 기준 (부모 날짜와 무관)
- UI에서 계층 구조로 표시하거나, 별도 "하위 일감 템플릿" 섹션 제공

**[편집]/[추가] 모달**:
```
┌─────────────────────────────────┐
│  업무 단계 편집                  │
├─────────────────────────────────┤
│  액션 이름: [정기______]         │
│  역산할 영업일: [10]            │
│  기본 시작 시각: [09]:[00]      │
│  기본 종료 시각: [18]:[00]      │
│                                 │
│            [취소]  [저장]       │
└─────────────────────────────────┘
```

**[삭제] 동작**:
1. 클릭 → "정말 삭제하시겠습니까?" 확인
2. 확인 → 해당 WorkStage 삭제
3. 템플릿 업데이트 (LocalStorage)

### 10.4. 공휴일 관리

**탭**: 공휴일

**UI**:
```
공휴일 관리

[🔄 공휴일 불러오기 (API)]  올해: 2026년

┌────────────┬──────────┬────────┬──────┐
│   날짜     │   이름   │  출처  │ 삭제 │
├────────────┼──────────┼────────┼──────┤
│ 2026-01-01 │   신정   │  API   │  -   │
│ 2026-01-28 │   설날   │  API   │ [삭제]│
│ 2026-01-29 │   설날   │  API   │ [삭제]│
│ 2026-01-30 │   설날   │  API   │ [삭제]│
│ 2026-05-01 │ 근로자의 날│ 수동  │ [삭제]│
└────────────┴──────────┴────────┴──────┘

[+ 공휴일 수동 추가]
```

**[공휴일 불러오기] 동작** (Q4: 중복 호출 방지):
1. **중복 호출 체크**: 이미 현재년도 공휴일(isManual=false)이 있으면:
   - "이미 {년도}년 공휴일을 불러왔습니다. 다시 불러오시겠습니까?" 확인
   - 취소 → 중단, 확인 → 계속
2. 클릭 → 로딩 표시
3. **버튼 비활성화**: 텍스트 "불러오는 중...", isLoadingHolidays 플래그
4. 공공데이터포털 API 호출 (`solYear=현재년도`)
5. XML 파싱 → Holiday[] 변환 (Shared.md §4.4 참조)
6. LocalStorage 저장 (기존 API 공휴일 덮어쓰기, 수동 추가는 유지)
7. 테이블 갱신
8. 성공/실패 메시지 표시
9. **버튼 재활성화**: isLoadingHolidays 플래그 해제

**[수동 추가] 모달**:
```
┌─────────────────────────────────┐
│  공휴일 추가                     │
├─────────────────────────────────┤
│  날짜: [2026-05-01 📅]          │
│  이름: [근로자의 날____]         │
│                                 │
│            [취소]  [추가]       │
└─────────────────────────────────┘
```

**[삭제] 동작**:
1. 클릭 → "정말 삭제하시겠습니까?" 확인
2. 확인 → Holiday 삭제 (LocalStorage)
3. 테이블 갱신

---

## 11. 비기능 요구사항 (Phase 0 전용)

**브라우저**: Chrome, Edge, Firefox, Safari (최신 2개 버전)
**해상도**: 1280x720 이상
**네트워크**: 공휴일 API 호출 시만 필요 (온라인 선택적)
**성능**: 계산 < 1초, 렌더링 < 1초

자세한 내용은 **[Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)** §6 참조

---

## 12. 에러 처리 및 예외 상황

| 상황 | 처리 |
|------|------|
| 업데이트일 미입력 | "업데이트일을 입력해주세요" 에러 |
| 잘못된 날짜 형식 | "올바른 날짜 형식이 아닙니다" 에러 |
| 공휴일 API 실패 | "API 호출 실패. 수동 추가하거나 나중에 다시 시도하세요" 에러 |
| LocalStorage 용량 초과 | "저장 공간 부족. 브라우저 설정 확인 필요" 에러 |
| 이미지 복사 실패 | "이미지 복사 실패: {에러 메시지}" 에러 |

---

## 13. 참조 문서

- **Master**: [Azrael-PRD-Master.md](./Azrael-PRD-Master.md)
- **Shared**: [Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)
- **Phase 1**: [Azrael-PRD-Phase1.md](./Azrael-PRD-Phase1.md)
- **Phase 2**: [Azrael-PRD-Phase2.md](./Azrael-PRD-Phase2.md)
- **Phase 3**: [Azrael-PRD-Phase3.md](./Azrael-PRD-Phase3.md)

---

**문서 종료**
