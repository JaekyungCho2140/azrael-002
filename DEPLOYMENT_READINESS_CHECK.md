# Phase 0.5 & Phase 1 배포 전 점검 보고서

**작성일**: 2026-01-16
**점검자**: Claude Code
**대상**: Phase 0.5 & Phase 1 구현 코드

---

## ✅ 완료된 구현

### Phase 0.5 (100% 코드 완료)

#### 1. Supabase 스키마
- ✅ 마이그레이션 파일 작성 완료
- ✅ order 타입 변경 (INTEGER → DECIMAL 5,1)
- ✅ jira_summary_template 컬럼 추가
- ✅ projects JIRA 컬럼 3개 추가
- **배포 필요**: `supabase db push`

#### 2. TypeScript 인터페이스
- ✅ 모든 인터페이스 확장 완료
- ✅ 타입 체크 통과
- ✅ 빌드 성공

#### 3. UI 구현
- ✅ 테이블 "JIRA 담당자" 컬럼 (편집 가능)
- ✅ 설정: 업무 단계 편집 모달 (하위 일감 템플릿 아코디언)
- ✅ 설정: 프로젝트 편집 모달 (JIRA 필드 3개)
- ✅ 모든 UI 렌더링 완료

#### 4. API 레이어
- ✅ Supabase API 훅 수정 (jira_summary_template 포함)
- ✅ Projects/Templates API 수정 완료

---

### Phase 1 (코어 기능 완료, 통합 부분 미완)

#### 1. JIRA 인증 및 설정
- ✅ JiraConfig 인터페이스
- ✅ JIRA 연동 설정 탭 UI
- ✅ API Token 입력/표시/숨김
- ✅ 연동 테스트 기능 (/rest/api/3/myself 호출)
- ✅ LocalStorage 저장
- ✅ 연동 상태 표시

#### 2. JIRA Summary 템플릿 시스템
- ✅ 변수 치환 엔진 (applyTemplate)
- ✅ 템플릿 검증 (validateTemplate)
- ✅ Summary 생성 (getSummary, fallback 포함)
- ✅ 날짜 형식 변환 (YYMMDD, MMDD)

#### 3. UI 구현
- ✅ 메인 화면 JIRA 버튼 2개 (생성, 업데이트)
- ✅ 버튼 활성화 조건
- ✅ JIRA 미리보기 모달 (JiraPreviewModal)
- ✅ 미리보기 데이터 생성 로직

#### 4. Supabase Edge Functions
- ✅ jira-create 함수 작성 (Epic/Task/Subtask 생성, 롤백)
- ✅ jira-update 함수 작성 (날짜 업데이트, 신규 생성)
- ✅ Rate Limit 처리 (100ms 간격)
- **배포 필요**: `supabase functions deploy`

---

## ⚠️ 미구현 영역 (배포 후 완성 필요)

### 1. JIRA 생성 플로우 - 핵심 로직 미완성

**위치**: `src/components/MainScreen.tsx:482` - `handleConfirmJiraCreate`

**현재 상태**:
```typescript
const handleConfirmJiraCreate = async () => {
  setIsCreatingJira(true);
  try {
    // TODO: Edge Function 호출하여 JIRA 생성
    // TODO: Supabase에 매핑 저장
    await new Promise(resolve => setTimeout(resolve, 1000)); // 임시 딜레이
    alert('JIRA 생성 기능은 Supabase Edge Functions 배포 후 사용 가능합니다.');
    setJiraPreviewOpen(false);
  } catch (err: any) {
    alert(`JIRA 생성 실패: ${err.message}`);
  } finally {
    setIsCreatingJira(false);
  }
};
```

**미구현 항목**:
- ❌ Epic 중복 체크 (Supabase jira_epic_mappings 조회)
- ❌ Supabase 선삽입 (동시 생성 방지)
- ❌ Edge Function 호출 (POST /functions/v1/jira-create)
- ❌ Supabase 매핑 저장 (jira_epic_mappings, jira_task_mappings)
- ❌ 성공 시 JIRA 링크 표시
- ❌ 실패 시 롤백 및 에러 처리

