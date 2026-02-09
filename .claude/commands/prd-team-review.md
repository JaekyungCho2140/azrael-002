# PRD Team Review - 에이전트 팀 기반 PRD 검증

## 사용법
```
/prd-team-review <PRD-파일-경로>
```

예시: `/prd-team-review prd/Azrael-PRD-Phase3.md`

---

## 개요

에이전트 팀을 구성하여 PRD를 다각도로 검증합니다. 이 스킬은 다음 4가지 기준으로 PRD를 검증합니다:

1. **코드베이스 정합성**: 기존 코드베이스와 상충하는 요구사항은 없는가?
2. **내부 논리 일관성**: PRD 문서 내에서 논리적으로 충돌은 없는지?
3. **LLM 구현 명확성**: LLM(Claude Code)이 자의적/임의적으로 해석할 여지는 없는지?
4. **현실적 구현 가능성**: 이 기능이 현실적으로 구현 가능한가?

---

## 실행 절차

### Stage 0: 사전 컨텍스트 수집 (Lead, 순차)

Lead가 직접 수행합니다. 팀 생성 전에 코드베이스의 핵심 컨텍스트를 수집합니다:

1. **DB 마이그레이션 현황**: `supabase/migrations/` 파일 목록 → 마이그레이션 번호 확인
2. **컴포넌트 구조**: `src/components/` 디렉토리 구조 → 현재 컴포넌트 목록, settings/ 탭 구조
3. **API 패턴**: `src/lib/api/` 파일 목록 → 기존 API 레이어 패턴
4. **Edge Function 패턴**: `supabase/functions/` 구조 → 기존 CORS, 에러 처리 패턴
5. **타입 정의**: `src/types/` → 기존 인터페이스 구조
6. **상수**: `src/constants.ts` → 기존 상수 패턴
7. **참조 PRD**: Shared PRD, Master PRD → Phase 3과의 교차 참조점

수집된 컨텍스트는 각 리뷰어의 spawn prompt에 포함합니다.

### Stage 1: 팀 생성 및 태스크 배정 (Lead, 순차)

```
TeamCreate: prd-review
```

3명의 리뷰어를 spawn합니다:

#### requirements-reviewer (requirements-analyst 에이전트)
**검증 항목:**
- [ ] PRD 요구사항 완전성 (누락된 기능, 시나리오, 에러 케이스)
- [ ] PRD 내부 논리적 일관성 (섹션 간 모순, 수치 불일치)
- [ ] 참조 문서 간 일관성 (Shared PRD, Master PRD와의 정합성)
- [ ] LLM 모호성 검사 (복수 해석 가능한 표현, 암묵적 가정)
- [ ] 인수 기준 명확성 (각 기능의 완료 조건이 측정 가능한지)
- [ ] 사용자 스토리 커버리지 (모든 시나리오가 기술되었는지)
- [ ] 에러 메시지/코드 완전성 (모든 실패 경로에 대한 처리)

**리뷰 대상 파일:**
- 대상 PRD 파일 (Phase 3)
- `prd/Azrael-PRD-Shared.md` (공통 데이터 구조)
- `prd/Azrael-PRD-Master.md` (전체 로드맵)

#### backend-reviewer (backend-architect 에이전트)
**검증 항목:**
- [ ] DB 스키마 설계 타당성 (테이블 구조, FK, RLS 정책)
- [ ] 마이그레이션 번호 정합성 (기존 번호와 충돌 없는지)
- [ ] Edge Function 구현 완전성 (모든 엔드포인트의 코드/요구사항)
- [ ] 외부 API 연동 정확성 (Slack API 스펙, OAuth 플로우)
- [ ] 보안 검증 (OAuth 토큰 관리, CSRF, 입력 검증)
- [ ] Rate Limit 처리 (재시도 로직, 페이지네이션)
- [ ] 기존 Edge Function 패턴과의 정합성 (CORS, 에러 처리)
- [ ] 환경변수 설정 완전성

