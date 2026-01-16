# Azrael PRD - Master Document

**프로젝트명**: Azrael
**작성일**: 2026-01-09
**최종 업데이트**: 2026-01-14
**버전**: 2.0
**작성자**: L10n팀 (Claude Code 협업)

---

## 📋 문서 목적

이 문서는 Azrael 프로젝트의 전체 개요, 아키텍처, 개발 로드맵을 제공하는 마스터 문서입니다.

---

## 📚 관련 문서

- **[Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)**: 공통 데이터 구조, 용어집, 기술 스택
- **[Azrael-PRD-Design.md](./Azrael-PRD-Design.md)**: 디자인 시스템 및 UI 가이드라인
- **[Azrael-PRD-Phase0.md](./Azrael-PRD-Phase0.md)**: Phase 0 - 일정 계산 및 시각화 (완료)
- **[Azrael-PRD-Phase1.md](./Azrael-PRD-Phase1.md)**: Phase 1 - JIRA 연동
- **[Azrael-PRD-Phase2.md](./Azrael-PRD-Phase2.md)**: Phase 2 - 이메일 생성
- **[Azrael-PRD-Phase3.md](./Azrael-PRD-Phase3.md)**: Phase 3 - 슬랙 연동

---

## 1. 프로젝트 개요

### 1.1. 프로젝트 배경

게임 퍼블리셔의 L10n팀은 게임 업데이트 일정을 영업일 기준으로 역산하여 현지화 업무 일정을 산정합니다. 기존에는 엑셀 시트의 함수를 사용했으나, 다음과 같은 문제가 있었습니다:

- 새로운 업무 단계 추가 시 시트 업데이트 및 배포 필요
- 일정 조율 시마다 시트 수정 공수 발생
- 버전 관리 및 공유 불편
- 팀원 간 동기화 어려움

### 1.2. 프로젝트 목적

**Azrael**은 엑셀 기반 일정 계산을 웹 기반 도구로 전환하여:

- 업무 단계 추가/수정을 UI에서 직접 가능하게 함
- 계산된 일정을 테이블, 간트 차트, 캘린더로 시각화
- Supabase 백엔드를 통한 팀 공유 데이터 동기화
- JIRA 일감 자동 생성, 이메일/슬랙 연동으로 업무 효율 극대화

### 1.3. 사용자 및 사용 환경

- **사용자**: L10n팀 5인
- **사용 환경**: 회사 내부 (보안 제약 낮음)
- **접근 방식**: Google OAuth 소셜 로그인
- **권한**: 읽기(전체), 쓰기(화이트리스트 5명)

---

## 2. 시스템 아키텍처

### 2.1. 기술 스택 요약

| 레이어 | 기술 | 비고 |
|--------|------|------|
| **프론트엔드** | React 18 + TypeScript + Vite | SPA |
| **백엔드** | Supabase (PostgreSQL + Auth) | 팀 공유 데이터 |
| **데이터 저장** | Supabase + LocalStorage | 하이브리드 |
| **상태 관리** | React Query | 서버 상태 캐싱 |
| **인증** | Google OAuth + Supabase Auth | RLS 정책 적용 |
| **간트 차트** | Frappe Gantt (MIT) | Zero dependencies |
| **캘린더** | FullCalendar v6 (MIT) | React 통합 우수 |
| **이미지 복사** | html2canvas (MIT) | HTML → PNG 변환 |
| **공휴일 API** | 공공데이터포털 API | 한국천문연구원 |

자세한 내용은 **[Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)** 참조

### 2.2. 시스템 구조

```
[사용자 브라우저]
    ↓ Google OAuth
[Supabase Auth] → RLS 정책 검증
    ↓
[프론트엔드 UI]
    ├─ React Query (서버 상태 관리)
    ├─ 프로젝트 선택
    ├─ 업데이트일 입력
    ├─ 영업일 역산 계산 ← [Supabase: Holidays]
    ├─ 테이블 출력 (3개)
    ├─ 간트 차트 (3개) ← [Frappe Gantt]
    ├─ 캘린더 뷰 ← [FullCalendar]
    └─ 설정 관리 ← [Supabase: Projects, Templates, Stages]
    ↓
[Supabase (팀 공유)]
    ├─ Projects (프로젝트 설정)
    ├─ WorkTemplates (업무 단계 템플릿)
    ├─ WorkStages (업무 단계 상세)
    └─ Holidays (공휴일 목록)
    ↓
[LocalStorage (개인)]
    ├─ CalculationResult (계산 결과)
    └─ UserState (사용자 상태)
```