**예상 소요 시간**: 2-3시간

---

### 2. JIRA 업데이트 플로우 - 완전 미구현

**위치**: `src/components/MainScreen.tsx:557` - JIRA 업데이트 버튼

**현재 상태**:
```typescript
<Button
  onClick={() => alert('JIRA 업데이트 기능 구현 중...')}
  disabled={!hasEpicMapping}
  variant="secondary"
  title={!hasEpicMapping ? '먼저 JIRA 생성 필요' : ''}
>
  🔄 JIRA 업데이트
</Button>
```

**미구현 항목**:
- ❌ Epic 조회 (Supabase jira_epic_mappings)
- ❌ Task 매칭 (stageId 기반, jira_task_mappings)
- ❌ 미리보기 모달 (변경사항 표시)
- ❌ Edge Function 호출 (POST /functions/v1/jira-update)
- ❌ Supabase 매핑 업데이트
- ❌ 성공/실패 처리

**예상 소요 시간**: 3-4시간

---

### 3. Epic 중복 체크 - 미구현

**위치**: `src/components/MainScreen.tsx:388` - `handleCreateJira`

**현재 상태**:
```typescript
// TODO: Supabase에서 Epic 중복 체크
// 일단 미리보기 모달만 열기
```

**필요한 구현**:
```typescript
// Supabase에서 Epic 매핑 조회
const { data: existingEpic } = await supabase
  .from('jira_epic_mappings')
  .select('*')
  .eq('project_id', currentProject.id)
  .eq('update_date', calculationResult.updateDate.toISOString().split('T')[0])
  .single();

if (existingEpic) {
  alert('이미 생성된 Epic이 있습니다. [JIRA 업데이트]를 사용하세요.');
  return;
}
```

**예상 소요 시간**: 30분

---

### 4. Epic 존재 여부 확인 - 미구현

**위치**: `src/components/MainScreen.tsx:63` - useEffect

**현재 상태**:
```typescript
// TODO: Epic 매핑 확인은 Supabase 조회 필요 (나중에 구현)
setHasEpicMapping(false);
```

**필요한 구현**:
```typescript
// Supabase에서 Epic 매핑 확인
const checkEpicMapping = async () => {
  if (!calculationResult) {
    setHasEpicMapping(false);
    return;
  }

  const { data } = await supabase
    .from('jira_epic_mappings')
    .select('epic_id')
    .eq('project_id', currentProject.id)
    .eq('update_date', calculationResult.updateDate.toISOString().split('T')[0])
    .single();

  setHasEpicMapping(!!data);
};

checkEpicMapping();
```

**예상 소요 시간**: 30분

---

### 5. 에러 처리 - 부분 구현

#### 완료된 에러 처리:
- ✅ JIRA 설정 없음 (alert)
- ✅ 프로젝트 키 없음 (alert)
- ✅ JIRA 연동 테스트 실패 (alert + 상태 표시)

#### 미구현 에러 처리:
- ❌ Epic 중복 (alert만, 상세 안내 없음)
- ❌ Edge Function 타임아웃 (50초)
- ❌ Supabase 저장 실패 재시도 (Exponential Backoff)
- ❌ 롤백 실패 시 Issue Key 목록 표시
- ❌ Epic 수동 삭제됨 (404 처리)
- ❌ Rate Limit 429 에러

**예상 소요 시간**: 2-3시간

---

### 6. 템플릿 검증 - 부분 구현

**위치**: `src/components/StageEditModal.tsx:141` - validateTemplate

**현재 상태**: ✅ 함수 구현 완료

**미구현**:
- ❌ UI에 실시간 검증 표시 (빨간 밑줄)
- ❌ 유효하지 않은 변수 개별 표시

**현재**: alert으로 에러만 표시
**목표**: 실시간 빨간 밑줄 + 변수별 에러 메시지

**예상 소요 시간**: 1-2시간