**리뷰 대상 파일:**
- 대상 PRD 파일 (Phase 3)
- `supabase/migrations/` (기존 마이그레이션)
- `supabase/functions/` (기존 Edge Function 패턴)
- `prd/Azrael-PRD-Shared.md` §3 (RLS 정책 패턴)

#### frontend-reviewer (frontend-architect 에이전트)
**검증 항목:**
- [ ] UI 컴포넌트 구조 (기존 패턴 준수, 파일 배치)
- [ ] 상태 관리 설계 (React Query 훅, 로컬 상태, 캐싱 전략)
- [ ] UX 플로우 완전성 (해피패스 + 모든 에러 시나리오)
- [ ] 기존 프론트엔드 패턴과의 정합성 (import 스타일, 컴포넌트 구조)
- [ ] 모달/버튼/토스트 패턴 일관성 (기존 UI 패턴과 비교)
- [ ] Settings 탭 통합 방안 (기존 5개 탭 + 새 탭)
- [ ] 번들 최적화 영향 (lazy load 필요 여부)
- [ ] CSS 토큰/디자인 시스템 준수

**리뷰 대상 파일:**
- 대상 PRD 파일 (Phase 3)
- `src/components/` (기존 컴포넌트 구조)
- `src/components/settings/` (기존 Settings 탭 구조)
- `src/lib/api/` (기존 API 레이어 패턴)
- `src/hooks/` (기존 훅 패턴)

### Stage 2: 병렬 검증 실행

3명의 리뷰어가 **동시에** 각자의 영역을 검증합니다.

각 리뷰어의 출력 형식:
```markdown
## [Reviewer Name] 검증 결과

### Critical (구현 불가/중대 오류)
- [C1] 제목: 상세 설명

### Major (수정 필요)
- [M1] 제목: 상세 설명

### Minor (개선 권고)
- [m1] 제목: 상세 설명

### Question (사용자 확인 필요)
- [Q1] 질문 내용
```

### Stage 3: 종합 및 교차 검증 (Lead, 순차)

Lead가 3명의 결과를 취합합니다:

1. **중복 제거**: 여러 리뷰어가 동일 이슈를 지적한 경우 통합
2. **교차 검증**: 한 분야의 지적이 다른 분야에 미치는 영향 분석
3. **우선순위 정리**: Critical > Major > Minor 순서로 정리
4. **수정 권고안 작성**: 각 이슈에 대한 구체적 수정 방향 제시
5. **사용자 확인 사항**: Question 항목을 정리하여 사용자에게 질문

---

## 리뷰어 Spawn Prompt 템플릿

각 리뷰어에게 전달할 프롬프트에는 다음을 포함합니다:

```
당신은 [역할]입니다. 다음 PRD를 검증해주세요.

## 검증 기준
1. 기존 코드베이스와 상충하는 요구사항은 없는가?
2. PRD 문서 내에서 논리적으로 충돌은 없는지?
3. LLM(Claude Code)이 자의적/임의적으로 해석할 여지는 없는지?
4. 이 기능이 현실적으로 구현 가능한가?

## 코드베이스 컨텍스트
[Stage 0에서 수집한 컨텍스트 삽입]

## 검증 대상
- PRD 파일: [경로]
- 참조 파일: [목록]

## 검증 항목
[해당 리뷰어의 체크리스트]

## 출력 형식
Critical / Major / Minor / Question 4단계로 분류하여 보고.
각 이슈에는 PRD 섹션 번호, 구체적 문제점, 수정 제안을 포함.
```

---

## 비용 효율 팁

- **Stage 0에서 컨텍스트를 충분히 수집**하면, 리뷰어가 불필요하게 코드베이스를 탐색하는 비용 절감
- **리뷰어별 검증 범위를 명확히 분리**하면, 중복 작업 방지
- 3명이 병렬로 작업하므로 순차 대비 **약 3배 시간 절감**
- 결과 취합 시 교차 검증으로 **단일 리뷰어 대비 커버리지 향상**