### 2.3. 데이터 흐름

**팀 공유 데이터 (Supabase)**:
1. **사용자 로그인** → Google OAuth → Supabase Auth 세션 생성
2. **프로젝트 조회** → React Query → Supabase RLS 검증 → 전체 프로젝트 목록
3. **업무 단계 조회** → React Query → Supabase → 프로젝트별 템플릿 및 단계
4. **공휴일 조회** → React Query → Supabase → 전체 공휴일 목록
5. **설정 변경** → React Query Mutation → Supabase (화이트리스트 검증) → 자동 캐시 무효화

**개인 데이터 (LocalStorage)**:
1. **업데이트일 입력** → 영업일 역산 계산 (Supabase 공휴일 사용)
2. **테이블 생성** → 업무별 시작/종료일시 계산
3. **결과 저장** → LocalStorage (최신 계산 결과만)
4. **시각화** → 간트 차트, 캘린더 자동 생성
5. **편집** → 텍스트/서식 편집 → LocalStorage 저장
6. **이미지 복사** → html2canvas → 클립보드 복사

---

## 3. 기능 개요

### 3.1. Phase 0: 일정 계산 및 시각화 (완료)

| 기능 | 설명 | 상태 |
|------|------|------|
| **Google OAuth 인증** | Google 계정으로 로그인, Supabase Auth 연동 | ✅ 완료 |
| **Supabase 백엔드** | PostgreSQL 데이터베이스, RLS 정책 적용 | ✅ 완료 |
| **프로젝트 관리** | 프로젝트 추가/수정/삭제 (Supabase) | ✅ 완료 |
| **업무 단계 관리** | 템플릿 및 단계 추가/수정/삭제 (Supabase) | ✅ 완료 |
| **공휴일 관리** | API 불러오기, 수동 추가/삭제 (Supabase) | ✅ 완료 |
| **영업일 역산 계산** | 업데이트일 기준 영업일 역산 (주말/공휴일 제외) | ✅ 완료 |
| **3개 테이블 출력** | 일정표, Ext. 일정표, Int. 일정표 | ✅ 완료 |
| **간트 차트** | 테이블별 간트 차트 (Frappe Gantt) | ✅ 완료 |
| **캘린더 뷰** | 월간 캘린더 (FullCalendar) | ✅ 완료 |
| **테이블 편집** | 텍스트 및 서식 직접 편집 | ✅ 완료 |
| **하위 일감 관리** | +/↓/✕ 버튼으로 하위 일감 추가/삭제 | ✅ 완료 |
| **이미지 복사** | 테이블/차트를 PNG로 복사 (html2canvas) | ✅ 완료 |

자세한 내용은 **[Azrael-PRD-Phase0.md](./Azrael-PRD-Phase0.md)** 참조

### 3.2. Phase 1: JIRA 연동 (계획)

| 기능 | 설명 | 상태 |
|------|------|------|
| **JIRA 일감 생성** | Epic/Task/Subtask 계층 구조 생성 | 🟡 개요만 |
| **일감 매핑** | 테이블 엔트리 → JIRA 이슈 매핑 | 🟡 개요만 |

자세한 내용은 **[Azrael-PRD-Phase1.md](./Azrael-PRD-Phase1.md)** 참조

### 3.3. Phase 2: 이메일 생성 (계획)

| 기능 | 설명 | 상태 |
|------|------|------|
| **이메일 텍스트 생성** | 테이블 기반 이메일 본문 자동 생성 | 🟡 개요만 |

자세한 내용은 **[Azrael-PRD-Phase2.md](./Azrael-PRD-Phase2.md)** 참조

### 3.4. Phase 3: 슬랙 연동 (계획)

| 기능 | 설명 | 상태 |
|------|------|------|
| **슬랙 메시지 발신** | 일정 공유 메시지 및 리플라이 자동 발신 | 🟡 개요만 |