---

## 🔍 MOCK/임시 구현 영역

### 1. JIRA 생성 확인 버튼
**파일**: `src/components/MainScreen.tsx:482`
```typescript
// TODO: Edge Function 호출하여 JIRA 생성
// TODO: Supabase에 매핑 저장
await new Promise(resolve => setTimeout(resolve, 1000)); // 임시 딜레이
alert('JIRA 생성 기능은 Supabase Edge Functions 배포 후 사용 가능합니다.');
```
**상태**: 🟡 **MOCK** - 임시 딜레이 + alert
**영향**: JIRA 생성 불가 (미리보기만 가능)

### 2. JIRA 업데이트 버튼
**파일**: `src/components/MainScreen.tsx:557`
```typescript
onClick={() => alert('JIRA 업데이트 기능 구현 중...')}
```
**상태**: 🟡 **MOCK** - alert만 표시
**영향**: JIRA 업데이트 불가

### 3. Epic 존재 여부 확인
**파일**: `src/components/MainScreen.tsx:63`
```typescript
// TODO: Epic 매핑 확인은 Supabase 조회 필요 (나중에 구현)
setHasEpicMapping(false);
```
**상태**: 🟡 **MOCK** - 항상 false
**영향**: [JIRA 업데이트] 버튼 항상 비활성화

---

## 📋 배포 전 필수 구현 목록

### 🔴 Critical (JIRA 생성 기능을 위해 필수)

1. **Epic 중복 체크** (30분)
   - Supabase jira_epic_mappings 조회
   - 기존 Epic 있으면 에러

2. **Edge Function 호출** (1시간)
   - POST /functions/v1/jira-create
   - 요청 데이터 생성 (Epic, Tasks, Subtasks)
   - 응답 처리

3. **Supabase 매핑 저장** (1시간)
   - jira_epic_mappings INSERT
   - jira_task_mappings INSERT (모든 Task/Subtask)
   - 실패 시 롤백

4. **성공/실패 UI** (30분)
   - 성공: JIRA Epic 링크 표시
   - 실패: 에러 메시지 + 롤백 정보

**총 소요 시간**: 3시간

---

### 🟡 Important (JIRA 업데이트 기능을 위해 필요)

5. **Epic 존재 여부 확인** (30분)
   - useEffect에서 Supabase 조회
   - hasEpicMapping 상태 업데이트

6. **JIRA 업데이트 핸들러** (2시간)
   - Epic 조회
   - Task 매칭 (stageId 기반)
   - 미리보기 모달
   - Edge Function 호출

7. **Task 매칭 로직** (1시간)
   - jira_task_mappings 조회
   - 업데이트 vs 신규 생성 구분

**총 소요 시간**: 3.5시간

---

### 🟢 Nice to Have (품질 향상)

8. **실시간 템플릿 검증** (1-2시간)
   - 입력 중 유효하지 않은 변수 감지
   - 빨간 밑줄 표시

9. **고급 에러 처리** (2-3시간)
   - Edge Function 타임아웃 (50초)
   - Supabase 저장 재시도 (Exponential Backoff)
   - 롤백 실패 시 Issue Key 목록
   - Epic 수동 삭제 감지

10. **테스트 수정** (1시간)
    - businessDays.test.ts 실패 수정 (1개)

**총 소요 시간**: 4-6시간

---

## 🎯 배포 전략

### Option 1: 최소 기능 배포 (권장)
**시간**: 추가 3시간
**범위**: Critical 항목만 (Epic 중복 체크, Edge Function 호출, Supabase 저장)
**결과**: JIRA 생성 기능 작동 (업데이트는 나중에)

### Option 2: 완전 기능 배포
**시간**: 추가 6.5시간
**범위**: Critical + Important
**결과**: JIRA 생성 + 업데이트 모두 작동

