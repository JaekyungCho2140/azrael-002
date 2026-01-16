---
name: prd-reference-management
description: PRD 업데이트 시 참조 무결성을 보장하고 중복을 제거하며 변경 이력을 관리합니다.
version: 1.0
parent_skill: prd-refinement
author: 재경
last_updated: 2025-11-19
---

# Reference Management - 참조 무결성 및 문서 관리

## 목적
사용자의 답변을 바탕으로 PRD를 업데이트하면서 참조 무결성을 보장하고, 중복을 제거하며, 변경 이력을 체계적으로 관리합니다.

## 사용 시기
- 사용자 답변을 받아 PRD를 업데이트할 때
- 참조 무결성을 체크해야 할 때
- 중복 내용을 발견했을 때
- 변경 이력을 기록해야 할 때
- 문서 간 동기화가 필요할 때

## 핵심 원칙

### 1. 단일 진실 공급원 (Single Source of Truth)
- 동일한 정보는 **단 한 곳**에만 정의
- 다른 곳에서는 **참조만** 사용
- 수정 시 한 곳만 변경하면 모든 곳에 반영

### 2. 명시적 참조
- 참조는 항상 명시적 링크로
- "앞서 언급한", "위의" 같은 모호한 표현 금지
- 형식: `[표시 텍스트](문서명.md#섹션-id)`

### 3. 참조 무결성
- 모든 참조 링크는 유효해야 함
- 섹션 삭제 시 모든 참조 업데이트
- 순환 참조 금지

### 4. 변경 이력 추적
- 모든 업데이트는 변경 이력에 기록
- 언제, 무엇을, 왜 변경했는지 명시
- 영향 받는 문서 추적

## Phase 3: 답변 통합 및 PRD 업데이트

### Step 1: 답변 요약 및 확인

사용자 답변을 받으면 먼저 올바르게 이해했는지 확인합니다.

**출력 형식**:
```markdown
## 답변 요약 및 확인

### 질문 1: [제목]
**답변**: [사용자 답변 요약]
**이해**: [Claude의 해석]

### 질문 2: [제목]
**답변**: [사용자 답변 요약]
**이해**: [Claude의 해석]

...

---
**확인**: 위 요약이 정확한가요? 
잘못 이해한 부분이 있으면 알려주세요.
```

**좋은 예시**:
```markdown
## 답변 요약 및 확인

### 질문 1: 입력 파일 형식
**답변**: "B. CSV + JSON 지원"
**이해**: Phase 1에서는 CSV와 JSON 두 가지 형식을 모두 지원합니다. 
Excel은 Phase 2로 미루고, 우선 이 두 형식에 집중합니다.

### 질문 2: 데이터 검증 시점
**답변**: "A. 파일 로드 즉시"
**이해**: 파일을 열자마자 전체 데이터를 검증하고, 
오류가 있으면 처리를 시작하지 않고 즉시 에러를 반환합니다.

### 질문 3: TranslationUnit 구조
**답변**: 
```json
{
  "id": "unit-001",
  "source_text": "마을로 돌아가시겠습니까?",
  "target_text": "Would you like to return to the village?",
  "source_language": "ko",
  "target_language": "en",
  "context": "NPC 대화",
  "status": "translated"
}
```
**이해**: TranslationUnit은 원본 텍스트, 번역 텍스트, 언어 정보, 
컨텍스트, 상태를 포함합니다. ID는 자동 생성됩니다.

---
**확인**: 제가 올바르게 이해했나요?
```

---

### Step 2: 업데이트 계획 수립

답변 확인 후, 어떤 문서의 어떤 섹션을 업데이트할지 계획합니다.

#### 단일 문서 프로젝트

```markdown
## PRD 업데이트 계획

### 섹션 1: [섹션명]
**작업**: [추가 / 수정 / 삭제]
**내용**: [변경할 내용 요약]
**이유**: [질문 N의 답변에 기반]

### 섹션 2: [섹션명]
**작업**: [추가 / 수정 / 삭제]
**내용**: [변경할 내용 요약]
**이유**: [질문 N의 답변에 기반]

### 새 섹션 추가
**위치**: [섹션 1과 섹션 2 사이]
**제목**: [새 섹션명]
**내용**: [추가할 내용 요약]
**이유**: [질문 N의 답변에 기반]

---
**확인**: 이 계획에 동의하시나요? 
수정이 필요하면 말씀해주세요.
```