자세한 내용은 **[Azrael-PRD-Phase3.md](./Azrael-PRD-Phase3.md)** 참조

---

## 4. 개발 로드맵

### 4.1. Phase 구성

```
Phase 0: 일정 계산 및 시각화 ✅ 완료 (2026-01-13)
    ↓
Phase 1: JIRA 연동 (계획)
    ↓
Phase 2: 이메일 생성 (계획)
    ↓
Phase 3: 슬랙 연동 (계획)
```

### 4.2. Phase 0 완료 내역

**완료일**: 2026-01-13
**Git Commit**: c178dd9 feat: Phase 0 MVP 완성
**배포**: https://azrael-002.vercel.app/
**데이터베이스**: Supabase PostgreSQL (ap-south-1)

**주요 마일스톤**:
1. ✅ Supabase 마이그레이션 (커밋 0171aaf)
   - LocalStorage 전용 → Supabase + LocalStorage 하이브리드
   - PostgreSQL 스키마 생성 (4개 테이블)
   - RLS 정책 적용 (읽기: 전체, 쓰기: 화이트리스트)
   - React Query 훅 15개 구현

2. ✅ Google OAuth + Supabase Auth 통합
   - @react-oauth/google 라이브러리 사용
   - Supabase 세션 관리
   - 화이트리스트 검증 (L10n팀 5명)

3. ✅ CSV 데이터 임포트
   - 9개 프로젝트
   - 48개 업무 단계
   - 23개 공휴일 (2025-2026)

4. ✅ Event Calendar → FullCalendar 교체
   - React 통합 개선
   - 안정적 API
   - 커뮤니티 지원 우수

### 4.3. Phase 1-3 개발 방향

- **Phase 1-3**: Phase 0 사용자 피드백 후 상세 설계
- **현재 상태**: 개요만 작성, 구체적인 API 명세/UI는 추후 정의

---

## 5. 비기능 요구사항

| 항목 | 요구사항 | 비고 |
|------|----------|------|
| **브라우저 호환성** | Chrome, Edge, Firefox, Safari (최신 2개 버전) | IE11 미지원 |
| **반응형 디자인** | PC 전용 (1280x720 이상) | 모바일/태블릿 미지원 |
| **성능** | 성능 최적화 불필요 (5인 사용, 소량 데이터) | React Query 캐싱 적용 |
| **접근성** | 접근성 고려 안 함 | 내부 5인만 사용 |
| **보안** | Google OAuth + Supabase Auth + RLS | 읽기: 전체, 쓰기: 화이트리스트 |
| **데이터 동기화** | Supabase (팀 공유), LocalStorage (개인) | React Query 자동 리프레시 |

자세한 내용은 **[Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)** 참조

---

## 6. 제약사항 및 전제조건

### 6.1. 제약사항

- **Supabase 의존**: 팀 공유 데이터는 Supabase 필수
- **개인 데이터 동기화 없음**: CalculationResult는 브라우저별 독립
- **버전 관리 없음**: 최신 계산 결과만 유지
- **Supabase 장애 시**: 이전 캐시된 데이터 사용 (React Query)

### 6.2. 전제조건

- **사용자 환경**: PC, 최신 브라우저
- **네트워크**: Supabase 연결 및 공휴일 API 호출 시 인터넷 필요
- **Google 계정**: OAuth 로그인 필수
- **화이트리스트**: Supabase RLS 정책에 5인 이메일 사전 등록

---

## 7. 용어 정리

자세한 용어집은 **[Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)** 참조

**핵심 용어**:
- **영업일**: 주말(토, 일), 공휴일 제외 근무일
- **마감**: 선행 작업의 종료 시점 = L10n팀 작업 시작 시점 (startDateTime)
- **테이블 전달**: L10n팀 작업 종료 시점 (endDateTime)
- **Offset**: 업데이트일 기준 역산할 영업일 수 (양수=과거, 음수=미래)
- **헤즈업**: 유관부서/협력업체에 일정 공유하는 날짜
- **iOS 심사일**: iOS 앱스토어 심사 제출 예정일
- **RLS**: Row Level Security (Supabase 행 단위 접근 제어)

---