### Option 3: 현재 상태 배포
**시간**: 0시간 (즉시)
**범위**: UI만 (JIRA 기능은 MOCK)
**결과**:
- Phase 0.5 기능 모두 사용 가능 (하위 일감 템플릿, JIRA 담당자 컬럼)
- Phase 1은 UI만 (JIRA 생성 버튼 클릭 시 "배포 후 사용 가능" 메시지)

---

## 🔍 상세 점검 결과

### 1. MainScreen.tsx

**Line 388-390**:
```typescript
// TODO: Supabase에서 Epic 중복 체크
// 일단 미리보기 모달만 열기
```
**상태**: 🟡 TODO 주석
**영향**: Epic 중복 생성 가능 (데이터 무결성 문제)
**권장**: Critical - 반드시 구현

---

**Line 391**:
```typescript
// const jiraConfig = JSON.parse(jiraConfigStr);  // TODO: Edge Function 호출 시 사용
```
**상태**: 🟡 주석 처리
**영향**: Edge Function 호출 시 인증 정보 필요
**권장**: Critical - Edge Function 호출 시 주석 해제 필요

---

**Line 482-494**:
```typescript
const handleConfirmJiraCreate = async () => {
  setIsCreatingJira(true);
  try {
    // TODO: Edge Function 호출하여 JIRA 생성
    // TODO: Supabase에 매핑 저장
    await new Promise(resolve => setTimeout(resolve, 1000)); // 임시 딜레이
    alert('JIRA 생성 기능은 Supabase Edge Functions 배포 후 사용 가능합니다.');
    setJiraPreviewOpen(false);
  } catch (err: any) {
    alert(`JIRA 생성 실패: ${err.message}`);
  } finally {
    setIsCreatingJira(false);
  }
};
```
**상태**: 🔴 **완전 MOCK** - 1초 딜레이 후 alert만 표시
**영향**: JIRA 생성 기능 작동하지 않음
**권장**: Critical - 전체 로직 구현 필요

---

**Line 557-563**:
```typescript
<Button
  onClick={() => alert('JIRA 업데이트 기능 구현 중...')}
  disabled={!hasEpicMapping}
  variant="secondary"
  title={!hasEpicMapping ? '먼저 JIRA 생성 필요' : ''}
>
  🔄 JIRA 업데이트
</Button>
```
**상태**: 🔴 **완전 MOCK** - alert만 표시
**영향**: JIRA 업데이트 기능 작동하지 않음
**권장**: Important - JIRA 생성 후 구현

---

**Line 63**:
```typescript
// TODO: Epic 매핑 확인은 Supabase 조회 필요 (나중에 구현)
setHasEpicMapping(false);
```
**상태**: 🟡 하드코딩 - 항상 false
**영향**: [JIRA 업데이트] 버튼 항상 비활성화
**권장**: Important - 실제 조회 로직 추가

---

### 2. Edge Functions

**jira-create/index.ts**:
- ✅ 완전 구현 (Epic 생성, Tasks 생성, 롤백)
- ⚠️ **미테스트** - 로컬/프로덕션 테스트 필요
- ⚠️ **JIRA 필드 검증 필요** - customfield_10011 (Epic Name)이 Wemade JIRA에 존재하는지 확인

**jira-update/index.ts**:
- ✅ 기본 구조 완성
- ⚠️ **미테스트** - 로컬/프로덕션 테스트 필요

---

### 3. Supabase API 레이어

**필요한 API 함수 (아직 미작성)**:

1. **Epic 매핑 조회**:
```typescript
// src/lib/api/jira.ts (새 파일 필요)
export async function fetchEpicMapping(
  projectId: string,
  updateDate: Date
): Promise<EpicMapping | null>
```

2. **Epic 매핑 생성**:
```typescript
export async function createEpicMapping(mapping: EpicMapping): Promise<void>
```

3. **Task 매핑 조회**:
```typescript
export async function fetchTaskMappings(epicMappingId: string): Promise<TaskMapping[]>
```

4. **Task 매핑 생성**:
```typescript
export async function createTaskMappings(mappings: TaskMapping[]): Promise<void>
```

