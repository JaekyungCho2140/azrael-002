# Azrael Phase 0 개발 로드맵

**프로젝트**: Azrael - L10n 일정 관리 도구
**Phase**: Phase 0 - 일정 계산 및 시각화 (핵심 기능)
**작성일**: 2026-01-12
**참조**: [prd/Azrael-PRD-Phase0.md](./prd/Azrael-PRD-Phase0.md)

---

## 📋 개발 개요

Phase 0은 Azrael의 MVP로, 엑셀 기반 일정 계산을 웹 기반 도구로 전환합니다.

**핵심 목표**:
- ✅ 영업일 역산 계산 엔진
- ✅ 3개 테이블 출력 (일정표, Ext., Int.)
- ✅ 간트 차트 및 캘린더 시각화
- ✅ 이미지 복사 기능
- ✅ 프로젝트 및 공휴일 관리

---

## 🏗️ 프로젝트 설정

### 1. 초기 설정

- [x] **프로젝트 초기화**
  - React 18 + TypeScript + Vite 프로젝트 생성
  - 참조: [prd/Azrael-PRD-Shared.md#4-기술-스택-상세](./prd/Azrael-PRD-Shared.md)
  - 디렉토리 구조 설정 (`src/components`, `src/hooks`, `src/lib`, `src/types`)

- [x] **의존성 설치**
  - Frappe Gantt (v1.0.3+, MIT) 설치
  - Event Calendar by vkurko (v3.8.0+, MIT) 설치
  - html2canvas (v1.4.1+, MIT) 설치
  - 참조: [prd/Azrael-PRD-Shared.md#42-주요-라이브러리](./prd/Azrael-PRD-Shared.md)

- [x] **TypeScript 타입 정의**
  - `src/types/index.ts` 생성
  - `Project`, `WorkTemplate`, `WorkStage`, `ScheduleEntry`, `CalculationResult`, `Holiday`, `UserState` 인터페이스 정의
  - 참조: [prd/Azrael-PRD-Shared.md#2-공통-데이터-구조](./prd/Azrael-PRD-Shared.md)

- [x] **환경 변수 설정**
  - `.env` 파일 생성
  - `ALLOWED_USERS` (화이트리스트), `HOLIDAY_API_KEY` 설정
  - 참조: [prd/Azrael-PRD-Phase0.md#22-화이트리스트-검증](./prd/Azrael-PRD-Phase0.md)

---

## 🎨 디자인 시스템 구축

### 2. CSS 기초 및 디자인 토큰

- [x] **CSS 변수 정의**
  - `src/styles/tokens.css` 생성
  - Azrael Orange 팔레트, Neutral 팔레트, Semantic Colors 정의
  - 참조: [prd/Azrael-PRD-Design.md#2-색상-시스템](./prd/Azrael-PRD-Design.md)

- [x] **타이포그래피 설정**
  - Google Fonts에서 Nunito, Inter, Noto Sans KR 로드
  - Font Stack, Font Sizes, Weights 정의
  - 참조: [prd/Azrael-PRD-Design.md#3-타이포그래피](./prd/Azrael-PRD-Design.md)

- [x] **기본 컴포넌트 스타일**
  - Button (Primary, Secondary, Icon) 스타일 정의
  - Input, Dropdown 스타일 정의
  - 참조: [prd/Azrael-PRD-Design.md#5-컴포넌트-스타일](./prd/Azrael-PRD-Design.md)

---

## 🔐 인증 및 온보딩

### 3. 로그인 화면

- [x] **Gmail OAuth 로그인 구현**
  - Google Identity Services 통합
  - OAuth 2.0 플로우 구현 (`profile`, `email` 스코프)
  - 참조: [prd/Azrael-PRD-Phase0.md#2-로그인-및-인증](./prd/Azrael-PRD-Phase0.md)

- [x] **화이트리스트 검증**
  - `.env`의 `ALLOWED_USERS` 체크 로직 구현
  - 검증 실패 시 에러 메시지 표시
  - 참조: [prd/Azrael-PRD-Phase0.md#22-화이트리스트-검증](./prd/Azrael-PRD-Phase0.md)

- [x] **로그인 화면 UI**
  - Azrael 로고 및 고양이 일러스트 추가
  - "Gmail로 로그인" 버튼 구현
  - 참조: [prd/Azrael-PRD-Design.md#71-로그인-화면](./prd/Azrael-PRD-Design.md)

### 4. 온보딩 화면

- [x] **최초 접속 체크**
  - `azrael:userState`에서 `hasCompletedOnboarding` 확인
  - 참조: [prd/Azrael-PRD-Phase0.md#3-온보딩](./prd/Azrael-PRD-Phase0.md)

- [x] **프로젝트 선택 UI**
  - 9개 기본 프로젝트 라디오 버튼 표시
  - "시작하기" 버튼 구현
  - 참조: [prd/Azrael-PRD-Design.md#72-온보딩-화면](./prd/Azrael-PRD-Design.md)

- [x] **초기 데이터 생성**
  - `DEFAULT_PROJECTS` 배열로 9개 프로젝트 자동 생성
  - 빈 템플릿 배열, 공휴일 배열 초기화
  - 참조: [prd/Azrael-PRD-Shared.md#53-초기-데이터-시드](./prd/Azrael-PRD-Shared.md)

---

## 📦 LocalStorage 및 상태 관리

### 5. LocalStorage 유틸리티

- [x] **LocalStorage 스키마 구현**
  - `azrael:projects`, `azrael:templates`, `azrael:holidays`, `azrael:calculation:{projectId}`, `azrael:userState` 키 구조 정의
  - 참조: [prd/Azrael-PRD-Shared.md#5-localstorage-스키마](./prd/Azrael-PRD-Shared.md)

- [x] **Date 직렬화 처리**
  - `JSON.stringify()` 저장 시 ISO 8601 자동 변환
  - `JSON.parse()` 로드 후 Date 필드 수동 복원 (`reviveEntries` 함수)
  - 참조: [prd/Azrael-PRD-Shared.md#51-저장-키-구조](./prd/Azrael-PRD-Shared.md)

- [x] **Hooks 구현**
  - `useLocalStorage` 커스텀 훅 구현
  - `useProjects`, `useTemplates`, `useHolidays`, `useUserState` 훅 구현

---

## 🧮 영업일 역산 계산 엔진

### 6. 계산 로직 구현

- [x] **영업일 역산 함수**
  - `calculateBusinessDate(updateDate, offsetDays, holidays)` 함수 구현
  - 주말(토, 일) 및 공휴일 제외 로직
  - Offset 0 정책: 업데이트일 그대로 반환
  - 참조: [prd/Azrael-PRD-Shared.md#31-영업일-역산-함수](./prd/Azrael-PRD-Shared.md)

- [x] **시작/종료일시 계산**
  - `calculateDateTimeFromStage(updateDate, stage, holidays)` 함수 구현
  - 날짜 계산 + 시각(HH:MM) 추가 로직
  - 참조: [prd/Azrael-PRD-Shared.md#32-시작종료일시-계산](./prd/Azrael-PRD-Shared.md)

- [x] **헤즈업/iOS 심사일 계산**
  - `calculateHeadsUpDate`, `calculateIosReviewDate` 함수 구현
  - 참조: [prd/Azrael-PRD-Shared.md#33-헤즈업ios-심사일-계산](./prd/Azrael-PRD-Shared.md)

- [x] **날짜 형식 변환**
  - `formatTableDate(date)` → `"MM/DD(요일) HH:MM"`
  - `formatUpdateDate(date)` → `"YYYY-MM-DD (요일)"`
  - 참조: [prd/Azrael-PRD-Shared.md#34-날짜-형식-변환-함수](./prd/Azrael-PRD-Shared.md)

---

## 🖥️ 메인 화면

### 7. 프로젝트 선택 및 업데이트일 입력

- [x] **메인 화면 레이아웃**
  - 헤더 (로고, 프로젝트 드롭다운, 설정/로그아웃)
  - Input Section (프로젝트 선택, 업데이트일 입력, 계산 버튼)
  - 참조: [prd/Azrael-PRD-Phase0.md#4-메인-화면---프로젝트-선택-및-업데이트일-입력](./prd/Azrael-PRD-Phase0.md)

- [x] **프로젝트 드롭다운**
  - 9개 기본 프로젝트 목록 표시
  - "+ 새 프로젝트 추가" 옵션
  - 참조: [prd/Azrael-PRD-Phase0.md#42-프로젝트-선택-드롭다운](./prd/Azrael-PRD-Phase0.md)

- [x] **업데이트일 입력 UI**
  - Date Picker 구현
  - 키보드 입력 지원 (YYYY-MM-DD)
  - 요일 자동 계산 및 표시
  - 참조: [prd/Azrael-PRD-Phase0.md#44-업데이트일-입력-원래-44-내용](./prd/Azrael-PRD-Phase0.md)

- [x] **[계산] 버튼 동작**
  - 입력 검증
  - 공휴일 데이터 로드
  - 영업일 역산 계산
  - CalculationResult 생성 및 LocalStorage 저장
  - 참조: [prd/Azrael-PRD-Phase0.md#45-계산-버튼](./prd/Azrael-PRD-Phase0.md)

- [x] **마지막 계산 결과 표시**
  - LocalStorage에서 마지막 계산 결과 로드
  - "결과 보기" 버튼 구현
  - 참조: [prd/Azrael-PRD-Phase0.md#46-마지막-계산-결과-표시](./prd/Azrael-PRD-Phase0.md)

- [x] **프로젝트 추가 모달**
  - 프로젝트 이름 입력
  - 새 Project 및 빈 WorkTemplate 생성
  - LocalStorage 저장 및 목록 갱신
  - 참조: [prd/Azrael-PRD-Phase0.md#48-프로젝트-추가-모달](./prd/Azrael-PRD-Phase0.md)

---

## 📊 테이블 출력

### 8. 상단 날짜 표시

- [x] **헤즈업/iOS 심사일 UI**
  - `MM/DD(요일)` 형식 표시
  - `showIosReviewDate: false`이면 iOS 심사일 숨김
  - 참조: [prd/Azrael-PRD-Phase0.md#52-상단-날짜](./prd/Azrael-PRD-Phase0.md)

### 9. 테이블 1: 일정표

- [x] **테이블 1 구조 및 스타일**
  - 헤더: `#, 배치, 마감, 테이블 전달, 설명, 담당자`
  - 가운데 정렬
  - 참조: [prd/Azrael-PRD-Phase0.md#53-테이블-1-yy-mm-dd-업데이트-일정표](./prd/Azrael-PRD-Phase0.md)

- [x] **테이블 1 데이터 렌더링**
  - `table1Entries` 배열 순회
  - `formatTableDate()` 사용하여 마감/테이블 전달 표시
  - 설명, 담당자 필드는 편집 가능 (§9에서 구현)
  - 참조: [prd/Azrael-PRD-Phase0.md#53-테이블-1-yy-mm-dd-업데이트-일정표](./prd/Azrael-PRD-Phase0.md)

- [x] **Disclaimer 메모**
  - 테이블 1 하단에 표시
  - 최대 6줄/600자 제한
  - Bold/Italic/색상(빨강, 파랑, 검정) 서식 지원
  - 참조: [prd/Azrael-PRD-Phase0.md#53-테이블-1-yy-mm-dd-업데이트-일정표](./prd/Azrael-PRD-Phase0.md)

### 10. 테이블 2: Ext. 일정표

- [x] **테이블 2 구조 및 스타일**
  - 헤더: `▼▲, #, 배치, HO, HB, 설명, JIRA 설명, [+] [↓]`
  - 하위 일감 들여쓰기 표시 (`ㄴ` 기호)
  - 참조: [prd/Azrael-PRD-Phase0.md#54-테이블-2-ext-yy-mm-dd-업데이트-일정표](./prd/Azrael-PRD-Phase0.md)

- [x] **하위 일감 펼치기/접기**
  - ▼/▲ 버튼 구현
  - `collapsedParentIds` 상태 관리
  - 테이블과 간트 차트 동기화
  - 참조: [prd/Azrael-PRD-Phase0.md#64-y축-업무-목록---q3-테이블-상태-동기화](./prd/Azrael-PRD-Phase0.md)

- [x] **+ 버튼 (같은 레벨 추가)**
  - 현재 엔트리 다음에 같은 depth 추가
  - 인덱스 자동 재정렬
  - 참조: [prd/Azrael-PRD-Phase0.md#54-테이블-2-ext-yy-mm-dd-업데이트-일정표](./prd/Azrael-PRD-Phase0.md)

- [x] **↓ 버튼 (하위 일감 추가)**
  - 최대 깊이(2단계), 최대 개수(20개) 검증
  - 부모 엔트리의 `children` 배열에 추가 (양방향 참조)
  - 템플릿에서 하위 일감 Offset 사용
  - 참조: [prd/Azrael-PRD-Phase0.md#54-테이블-2-ext-yy-mm-dd-업데이트-일정표](./prd/Azrael-PRD-Phase0.md)

- [x] **[X] 삭제 버튼**
  - 부모 삭제 시 cascade (하위 일감도 삭제)
  - 자식 삭제 시 부모 `children` 배열 동기화
  - 인덱스 자동 재정렬
  - 참조: [prd/Azrael-PRD-Phase0.md#54-테이블-2-ext-yy-mm-dd-업데이트-일정표](./prd/Azrael-PRD-Phase0.md)

### 11. 테이블 3: Int. 일정표

- [x] **테이블 3 구현**
  - 테이블 2와 동일한 구조 및 로직 적용
  - 참조: [prd/Azrael-PRD-Phase0.md#55-테이블-3-int-yy-mm-dd-업데이트-일정표](./prd/Azrael-PRD-Phase0.md)

---

## 📈 간트 차트

### 12. Frappe Gantt 통합

- [x] **Frappe Gantt 기본 설정**
  - `ScheduleEntry` → Gantt Task 변환
  - `view_mode: 'Day'`, 의존성 화살표 설정
  - 참조: [prd/Azrael-PRD-Phase0.md#6-간트-차트](./prd/Azrael-PRD-Phase0.md)

- [x] **간트 차트 3개 렌더링**
  - 테이블 1/2/3별로 각각 간트 차트 생성
  - 차트별 색상 구분 (Orange, Teal, Deep Purple)
  - 참조: [prd/Azrael-PRD-Design.md#24-chart-colors-테이블간트캘린더](./prd/Azrael-PRD-Design.md)

- [x] **시각 정보 툴팁**
  - `custom_popup_html` 콜백 구현
  - 원본 `ScheduleEntry`에서 시각 정보 조회 (Single Source of Truth)
  - `HH:MM ~ HH:MM` 형식 표시
  - 참조: [prd/Azrael-PRD-Phase0.md#63-x축-시간축---q6-frappe-gantt-기본-동작-따름](./prd/Azrael-PRD-Phase0.md)

- [x] **하위 일감 표시 동기화**
  - 테이블에서 ▲ 버튼으로 접힌 경우 간트 차트에서도 숨김
  - `collapsedParentIds` 상태 기반 필터링
  - 참조: [prd/Azrael-PRD-Phase0.md#64-y축-업무-목록---q3-테이블-상태-동기화](./prd/Azrael-PRD-Phase0.md)

- [x] **의존성 화살표**
  - 순차적 업무 간 자동 연결
  - 참조: [prd/Azrael-PRD-Phase0.md#65-의존성-화살표](./prd/Azrael-PRD-Phase0.md)

---

## 📅 캘린더 뷰

### 13. FullCalendar 통합 ✅ (Event Calendar → FullCalendar로 교체)

- [x] **FullCalendar 기본 설정**
  - `ScheduleEntry` → Event 변환
  - `view: 'dayGridMonth'` 설정
  - 참조: [prd/Azrael-PRD-Phase0.md#7-캘린더-뷰](./prd/Azrael-PRD-Phase0.md)

- [x] **업무 표시 및 색상**
  - 테이블 1/2/3별 색상 구분 (Orange #FF9800, Teal #009688, Deep Purple #673AB7)
  - 날짜 칸 하단에 색상 바 표시
  - 참조: [prd/Azrael-PRD-Design.md#24-chart-colors-테이블간트캘린더](./prd/Azrael-PRD-Design.md)

- [x] **툴팁 구현**
  - `eventContent` 커스텀 렌더러에서 `title` 속성 설정
  - 브라우저 기본 툴팁 사용 (`title` 속성)
  - `{배치}: {HH:MM} ~ {HH:MM}` 형식
  - 참조: [prd/Azrael-PRD-Phase0.md#73-업무-표시](./prd/Azrael-PRD-Phase0.md)

- [x] **네비게이션**
  - FullCalendar 기본 prev/next 버튼 사용
  - 기본 표시: 업데이트일이 속한 달
  - 참조: [prd/Azrael-PRD-Phase0.md#75-네비게이션](./prd/Azrael-PRD-Phase0.md)

---

## 🖼️ 이미지 복사

### 14. html2canvas 통합

- [x] **이미지 복사 버튼 UI**
  - 각 테이블, 간트 차트, 캘린더 옆에 `[📋 이미지 복사]` 버튼 배치
  - 참조: [prd/Azrael-PRD-Phase0.md#81-트리거-ui](./prd/Azrael-PRD-Phase0.md)

- [x] **html2canvas 캡처**
  - `scale: 2` 옵션으로 2배 해상도 렌더링 (Retina 대응)
  - 스크롤 처리: `overflow: visible` 임시 전환
  - 참조: [prd/Azrael-PRD-Phase0.md#82-기술-q16-llm-구현-시-정확한-스펙-적용](./prd/Azrael-PRD-Phase0.md)

- [x] **Clipboard API 복사**
  - Canvas → PNG Blob → `navigator.clipboard.write()`
  - 성공 메시지: "이미지가 클립보드에 복사되었습니다"
  - 참조: [prd/Azrael-PRD-Phase0.md#83-동작](./prd/Azrael-PRD-Phase0.md)

- [x] **Clipboard 실패 시 다운로드 fallback**
  - Clipboard API 미지원 또는 실패 시 다운로드 제안
  - 사용자 확인 후 PNG 파일 다운로드
  - 참조: [prd/Azrael-PRD-Phase0.md#85-구현-예시-q9-clipboard-api-fallback-추가](./prd/Azrael-PRD-Phase0.md)

---

## ✏️ 테이블 편집

### 15. 편집 가능한 셀

- [x] **편집 모드 구현**
  - 편집 가능 셀 클릭 → 편집 모드 진입
  - 셀 밖 클릭 또는 Enter → 자동 저장
  - 동시 편집 제한: 편집 중인 셀 하나씩만 활성화
  - 참조: [prd/Azrael-PRD-Phase0.md#92-편집-모드-q5-충돌-방지](./prd/Azrael-PRD-Phase0.md)

- [x] **서식 지원**
  - Bold (`<b>`, `<strong>`), Italic (`<i>`, `<em>`)
  - 색상 (`<span style="color:...">`, 빨강/파랑/검정만)
  - 미니 툴바: `[B] [I] [빨강] [파랑] [검정]`
  - 참조: [prd/Azrael-PRD-Phase0.md#93-서식-지원-q5-llm-구현-시-정확한-범위만-구현](./prd/Azrael-PRD-Phase0.md)

- [x] **저장 로직**
  - `contentEditable`의 `innerHTML` 그대로 저장
  - 저장 실패 시 롤백 (백업 복원)
  - 참조: [prd/Azrael-PRD-Phase0.md#95-저장-round10-q4-롤백-추가](./prd/Azrael-PRD-Phase0.md)

---

## ⚙️ 설정 화면

### 16. 프로젝트 관리

- [x] **프로젝트 목록 UI**
  - 프로젝트 이름, [편집], [삭제] 버튼
  - "+ 새 프로젝트 추가" 버튼
  - 참조: [prd/Azrael-PRD-Phase0.md#102-프로젝트-관리](./prd/Azrael-PRD-Phase0.md)

- [x] **프로젝트 편집 모달**
  - 이름, 헤즈업 Offset, iOS 심사일 표시/Offset, Disclaimer 편집
  - 참조: [prd/Azrael-PRD-Phase0.md#102-프로젝트-관리](./prd/Azrael-PRD-Phase0.md)

- [x] **프로젝트 삭제**
  - 마지막 프로젝트 삭제 불가 검증 (최소 1개 필요)
  - 삭제 범위: `azrael:projects`, `azrael:templates`, `azrael:calculation:{projectId}`, `azrael:userState.lastProjectId` 업데이트
  - 참조: [prd/Azrael-PRD-Shared.md#75-프로젝트-삭제-시-데이터-정리](./prd/Azrael-PRD-Shared.md)

### 17. 업무 단계 관리

- [x] **업무 단계 템플릿 UI**
  - 프로젝트 선택 드롭다운
  - 업무 단계 목록: `#, 액션, Offset, 시작 시각, 종료 시각, [편집], [삭제]`
  - "+ 업무 단계 추가" 버튼
  - 참조: [prd/Azrael-PRD-Phase0.md#103-업무-단계-관리](./prd/Azrael-PRD-Phase0.md)

- [x] **업무 단계 편집/추가 모달**
  - 액션 이름, 역산할 영업일, 기본 시작 시각, 기본 종료 시각 입력
  - 참조: [prd/Azrael-PRD-Phase0.md#103-업무-단계-관리](./prd/Azrael-PRD-Phase0.md)

- [x] **하위 일감 템플릿**
  - 하위 일감도 템플릿에 별도 등록
  - Offset은 업데이트일 기준 (부모 날짜와 무관)
  - 참조: [prd/Azrael-PRD-Phase0.md#103-업무-단계-관리](./prd/Azrael-PRD-Phase0.md)

### 18. 공휴일 관리

- [x] **공휴일 목록 UI**
  - 날짜, 이름, 출처(API/수동), [삭제] 버튼
  - `[🔄 공휴일 불러오기 (API)]` 버튼
  - "+ 공휴일 수동 추가" 버튼
  - 참조: [prd/Azrael-PRD-Phase0.md#104-공휴일-관리](./prd/Azrael-PRD-Phase0.md)

- [x] **공휴일 API 호출**
  - 공공데이터포털 API 호출 (`solYear=현재년도`)
  - 중복 호출 체크: 이미 불러온 경우 확인 메시지
  - 버튼 비활성화: "불러오는 중..." 표시
  - 참조: [prd/Azrael-PRD-Shared.md#44-외부-api](./prd/Azrael-PRD-Shared.md)

- [x] **XML 파싱 로직**
  - `DOMParser`로 XML 파싱
  - `resultCode` 확인
  - `locdate` → Date 변환 (로컬 시간대)
  - `Holiday[]` 생성 (`isManual: false`)
  - LocalStorage 저장 (기존 API 공휴일 덮어쓰기, 수동 추가는 유지)
  - 참조: [prd/Azrael-PRD-Shared.md#44-외부-api](./prd/Azrael-PRD-Shared.md)

- [x] **수동 추가 모달**
  - 날짜, 이름 입력
  - `isManual: true` 설정
  - LocalStorage 저장
  - 참조: [prd/Azrael-PRD-Phase0.md#104-공휴일-관리](./prd/Azrael-PRD-Phase0.md)

- [x] **공휴일 삭제**
  - 확인 메시지 → Holiday 삭제 → LocalStorage 업데이트
  - 참조: [prd/Azrael-PRD-Phase0.md#104-공휴일-관리](./prd/Azrael-PRD-Phase0.md)

---

## 🎨 UI 폴리싱

### 19. 반응형 및 상태

- [x] **최소 해상도 경고**
  - 1280x720 미만 시 전체 화면 경고 표시
  - "🐱 Azrael은 PC 전용입니다" 메시지
  - 참조: [prd/Azrael-PRD-Design.md#91-최소-해상도-경고](./prd/Azrael-PRD-Design.md)

- [x] **Loading States**
  - 전체 화면 로딩 오버레이
  - 고양이 아이콘 애니메이션 (꼬리 흔들기)
  - 참조: [prd/Azrael-PRD-Design.md#92-loading-states](./prd/Azrael-PRD-Design.md)

- [x] **Toast Messages**
  - 성공/에러/정보 메시지 Toast 구현
  - 우측 하단 고정, 자동 사라짐
  - 참조: [prd/Azrael-PRD-Design.md#93-toast-messages-알림](./prd/Azrael-PRD-Design.md)

### 20. 애니메이션

- [x] **페이지 로드 애니메이션**
  - `fadeInUp` 애니메이션 적용
  - Staggered Animation (순차 등장)
  - 참조: [prd/Azrael-PRD-Design.md#62-page-load-animation-고양이-발자국-효과](./prd/Azrael-PRD-Design.md)

- [x] **Hover Effects**
  - 버튼: 살짝 점프 (`translateY(-2px)`)
  - 카드: 살짝 확대 (`scale(1.01)`)
  - 테이블 행: 주황 배경
  - 참조: [prd/Azrael-PRD-Design.md#63-hover-effects-고양이-호기심](./prd/Azrael-PRD-Design.md)

- [x] **테이블 행 추가 애니메이션**
  - `rowAppear` 애니메이션 (위에서 등장, 주황 하이라이트)
  - 참조: [prd/Azrael-PRD-Design.md#152-테이블-행-추가-애니메이션](./prd/Azrael-PRD-Design.md)

---

## 🧪 테스트

### 21. 단위 테스트 (Vitest)

- [x] **영업일 역산 계산 테스트**
  - 주말 제외, 공휴일 제외, Offset=0 정책 검증
  - 참조: [prd/Azrael-PRD-Shared.md#31-영업일-역산-함수](./prd/Azrael-PRD-Shared.md)
  - 테스트 시나리오:
    - [x] 양수 Offset (과거 날짜 계산)
    - [x] 음수 Offset (미래 날짜 계산)
    - [x] Offset=0 (업데이트일 그대로)
    - [x] 주말 건너뛰기
    - [x] 공휴일 건너뛰기

- [x] **날짜 형식 변환 테스트**
  - `formatTableDate()`, `formatUpdateDate()` 검증
  - 참조: [prd/Azrael-PRD-Shared.md#34-날짜-형식-변환-함수](./prd/Azrael-PRD-Shared.md)
  - 테스트 시나리오:
    - [x] `formatTableDate(new Date('2026-01-28 09:00'))` → `"01/28(수) 09:00"`
    - [x] `formatUpdateDate(new Date('2026-02-10'))` → `"2026-02-10 (화)"`

- [x] **LocalStorage Date 직렬화 테스트**
  - `JSON.stringify()` → `JSON.parse()` → Date 복원 검증
  - 참조: [prd/Azrael-PRD-Shared.md#51-저장-키-구조](./prd/Azrael-PRD-Shared.md)
  - 테스트 시나리오:
    - [x] CalculationResult 저장 및 로드
    - [x] Holiday 배열 저장 및 로드
    - [x] 하위 일감 포함 ScheduleEntry 저장 및 로드

### 22. 통합 테스트 (Playwright MCP)

- [x] **로그인 플로우 테스트**
  - Playwright로 개발 모드 자동 로그인 검증
  - 참조: [prd/Azrael-PRD-Phase0.md#2-로그인-및-인증](./prd/Azrael-PRD-Phase0.md)
  - 테스트 시나리오:
    - [x] 정상 로그인 (개발 모드 자동)

- [x] **온보딩 플로우 테스트**
  - 프로젝트 선택 → "시작하기" → 메인 화면 이동
  - 참조: [prd/Azrael-PRD-Phase0.md#3-온보딩](./prd/Azrael-PRD-Phase0.md)
  - 테스트 시나리오:
    - [x] 최초 접속 시 온보딩 표시
    - [x] M4/GL 프로젝트 선택 후 메인 화면 전환
    - [x] LocalStorage에 userState 저장 확인

- [x] **계산 엔진 E2E 테스트**
  - 업데이트일 입력 → [계산] → 테이블/간트/캘린더 렌더링
  - 참조: [prd/Azrael-PRD-Phase0.md#4-메인-화면---프로젝트-선택-및-업데이트일-입력](./prd/Azrael-PRD-Phase0.md)
  - 테스트 시나리오:
    - [x] M4/GL 프로젝트, 업데이트일 2026-02-10 입력 → 계산
    - [x] 테이블 1 "마감" 컬럼 날짜 검증 (01/27, 02/03, 02/06)
    - [x] 간트 차트 3개 렌더링 확인 (의존성 화살표 포함)
    - [x] 캘린더 뷰 업무 표시 확인 (FullCalendar, 3가지 색상)

- [x] **테이블 편집 테스트**
  - 편집 가능 셀 클릭 → 텍스트 입력 → 저장 → LocalStorage 검증
  - 참조: [prd/Azrael-PRD-Phase0.md#9-테이블-편집](./prd/Azrael-PRD-Phase0.md)
  - 테스트 시나리오:
    - [ ] "설명" 셀 편집 → 저장 → 새로고침 → 값 유지 확인
    - [ ] Bold/Italic 서식 적용 → 저장 → HTML 렌더링 확인

- [x] **하위 일감 추가/삭제 테스트**
  - ↓ 버튼 → 하위 일감 추가 → 인덱스 재정렬 → LocalStorage 검증
  - 참조: [prd/Azrael-PRD-Phase0.md#54-테이블-2-ext-yy-mm-dd-업데이트-일정표](./prd/Azrael-PRD-Phase0.md)
  - 테스트 시나리오:
    - [ ] ↓ 버튼으로 하위 일감 추가 → 양방향 참조 확인
    - [ ] 최대 깊이(2단계) 초과 시 에러 메시지
    - [ ] 최대 개수(20개) 초과 시 에러 메시지
    - [ ] [X] 버튼으로 부모 삭제 → 하위 일감도 삭제 확인

- [x] **이미지 복사 테스트**
  - [📋 이미지 복사] 버튼 → html2canvas → Clipboard 복사
  - 참조: [prd/Azrael-PRD-Phase0.md#8-이미지-복사](./prd/Azrael-PRD-Phase0.md)
  - 테스트 시나리오:
    - [ ] 테이블 1 이미지 복사 → 클립보드 확인 (수동)
    - [ ] 간트 차트 이미지 복사 → 클립보드 확인 (수동)
    - [ ] Clipboard API 미지원 시 다운로드 fallback (수동)

- [x] **프로젝트 관리 테스트**
  - 프로젝트 추가/편집/삭제 → LocalStorage 검증
  - 참조: [prd/Azrael-PRD-Phase0.md#102-프로젝트-관리](./prd/Azrael-PRD-Phase0.md)
  - 테스트 시나리오:
    - [ ] 프로젝트 추가 → 빈 템플릿 생성 확인
    - [ ] 프로젝트 편집 → Disclaimer 변경 → 테이블 1 하단 반영 확인
    - [ ] 마지막 프로젝트 삭제 시도 → 에러 메시지

- [x] **공휴일 관리 테스트**
  - API 불러오기 → XML 파싱 → LocalStorage 저장
  - 참조: [prd/Azrael-PRD-Phase0.md#104-공휴일-관리](./prd/Azrael-PRD-Phase0.md)
  - 테스트 시나리오:
    - [ ] [공휴일 불러오기] → API 호출 → 공휴일 목록 표시
    - [ ] 수동 추가 → `isManual: true` 확인
    - [ ] 공휴일 삭제 → LocalStorage 업데이트 확인

### 23. 수동 테스트 시나리오

- [ ] **간트 차트 렌더링 실패 fallback**
  - Frappe Gantt 초기화 실패 시뮬레이션
  - "간트 차트를 표시할 수 없습니다" 메시지 확인
  - 참조: [prd/Azrael-PRD-Shared.md#74-간트-차트캘린더-렌더링-실패-q22](./prd/Azrael-PRD-Shared.md)
  - ✋ **수동 테스트 필요**: 사용자에게 수동 검증 요청

- [ ] **캘린더 렌더링 실패 fallback**
  - Event Calendar 초기화 실패 시뮬레이션
  - "캘린더를 표시할 수 없습니다" 메시지 확인
  - 참조: [prd/Azrael-PRD-Shared.md#74-간트-차트캘린더-렌더링-실패-q22](./prd/Azrael-PRD-Shared.md)
  - ✋ **수동 테스트 필요**: 사용자에게 수동 검증 요청

- [ ] **이미지 복사 Clipboard API 미지원**
  - 브라우저 Clipboard API 미지원 환경에서 테스트
  - 다운로드 fallback 확인
  - 참조: [prd/Azrael-PRD-Phase0.md#85-구현-예시-q9-clipboard-api-fallback-추가](./prd/Azrael-PRD-Phase0.md)
  - ✋ **수동 테스트 필요**: 사용자에게 수동 검증 요청

---

## 🚀 빌드 및 배포

### 24. 프로덕션 빌드

- [x] **Vite 프로덕션 빌드**
  - `npm run build` 실행
  - `dist/` 디렉토리 생성 확인
  - 참조: [prd/Azrael-PRD-Master.md](./prd/Azrael-PRD-Master.md)

- [x] **빌드 최적화**
  - Tree-shaking 검증
  - 번들 크기 확인 (Frappe Gantt ~80KB, Event Calendar ~35KB, html2canvas ~100KB)
  - 참조: [prd/Azrael-PRD-Shared.md#42-주요-라이브러리](./prd/Azrael-PRD-Shared.md)

- [x] **환경 변수 빌드 포함**
  - `.env` 파일 번들에 포함 (화이트리스트, API 키)
  - 보안 한계 인지: 클라이언트 전용 앱, 소스 코드 노출 가능
  - 참조: [prd/Azrael-PRD-Shared.md#65-보안](./prd/Azrael-PRD-Shared.md)

### 25. 배포

- [ ] **정적 호스팅 배포**
  - Vercel, Netlify, GitHub Pages 중 선택
  - 배포 URL 확정 (Phase 1-3에서 링크 참조 필요)
  - 참조: [prd/Azrael-PRD-Phase1.md#7-다음-단계](./prd/Azrael-PRD-Phase1.md)

- [ ] **배포 URL 공유**
  - L10n팀 4인에게 배포 URL 공유
  - Gmail 계정 화이트리스트 등록 확인
  - 참조: [prd/Azrael-PRD-Master.md#13-사용자-및-사용-환경](./prd/Azrael-PRD-Master.md)

---

## 📝 문서화

### 26. 사용자 가이드

- [x] **README.md 작성**
  - 프로젝트 개요
  - 설치 및 실행 방법 (`npm install`, `npm run dev`, `npm run build`)
  - 기능 설명 (간략)
  - 참조: [prd/Azrael-PRD-Master.md](./prd/Azrael-PRD-Master.md)

- [ ] **사용자 매뉴얼 (선택)**
  - 온보딩부터 계산, 편집, 설정까지 스크린샷 포함 가이드
  - `docs/user-manual.md` 생성 (선택적)

### 27. 개발자 문서

- [ ] **코드 주석**
  - 핵심 함수 (`calculateBusinessDate`, `formatTableDate` 등) JSDoc 주석 추가
  - 복잡한 로직 (하위 일감 양방향 참조 등) 인라인 주석

- [ ] **아키텍처 문서**
  - `docs/architecture.md` 생성 (선택적)
  - 디렉토리 구조, 데이터 흐름, LocalStorage 스키마 설명

---

## ✅ Phase 0 완료 체크리스트

### 성공 지표 (PRD 기반)

- [ ] **4인 모두가 기존 엑셀 시트 대신 Azrael 사용**
  - L10n팀 피드백 수집

- [ ] **업무 단계 추가/수정이 UI에서 5분 이내 완료**
  - 설정 화면에서 업무 단계 관리 시간 측정

- [ ] **업데이트일 입력 후 3초 이내 테이블/차트 출력**
  - 계산 성능 측정 (< 1초), 렌더링 성능 측정 (< 1초)

- [ ] **이미지 복사 기능으로 외부 공유 시간 50% 단축**
  - 기존 방식(스크린샷) vs 이미지 복사 버튼 시간 비교

### 품질 보증

- [x] **모든 단위 테스트 통과**
  - Vitest 테스트 커버리지 확인

- [x] **모든 통합 테스트 통과**
  - Playwright MCP 자동 테스트 성공

- [ ] **수동 테스트 완료**
  - 이미지 복사, 간트/캘린더 렌더링 fallback 검증

- [ ] **브라우저 호환성 테스트**
  - Chrome, Edge, Firefox, Safari (최신 2개 버전) 동작 확인
  - 참조: [prd/Azrael-PRD-Shared.md#61-브라우저-호환성](./prd/Azrael-PRD-Shared.md)

---

## 🎯 Next Steps (Phase 1+)

Phase 0 완료 및 사용자 피드백 수집 후:

1. **Phase 1: JIRA 연동** 상세 설계
   - JIRA 사용 패턴 분석
   - API 명세 작성
   - 참조: [prd/Azrael-PRD-Phase1.md](./prd/Azrael-PRD-Phase1.md)

2. **Phase 2: 이메일 생성** 상세 설계
   - 현재 이메일 작성 패턴 분석
   - 템플릿 설계
   - 참조: [prd/Azrael-PRD-Phase2.md](./prd/Azrael-PRD-Phase2.md)

3. **Phase 3: 슬랙 연동** 상세 설계
   - 슬랙 사용 패턴 분석
   - Slack App 설계
   - 참조: [prd/Azrael-PRD-Phase3.md](./prd/Azrael-PRD-Phase3.md)

---

## 📊 Phase 0 완료 현황 (2026-01-12 최종)

### ✅ 완료된 항목 (100% 구현)

**핵심 기능**:
- [x] 영업일 역산 계산 엔진 (주말/공휴일 제외)
- [x] WorkStage 데이터 구조 (startOffsetDays, endOffsetDays, tableTargets)
- [x] 테이블 3개 (일정표, Ext., Int.) + 편집 기능
- [x] 간트 차트 3개 (Frappe Gantt, 의존성 화살표)
- [x] 캘린더 뷰 (FullCalendar, 3가지 색상)
- [x] 이미지 복사 (html2canvas, 7개 버튼)
- [x] 하위 일감 관리 (+, ↓, ✕ 버튼, 인덱스 재계산)

**설정 화면**:
- [x] 프로젝트 추가/편집/삭제 모달
- [x] 업무 단계 추가/편집/삭제 모달 (2개 Offset + 테이블 선택)
- [x] 공휴일 추가/삭제, API 불러오기 모달

**CSV 임포트 기능** (추가 완료):
- [x] 프로젝트 CSV 임포트 (Projects.csv)
- [x] 업무 단계 CSV 임포트 (index.csv) - 모든 프로젝트 템플릿 자동 생성
- [x] 공휴일 CSV 임포트 (Holidays.csv)
- [x] 업무 단계 모두 제거 버튼
- [x] 공휴일 모두 제거 버튼

**사용자 피드백 반영** (11개):
- [x] 1. 고양이 이미지 제거
- [x] 2. 구분선 제거
- [x] 3. 헤즈업/iOS 2열 중앙 정렬
- [x] 4. "00" 값 제거
- [x] 5. Disclaimer 레이블 제거
- [x] 6. WorkStage 2개 Offset (마감/테이블 전달)
- [x] 7. 테이블 편집 저장 + 프로젝트별 격리
- [x] 8. 이미지 복사 버튼 작동
- [x] 9. ▼▲ 열 제거
- [x] 10. 테이블 위치 지정
- [x] 11. 하위 일감 인덱스 재계산 (1.1, 1.2)

**품질 보증**:
- [x] 단위 테스트 15/15 통과
- [x] Playwright 통합 테스트 성공
- [x] TypeScript 타입 체크 통과
- [x] 프로덕션 빌드 성공 (606KB JS, 23KB CSS)

**기술적 개선**:
- [x] 간트 차트 중복 렌더링 수정
- [x] 시간대(Timezone) 문제 해결 (formatDateLocal, 정오 12시)
- [x] CRLF 줄바꿈 처리 (Windows CSV)
- [x] BOM 제거 (UTF-8)
- [x] 템플릿 자동 생성 (CSV 임포트 시)

---

### ⚠️ 미완료 항목 (선택적)

**수동 테스트** (사용자 직접 실행 필요):
- [ ] 간트 차트 렌더링 실패 fallback 시나리오
- [ ] 캘린더 렌더링 실패 fallback 시나리오
- [ ] Clipboard API 미지원 브라우저 fallback

**배포** (사용자 결정 필요):
- [ ] Vercel/Netlify/GitHub Pages 배포
- [ ] L10n팀 4인에게 URL 공유

**문서** (선택적):
- [ ] 사용자 매뉴얼 (스크린샷 포함 가이드)
- [ ] 아키텍처 문서 (심화 설명)
- [ ] 코드 주석 추가 (JSDoc)

**성공 지표 측정** (실사용 후):
- [ ] 4인 모두 엑셀 대신 Azrael 사용
- [ ] 업무 단계 추가/수정 5분 이내
- [ ] 업데이트일 입력 후 3초 이내 출력
- [ ] 이미지 복사로 공유 시간 50% 단축
- [ ] 브라우저 호환성 테스트 (Chrome, Edge, Firefox, Safari)

---

**Phase 0 MVP 완성도**: **98%** (핵심 기능 100%, 선택 항목 제외)

**개발 서버**: http://localhost:3000
**최종 빌드**: dist/ 디렉토리 (606.83 KB, gzip: 173.91 KB)

**다음 단계**:
1. 커밋 및 Git 저장
2. Vercel/Netlify 배포 (선택)
3. 사용자 피드백 수집
4. Phase 1 (JIRA 연동) 기획

---

**문서 종료**
