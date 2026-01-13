# Azrael PRD - Phase 1: JIRA 연동 (개요)

**작성일**: 2026-01-09
**버전**: 0.1 (개요)
**참조**: [Azrael-PRD-Master.md](./Azrael-PRD-Master.md) | [Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md) | [Azrael-PRD-Phase0.md](./Azrael-PRD-Phase0.md)

---

## 📋 문서 상태

**현재 상태**: 개요만 작성 (Phase 0 완료 후 상세 설계 예정)
**상세 설계 시점**: Phase 0 사용자 피드백 반영 후

---

## 1. Phase 1 목적

Phase 0에서 계산된 일정 테이블 (Ext./Int.)을 기반으로 **JIRA 일감을 자동 생성**합니다.

**주요 가치**:
- 수동 JIRA 일감 생성 시간 90% 절감
- 일정 변경 시 JIRA 일감 일괄 업데이트 가능
- 오타 및 누락 방지

---

## 2. 기능 개요

### 2.1. JIRA 일감 생성

**입력**: 테이블 2 (Ext.) 또는 테이블 3 (Int.)의 엔트리
**출력**: JIRA Epic/Task/Subtask 계층 구조

**매핑**:
```
업데이트 전체
  ↓ Epic
REGULAR (부모)
  ↓ Task
  ├─ 번역 (하위 일감) ↓ Subtask
  └─ 검수 (하위 일감) ↓ Subtask
EXTRA1 (부모)
  ↓ Task
  └─ ...
```

### 2.2. 필드 매핑

| Azrael 필드 | JIRA 필드 | 비고 |
|------------|-----------|------|
| 업데이트일 | Epic 이름 | 예: "26-02-10 업데이트" |
| 배치 | Task/Subtask 이름 | 예: "REGULAR", "번역" |
| HO (시작일시) | Start Date | JIRA 날짜 형식 변환 |
| HB (종료일시) | Due Date | JIRA 날짜 형식 변환 |
| 설명 | Description (일부) | 사용자 입력 |
| JIRA 설명 | Description (추가) | 사용자 입력 |

### 2.3. JIRA 인증

**방법**: JIRA API Token (OAuth 또는 Personal Access Token)
**저장**: `.env` 또는 설정 화면에서 입력

**필요 정보**:
- JIRA 서버 URL (예: `https://company.atlassian.net`)
- 사용자 이메일
- API Token

### 2.4. UI 플로우

```
[테이블 2 또는 3]
  ↓
[JIRA 일감 생성] 버튼
  ↓
[JIRA 설정 확인] (최초 1회)
  ├─ JIRA URL 입력
  ├─ API Token 입력
  └─ 프로젝트 키 선택 (예: L10N)
  ↓
[일감 생성 미리보기]
  ├─ Epic: 26-02-10 업데이트
  ├─ Task: REGULAR
  │   ├─ Subtask: 번역
  │   └─ Subtask: 검수
  └─ ...
  ↓
[생성] 또는 [취소]
  ↓
JIRA API 호출 → 일감 생성
  ↓
[성공] → 생성된 JIRA 링크 표시
```

---

## 3. 기술 스택 (예상)

| 기술 | 용도 | 비고 |
|------|------|------|
| JIRA REST API v3 | 일감 CRUD | https://developer.atlassian.com/cloud/jira/platform/rest/v3/ |
| Axios 또는 Fetch | HTTP 클라이언트 | JIRA API 호출 |

---

## 4. 미결정 사항 (Phase 0 완료 후 결정)

| 항목 | 옵션 | 결정 시점 |
|------|------|----------|
| JIRA 프로젝트 키 관리 | 프로젝트별 설정 vs 전역 설정 | Phase 0 피드백 후 |
| 기존 일감 업데이트 vs 신규 생성 | 덮어쓰기 vs 신규 Epic 생성 | Phase 0 피드백 후 |
| 일감 상태 설정 | To Do, In Progress 등 기본 상태 | Phase 0 피드백 후 |
| 담당자 자동 할당 | 가능 여부 및 규칙 | Phase 0 피드백 후 |
| 레이블/컴포넌트 설정 | 자동 태깅 규칙 | Phase 0 피드백 후 |

---

## 5. 예상 사용자 스토리

**스토리 1**: JIRA 일감 자동 생성
- **As a** L10n 팀원
- **I want to** 계산된 일정을 JIRA 일감으로 자동 생성하고 싶다
- **So that** 수동 입력 시간을 절약하고 오타를 방지할 수 있다

**스토리 2**: 일정 변경 시 JIRA 일감 업데이트
- **As a** L10n 팀장
- **I want to** 업데이트일 변경 시 기존 JIRA 일감을 자동 업데이트하고 싶다
- **So that** 일정 변경 사항을 빠르게 반영할 수 있다

---

## 6. 성공 지표 (예상)

- [ ] JIRA 일감 생성 시간 90% 단축 (수동 30분 → 자동 3분)
- [ ] 일감 생성 오류율 0% 달성
- [ ] 4인 모두 Phase 1 기능 사용

---

## 7. 다음 단계

1. **Phase 0 완료 및 사용자 피드백 수집**
2. **Azrael 배포 URL 확정** (Q8: Phase 2/3 이메일/슬랙에서 링크 참조 필요)
3. **JIRA 사용 패턴 분석**: 실제 L10n팀의 JIRA 프로젝트 구조 파악
4. **API 명세 작성**: JIRA REST API 호출 시퀀스 및 에러 처리
5. **UI 목업**: JIRA 설정 및 일감 생성 미리보기 화면
6. **Phase 1 상세 PRD 작성**

---

## 8. 참조 문서

- **Master**: [Azrael-PRD-Master.md](./Azrael-PRD-Master.md)
- **Shared**: [Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)
- **Phase 0**: [Azrael-PRD-Phase0.md](./Azrael-PRD-Phase0.md)
- **Phase 2**: [Azrael-PRD-Phase2.md](./Azrael-PRD-Phase2.md)
- **Phase 3**: [Azrael-PRD-Phase3.md](./Azrael-PRD-Phase3.md)

---

**문서 종료**