**예상 소요 시간**: 1-2시간

---

## 📊 완성도 평가

### Phase 0.5
**코드 완성도**: 100% ✅
**테스트 완성도**: 80% (Supabase 배포 후 통합 테스트 필요)
**배포 준비도**: 95% (마이그레이션 배포만 필요)

### Phase 1
**코드 완성도**: 70%
**핵심 로직**: 40% (UI 완료, 백엔드 통합 미완)
**테스트 완성도**: 0% (배포 및 구현 완성 후)
**배포 준비도**: 50% (Edge Functions 작성, 통합 로직 미완)

---

## ⚡ 우선순위별 구현 계획

### 🔴 Phase 1A: 최소 동작 가능 (3시간)
1. Epic 중복 체크 (30분)
2. Supabase API 레이어 (1.5시간)
3. JIRA 생성 플로우 완성 (1시간)

**결과**: JIRA 생성 기능 작동

### 🟡 Phase 1B: 완전 기능 (3.5시간)
4. Epic 존재 여부 확인 (30분)
5. JIRA 업데이트 핸들러 (2시간)
6. Task 매칭 로직 (1시간)

**결과**: JIRA 생성 + 업데이트 모두 작동

### 🟢 Phase 1C: 품질 향상 (4-6시간)
7. 실시간 템플릿 검증
8. 고급 에러 처리
9. 테스트 수정

**결과**: 프로덕션 품질

---

## 🚦 배포 게이트

### Gate 1: Supabase 배포 ✅ 준비 완료
- ✅ 마이그레이션 파일 작성
- ✅ RLS 정책 작성
- ✅ 트리거 작성
- ⏳ 배포 명령어 실행 필요

### Gate 2: Edge Functions 배포 ✅ 준비 완료
- ✅ 함수 코드 작성
- ✅ CORS 처리
- ✅ Rate Limit 처리
- ⏳ 환경 변수 설정 필요
- ⏳ 배포 명령어 실행 필요

### Gate 3: JIRA 생성 기능 ❌ 미완성
- ✅ 미리보기 모달
- ❌ Epic 중복 체크
- ❌ Edge Function 호출
- ❌ Supabase 저장

### Gate 4: JIRA 업데이트 기능 ❌ 미구현
- ❌ 전체 미구현

---

## 📝 권장사항

### 즉시 배포 가능 (Option 3)
**장점**:
- Phase 0.5 기능 모두 사용 가능 (하위 일감 템플릿 등)
- UI 테스트 가능
- 단계적 출시

**단점**:
- JIRA 기능은 사용 불가
- 사용자가 버튼을 눌러도 "구현 중" 메시지만 표시

---

### 최소 JIRA 기능 배포 (Option 1) - 권장
**소요 시간**: 3시간 추가 개발
**장점**:
- JIRA 생성 기능 작동
- 핵심 가치 전달
- 빠른 피드백 수집

**단점**:
- JIRA 업데이트는 수동으로 해야 함

---

### 완전 기능 배포 (Option 2)
**소요 시간**: 6.5시간 추가 개발
**장점**:
- 모든 JIRA 기능 작동
- 완전한 사용자 경험

**단점**:
- 배포 시간 지연

---

## 🎯 결론

**현재 상태**:
- **Phase 0.5**: 배포 준비 완료 (100%)
- **Phase 1**: 코드 70% 완성, 핵심 통합 로직 30% 남음

**권장 조치**:
1. **즉시 배포** (Supabase + Edge Functions) → Phase 0.5 기능 활성화
2. **3시간 추가 개발** → JIRA 생성 기능 완성
3. **사용자 피드백 수집** 후 JIRA 업데이트 기능 완성

**리스크**:
- MOCK 영역 3곳이 사용자에게 노출됨 (배포 시 주의)
- Edge Functions 미테스트 (JIRA API 호출 실패 가능성)
- 에러 처리 미완성 (사용자 경험 저하)

---

**최종 권고**: Option 1 (최소 JIRA 기능) 구현 후 배포