## 8. 프로젝트 목록

| 프로젝트 코드 | 프로젝트명 | 설명 | 특수 설정 |
|--------------|-----------|------|----------|
| M4/GL | MIR4 글로벌 서비스 | | 없음 |
| NC/GL (1주) | NIGHT CROWS 글로벌 1주 사이클 | | 독립 프로젝트 |
| NC/GL (2주) | NIGHT CROWS 글로벌 2주 사이클 | | 독립 프로젝트 |
| FB/GL (CDN) | FANTASTIC BASEBALL 글로벌 CDN | | 독립 프로젝트 |
| FB/GL (APP) | FANTASTIC BASEBALL 글로벌 APP | | 독립 프로젝트 |
| FB/JP (CDN) | FANTASTIC BASEBALL 일본 CDN | | 독립 프로젝트 |
| FB/JP (APP) | FANTASTIC BASEBALL 일본 APP | | 독립 프로젝트 |
| LY/GL | LEGEND OF YMIR 글로벌 서비스 | | 없음 |
| 월말정산 | 월말 현지화 비용 정산 | 프로젝트 아니지만 일정 관리 대상 | 없음 |

**타입별 독립 프로젝트 정책**:
- NC/GL, FB 프로젝트는 타입별로 독립 프로젝트로 분리
- 이유: 템플릿 관리 단순화, 타입 전환 시 혼동 방지
- 영향: 프로젝트 드롭다운 목록 9개 (타입 포함)

---

## 9. 성공 지표

### 9.1. Phase 0 성공 기준

- ✅ 5인 모두가 기존 엑셀 시트 대신 Azrael 사용
- ✅ 업무 단계 추가/수정이 UI에서 5분 이내 완료
- ✅ 업데이트일 입력 후 3초 이내 테이블/차트 출력
- ✅ 이미지 복사 기능으로 외부 공유 시간 50% 단축
- ✅ Supabase 백엔드 통한 팀 공유 데이터 실시간 동기화

### 9.2. Phase 1-3 성공 기준

- Phase 0 사용자 피드백 후 정의

---

## 10. 리스크 관리

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|-----------|
| Supabase 장애 | 중 | React Query 캐시 fallback, 이전 데이터 사용 |
| LocalStorage 데이터 손실 | 낮 | 개인 계산 결과만 영향, 재계산 가능 |
| 브라우저 호환성 이슈 | 낮 | 주요 브라우저 최신 2개 버전만 지원 |
| 공휴일 API 장애 | 낮 | Supabase 캐시 활용, 수동 입력 기능 제공 |
| 라이브러리 업데이트 중단 | 낮 | MIT 라이선스로 포크 가능, 커뮤니티 활발 |

---

## 11. 배포 정보

**배포 플랫폼**: Vercel
**배포 URL**: https://azrael-002.vercel.app/
**Git Repository**: https://github.com/JaekyungCho2140/azrael-002
**배포일**: 2026-01-13

**환경 변수** (Vercel 설정):
```env
VITE_SUPABASE_URL=https://vgoqkyqqkieogrtnmsva.supabase.co
VITE_SUPABASE_ANON_KEY=*** (설정됨)
VITE_GOOGLE_CLIENT_ID=*** (설정됨)
VITE_ALLOWED_USERS=jkcho@wemade.com,mine@wemade.com,srpark@wemade.com,garden0130@wemade.com,hkkim@wemade.com
VITE_HOLIDAY_API_KEY=*** (설정됨)
```

---

## 12. 부록

### 12.1. 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 2026-01-09 | 1.0 | 초안 작성 | L10n팀 + Claude |
| 2026-01-13 | 1.5 | Phase 0 완료 반영, Supabase 마이그레이션 | L10n팀 + Claude |
| 2026-01-14 | 2.0 | 코드베이스 기준 전면 업데이트, 과거 이력 제거 | L10n팀 + Claude |

### 12.2. 승인 이력

| 단계 | 승인자 | 날짜 | 서명 |
|------|--------|------|------|
| PRD 검토 | | | |
| Phase 0 개발 승인 | | 2026-01-09 | ✅ |
| Phase 0 배포 승인 | | 2026-01-13 | ✅ |

---

**문서 종료**