#### 모듈화 프로젝트

```markdown
## PRD 업데이트 계획

### 1. PRD-Master.md (v1.2로 업데이트)

**추가할 내용**:
- 섹션 3.1 "기능 우선순위": Phase 1/2 구분 명시
  - 이유: 질문 1 답변 (CSV/JSON은 P1, Excel은 P2)

**수정할 내용**:
- 섹션 2 "아키텍처": 검증 단계 플로우 추가
  - 이유: 질문 2 답변 (파일 로드 즉시 검증)

---

### 2. PRD-Shared.md (v1.3으로 업데이트)

**추가할 섹션**:
- 섹션 1.2 "TranslationUnit 구조": 새로 정의
  - 내용: 질문 3의 JSON 예시를 바탕으로 구조 정의
  - 이유: 여러 Feature에서 사용되는 공통 데이터 구조

**추가할 항목**:
- 섹션 2 "용어집"에 "context" 정의 추가
  - 정의: "번역 텍스트가 사용되는 위치나 상황 (예: NPC 대화, UI 버튼)"

---

### 3. PRD-Feature-Import.md (v1.1로 업데이트)

**추가할 섹션**:
- 섹션 3.1 "지원 파일 형식": CSV, JSON 명시
  - 이유: 질문 1 답변

**참조 추가**:
- 섹션 4 "데이터 구조"에 TranslationUnit 참조 링크 추가
  - 형식: `[TranslationUnit 참조](PRD-Shared.md#translationunit-구조)`
  - 이유: Shared에 정의된 구조 사용

**삭제할 내용**:
- (만약 있다면) 임시로 작성된 데이터 구조 정의
  - 이유: Shared로 이동, 중복 제거

---

### 4. PRD-Feature-Translation.md (v1.1로 업데이트)

**참조 추가**:
- 섹션 2 "입출력"에 TranslationUnit 참조 링크 추가
  - 형식: `입력/출력은 [TranslationUnit](PRD-Shared.md#translationunit-구조)을 따릅니다.`

---

## 참조 무결성 체크리스트

업데이트 후 다음을 확인합니다:

- [ ] Shared로 이동된 내용이 원래 위치에서 제거되었는가?
- [ ] 이동된 내용을 참조하는 모든 문서가 업데이트되었는가?
- [ ] 참조 링크가 올바른 형식인가?
  - 형식: `[텍스트](문서명.md#섹션-id)`
- [ ] 참조된 섹션이 실제로 존재하는가?
- [ ] 순환 참조가 없는가?

---

**다음 단계**: 
위 계획대로 문서를 업데이트하고, 변경 이력을 기록하겠습니다.
```

---

### Step 3: PRD 업데이트 실행

계획에 따라 실제로 문서를 업데이트합니다.

#### 단일 문서 업데이트 예시

**Before**:
```markdown
## 3. 기능 요구사항

프로그램은 파일을 읽어서 처리한다.
```

**After**:
```markdown
## 3. 기능 요구사항

### 3.1 지원 파일 형식

Phase 1에서는 다음 형식을 지원합니다:
- **CSV** (Comma-Separated Values)
  - 인코딩: UTF-8
  - 구분자: 쉼표 (,)
  - 첫 행: 헤더 필수
  
- **JSON** (JavaScript Object Notation)
  - 인코딩: UTF-8
  - 구조: 객체 배열 형식
  - 예시:
    ```json
    [
      {"field1": "value1", "field2": "value2"},
      {"field1": "value3", "field2": "value4"}
    ]
    ```

Phase 2에서는 Excel (.xlsx) 형식을 추가할 예정입니다.

### 3.2 데이터 검증

파일 로드 즉시 전체 데이터를 검증합니다:
1. 파일 열기
2. 형식 검증 (CSV/JSON 문법 확인)
3. 필수 필드 확인
4. 데이터 타입 검증
5. 오류 발견 시 즉시 에러 반환 (처리 시작 안 함)

### 3.3 데이터 구조

처리되는 데이터는 다음 구조를 따릅니다:

```typescript
interface TranslationUnit {
  id: string;              // 고유 식별자 (자동 생성)
  source_text: string;     // 원본 텍스트
  target_text: string;     // 번역 텍스트
  source_language: string; // 원본 언어 코드 (ISO 639-1)
  target_language: string; // 타겟 언어 코드 (ISO 639-1)
  context?: string;        // 사용 컨텍스트 (선택적)
  status: 'draft' | 'translated' | 'reviewed' | 'approved';
}
```

**필드 설명**:
- `context`: 번역 텍스트가 사용되는 위치나 상황 (예: "NPC 대화", "UI 버튼")
- `status`: 번역 상태 진행도
```

---

#### 모듈화 프로젝트 업데이트 예시

**PRD-Shared.md 업데이트**:

```markdown
## 1. 데이터 모델

### 1.2 TranslationUnit

번역의 기본 단위입니다. 모든 Feature에서 이 구조를 사용합니다.

```typescript
interface TranslationUnit {
  id: string;              // 고유 식별자 (UUID 자동 생성)
  source_text: string;     // 원본 텍스트 (필수)
  target_text: string;     // 번역된 텍스트 (필수)
  source_language: string; // 원본 언어 코드 (ISO 639-1)
  target_language: string; // 타겟 언어 코드 (ISO 639-1)
  context?: string;        // 사용 컨텍스트 (선택적)
  status: TranslationStatus;
  created_at: timestamp;   // 생성 시각 (자동)
  updated_at: timestamp;   // 수정 시각 (자동)
}

type TranslationStatus = 
  | 'draft'       // 초안
  | 'translated'  // 번역 완료
  | 'reviewed'    // 검토 완료
  | 'approved';   // 승인됨
```

**사용처**:
- [PRD-Feature-Import.md](PRD-Feature-Import.md#데이터-구조)
- [PRD-Feature-Translation.md](PRD-Feature-Translation.md#입출력)
- [PRD-Feature-QA.md](PRD-Feature-QA.md#검증-대상)

**필드 상세**:
- `context`: 번역 텍스트가 사용되는 위치나 상황
  - 예시: "NPC 대화", "UI 버튼", "퀘스트 설명"
  - 같은 텍스트도 context에 따라 번역이 달라질 수 있음
```

**PRD-Feature-Import.md 업데이트**:

```markdown
## 3. 데이터 구조

### 3.1 입력 데이터

파싱된 입력 데이터는 [TranslationUnit](../PRD-Shared.md#12-translationunit) 구조를 따릅니다.

CSV 파일 예시:
```csv
id,source_text,target_text,source_language,target_language,context,status
unit-001,마을로 돌아가시겠습니까?,Would you like to return to the village?,ko,en,NPC 대화,translated
```

JSON 파일 예시:
```json
[
  {
    "id": "unit-001",
    "source_text": "마을로 돌아가시겠습니까?",
    "target_text": "Would you like to return to the village?",
    "source_language": "ko",
    "target_language": "en",
    "context": "NPC 대화",
    "status": "translated"
  }
]
```

### 3.2 데이터 매핑

| CSV 헤더 | JSON 키 | TranslationUnit 필드 | 필수 여부 |
|----------|---------|---------------------|----------|
| id | id | id | 선택 (없으면 자동 생성) |
| source_text | source_text | source_text | 필수 |
| target_text | target_text | target_text | 필수 |
| source_language | source_language | source_language | 필수 |
| target_language | target_language | target_language | 필수 |
| context | context | context | 선택 |
| status | status | status | 선택 (기본값: 'draft') |
```

---

### Step 4: 참조 무결성 보장

업데이트가 완료되면 참조 무결성을 확인합니다.

#### 체크리스트 실행

```markdown
## 참조 무결성 확인

### ✅ Shared로 이동된 내용 확인
- TranslationUnit 구조가 PRD-Shared.md에 정의됨
- PRD-Feature-Import.md에서 임시 정의 제거됨
- PRD-Feature-Translation.md에서 중복 정의 제거됨

### ✅ 참조 링크 추가 확인
- PRD-Feature-Import.md → PRD-Shared.md#translationunit (추가 완료)
- PRD-Feature-Translation.md → PRD-Shared.md#translationunit (추가 완료)
- PRD-Feature-QA.md → PRD-Shared.md#translationunit (추가 완료)

### ✅ 참조 링크 형식 확인
모든 링크가 다음 형식을 따름:
`[표시 텍스트](문서명.md#섹션-id)`

### ✅ 참조 대상 존재 확인
- PRD-Shared.md#translationunit 섹션 존재 ✓
- 모든 참조 링크가 유효함 ✓

### ✅ 순환 참조 확인
- PRD-Feature-Import → PRD-Shared (OK)
- PRD-Feature-Translation → PRD-Shared (OK)
- PRD-Shared → Feature 문서들 (역참조만, OK)
- 순환 참조 없음 ✓

### ✅ 용어집 업데이트 확인
- PRD-Shared.md 용어집에 "context" 정의 추가됨 ✓
```

---

### Step 5: 변경 이력 기록

모든 업데이트된 문서에 변경 이력을 기록합니다.

#### 변경 이력 형식

각 문서 상단에 다음 형식의 테이블을 유지합니다:

```markdown
## 변경 이력

| 날짜 | 버전 | 변경 내용 | 영향 문서 | 담당자 |
|------|------|-----------|-----------|--------|
| 2025-11-19 | 1.0 | 초안 작성 | - | 재경 |
| 2025-11-20 | 1.1 | TranslationUnit 구조 추가 | PRD-Feature-Import.md, PRD-Feature-Translation.md | 재경 |
| 2025-11-21 | 1.2 | 파일 형식 명세 상세화 | - | 재경 |
```

#### 변경 이력 작성 예시

**PRD-Shared.md**:
```markdown
## 변경 이력

| 날짜 | 버전 | 변경 내용 | 영향 문서 | 담당자 |
|------|------|-----------|-----------|--------|
| 2025-11-19 | 1.0 | 초안 작성 | - | 재경 |
| 2025-11-20 | 1.3 | TranslationUnit 구조 정의, context 용어 추가 | PRD-Feature-Import.md, PRD-Feature-Translation.md, PRD-Feature-QA.md | 재경 |
```

**PRD-Feature-Import.md**:
```markdown
## 변경 이력

| 날짜 | 버전 | 변경 내용 | 영향 문서 | 담당자 |
|------|------|-----------|-----------|--------|
| 2025-11-19 | 1.0 | 초안 작성 | - | 재경 |
| 2025-11-20 | 1.1 | 지원 파일 형식 명시 (CSV, JSON), TranslationUnit 참조 추가, 중복 정의 제거 | PRD-Shared.md | 재경 |
```

---

### Step 6: 변경사항 요약 제시

사용자에게 무엇이 변경되었는지 요약하여 보고합니다.

```markdown
## PRD 업데이트 완료

### 업데이트된 문서

#### 1. PRD-Shared.md (v1.0 → v1.3)
**추가된 내용**:
- 섹션 1.2: TranslationUnit 데이터 구조 정의
- 섹션 2: 용어집에 "context" 정의 추가

**사용처**: 3개 Feature 문서에서 참조

#### 2. PRD-Feature-Import.md (v1.0 → v1.1)
**추가된 내용**:
- 섹션 3.1: 지원 파일 형식 (CSV, JSON) 상세 명세
- 섹션 3.2: 데이터 검증 프로세스

**수정된 내용**:
- 섹션 3.3: TranslationUnit 중복 정의 제거, Shared 참조로 변경

**참조 추가**:
- PRD-Shared.md#translationunit로 연결

#### 3. PRD-Feature-Translation.md (v1.0 → v1.1)
**수정된 내용**:
- 섹션 2: 입출력 데이터 구조를 Shared 참조로 변경

**참조 추가**:
- PRD-Shared.md#translationunit로 연결

---

### 주요 개선사항

1. **중복 제거**: TranslationUnit이 Shared에 한 번만 정의됨
2. **참조 시스템**: 3개 문서가 Shared를 참조하도록 연결
3. **명확성 향상**: 파일 형식과 검증 프로세스가 구체화됨
4. **유지보수성**: 데이터 구조 수정 시 Shared만 변경하면 됨

### 참조 구조

```
PRD-Shared.md (TranslationUnit 정의)
     ↑
     ├─ PRD-Feature-Import.md (참조)
     ├─ PRD-Feature-Translation.md (참조)
     └─ PRD-Feature-QA.md (참조)
```

---

**다음 단계**: 
완성도를 평가하여 추가 라운드가 필요한지 결정하겠습니다.
```

## 중복 제거 패턴

### 패턴 1: 데이터 구조 중복

**문제 상황**:
```markdown
# PRD-Feature-A.md
데이터 구조: {id, name, value}

# PRD-Feature-B.md
데이터 구조: {id, name, value}
```

**해결 방법**:
```markdown
# PRD-Shared.md
## 데이터 모델
### CommonData
{id, name, value}

# PRD-Feature-A.md
데이터 구조는 [CommonData](PRD-Shared.md#commondata)를 따릅니다.

# PRD-Feature-B.md
데이터 구조는 [CommonData](PRD-Shared.md#commondata)를 따릅니다.
```

---

### 패턴 2: 에러 코드 중복

**문제 상황**:
```markdown
# PRD-Feature-A.md
에러: E001 (파일 없음), E002 (형식 오류)

# PRD-Feature-B.md
에러: E001 (파일 없음), E003 (네트워크 오류)
```

**해결 방법**:
```markdown
# PRD-Shared.md
## 공통 에러 코드
- E001: 파일 없음
- E002: 형식 오류
- E003: 네트워크 오류

# PRD-Feature-A.md
사용하는 에러 코드: [E001, E002](PRD-Shared.md#공통-에러-코드)

# PRD-Feature-B.md
사용하는 에러 코드: [E001, E003](PRD-Shared.md#공통-에러-코드)
```

---

### 패턴 3: 용어 정의 중복

**문제 상황**:
```markdown
# PRD-Feature-A.md
"Segment"는 번역의 최소 단위입니다.

# PRD-Feature-B.md
"Segment"는 번역 가능한 텍스트 조각입니다.
```

**해결 방법**:
```markdown
# PRD-Shared.md
## 용어집
**Segment**: 번역의 최소 단위. 일반적으로 하나의 문장이나 텍스트 블록.

# PRD-Feature-A.md
[Segment](PRD-Shared.md#용어집)를 처리합니다.

# PRD-Feature-B.md
[Segment](PRD-Shared.md#용어집) 단위로 분석합니다.
```

---

### 패턴 4: 설정 값 중복

**문제 상황**:
```markdown
# PRD-Feature-A.md
최대 파일 크기: 100MB

# PRD-Feature-B.md
최대 파일 크기: 100MB
```

**해결 방법**:
```markdown
# PRD-Shared.md
## 공통 설정
| 설정 | 값 | 설명 |
|------|-----|------|
| MAX_FILE_SIZE | 100MB | 최대 파일 크기 |

# PRD-Feature-A.md, PRD-Feature-B.md
파일 크기 제한은 [공통 설정](PRD-Shared.md#공통-설정)의 MAX_FILE_SIZE를 따릅니다.
```

## 참조 링크 작성 가이드

### 올바른 형식

```markdown
[표시 텍스트](문서명.md#섹션-id)
```

**구성 요소**:
- `표시 텍스트`: 사용자에게 보이는 텍스트
- `문서명.md`: 파일명 (확장자 포함)
- `#섹션-id`: 섹션 헤더의 ID (공백은 하이픈으로)

### 섹션 ID 생성 규칙

Markdown 헤더를 섹션 ID로 변환:

1. 소문자로 변환
2. 공백을 하이픈(-)으로 변환
3. 특수문자 제거
4. 한글은 그대로 유지

**예시**:
```markdown
## 1.2 TranslationUnit 구조
→ #12-translationunit-구조

## 공통 에러 코드
→ #공통-에러-코드

## Data Model
→ #data-model
```

### 좋은 예시 vs 나쁜 예시

**✅ 좋은 예시**:
```markdown
데이터 구조는 [TranslationUnit](PRD-Shared.md#translationunit-구조)을 따릅니다.

에러 처리는 [공통 에러 코드](PRD-Shared.md#공통-에러-코드)를 참조하세요.

[Segment](PRD-Shared.md#용어집)는 번역의 최소 단위입니다.
```

**❌ 나쁜 예시**:
```markdown
데이터 구조는 앞서 정의한 TranslationUnit을 따릅니다.
(→ 어디에 정의? 불명확)

에러 처리는 Shared 문서를 참조하세요.
(→ 어느 섹션? 불명확)

Segment는 번역의 최소 단위입니다. (Shared 문서 참조)
(→ 링크 없음, 참조 불가)

데이터 구조는 [여기](PRD-Shared.md)를 참조하세요.
(→ 섹션 ID 없음, 문서 전체를 봐야 함)
```

## 문서 동기화 체크리스트

정기적으로 (주 1회 또는 주요 변경 후) 다음을 확인합니다:

```markdown
## 문서 동기화 체크리스트

### Master 문서
- [ ] 모든 기능이 목록에 있는가?
- [ ] 문서 맵이 최신인가?
- [ ] 로드맵이 현실을 반영하는가?
- [ ] 버전 번호가 최신인가?

### Shared 문서
- [ ] 새로 추가된 공통 요소가 반영되었는가?
- [ ] 용어집이 최신인가?
- [ ] 모든 공통 데이터 구조가 정의되었는가?
- [ ] 사용처 목록이 정확한가?

### Feature 문서들
- [ ] Shared 요소를 올바르게 참조하는가?
- [ ] 중복 내용이 없는가?
- [ ] 의존성이 정확한가?
- [ ] 변경 이력이 기록되었는가?

### 참조 무결성
- [ ] 모든 참조 링크가 유효한가?
- [ ] 순환 참조가 없는가?
- [ ] 삭제된 섹션을 참조하는 곳이 없는가?
- [ ] 섹션명 변경 시 모든 참조가 업데이트되었는가?

### 변경 이력
- [ ] 모든 문서의 변경 이력이 최신인가?
- [ ] 버전 번호가 일관적인가?
- [ ] 영향 받는 문서가 명시되었는가?
```

## 자동화 도구 (선택적)

참조 무결성을 자동으로 체크하는 스크립트를 사용할 수 있습니다:

```bash
# 모든 문서에서 특정 섹션을 참조하는 곳 찾기
grep -r "PRD-Shared.md#translationunit" PRD-*.md

# 깨진 참조 링크 찾기 (섹션이 존재하지 않는 경우)
# (실제 구현 필요)

# 중복된 정의 찾기
# (특정 키워드가 여러 문서에 정의된 경우)
```

## 최종 변경사항 요약 템플릿

모든 업데이트가 완료되면 다음 형식으로 요약합니다:

```markdown
## PRD 업데이트 완료 - 라운드 N

### 📊 통계
- 업데이트된 문서: [N]개
- 추가된 섹션: [X]개
- 수정된 섹션: [Y]개
- 제거된 중복: [Z]개
- 새로운 참조 링크: [W]개

### 📝 문서별 변경사항

#### [문서명 1] (v1.X → v1.Y)
- ✅ [변경사항 1]
- ✅ [변경사항 2]
- ❌ [제거된 내용]

#### [문서명 2] (v1.X → v1.Y)
- ✅ [변경사항 1]
- 🔗 [새 참조 링크]

### 🔗 참조 구조 (업데이트됨)
```
[다이어그램]
```

### ✅ 참조 무결성 확인
- [X] 모든 체크 항목 통과

### 💡 주요 개선사항
1. [개선사항 1]
2. [개선사항 2]
3. [개선사항 3]

---
**다음 라운드 필요?**: [예 / 아니오]
**이유**: [남은 불명확 영역 / 충분히 명확함]
```

---

**다음 단계**: 
메인 스킬(SKILL.md)의 Phase 4로 돌아가 완성도를 평가하고, 추가 라운드가 필요한지 결정합니다.
