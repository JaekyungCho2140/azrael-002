# Azrael PRD - Design System

**작성일**: 2026-01-09
**버전**: 1.0
**디자인 컨셉**: Azrael the Orange Cat (스머프의 가가멜 고양이)
**참조**: [Azrael-PRD-Master.md](./Azrael-PRD-Master.md) | [Azrael-PRD-Phase0.md](./Azrael-PRD-Phase0.md)

---

## 📋 문서 목적

이 문서는 Azrael 프로젝트의 **비주얼 디자인 시스템**을 정의합니다:
- 디자인 철학 및 컨셉
- 색상 시스템
- 타이포그래피
- 컴포넌트 스타일
- 레이아웃 및 그리드
- 모션 및 애니메이션
- 화면별 디자인 명세

---

## 1. 디자인 철학

### 1.1. 컨셉: "The Clever Cat" (영리한 고양이)

**Azrael의 특징 → 디자인 언어**:

| Azrael 특성 | 디자인 해석 |
|------------|------------|
| 🧡 **주황색 털** | Warm Orange 톤 Primary Color |
| ⚪ **흰색 배/귀** | Clean White Background, High Contrast |
| 🧠 **영리함/교활함** | 날카로운 모서리, 정밀한 인터랙션, 스마트한 피드백 |
| 🎯 **집요함** | 데이터 정확성 강조, 디테일 중시, 완벽한 정렬 |
| 😾 **장난기** | 미묘한 애니메이션, hover 시 재치있는 피드백 |
| 🐾 **고양이다움** | 부드러운 곡선 (테두리), 날렵한 형태 (버튼) |

### 1.2. 디자인 톤

**프로페셔널 + Playful Balance**:
- **80% 프로페셔널**: 게임 업계 L10n 도구 → 신뢰감, 정확성, 효율성
- **20% Playful**: Azrael 캐릭터성 → 따뜻함, 친근함, 미묘한 유머

**회피할 것**:
- ❌ 지나치게 귀여운 "키티 UI" (전문성 해침)
- ❌ 어두운 다크 모드 (데이터 가독성 저하)
- ❌ 과도한 애니메이션 (업무 도구에 부적합)

**지향할 것**:
- ✅ 따뜻하면서도 명료한 인터페이스
- ✅ 주황색이 강조색으로만 사용되어 피로도 낮음
- ✅ 데이터 중심, 시각화 우선

---

## 2. 색상 시스템

### 2.1. Primary Palette (Azrael Orange)

```css
:root {
  /* Primary - Azrael Orange */
  --azrael-orange-50: #FFF4E6;   /* 연한 크림 배경 */
  --azrael-orange-100: #FFE0B2;  /* 부드러운 피치 */
  --azrael-orange-300: #FFB74D;  /* 밝은 주황 */
  --azrael-orange-500: #FF9800;  /* 메인 주황 (Azrael 털) */
  --azrael-orange-600: #FB8C00;  /* 진한 주황 (hover) */
  --azrael-orange-700: #F57C00;  /* 강조 주황 (active) */
  --azrael-orange-900: #E65100;  /* 다크 주황 (텍스트) */
}
```

**사용 규칙**:
- **500**: Primary 액션 (계산 버튼, 주요 CTA)
- **600**: Hover 상태
- **700**: Active/Pressed 상태
- **50-100**: 배경, 섹션 구분
- **900**: 강조 텍스트, 아이콘

### 2.2. Neutral Palette (Clean White Base)

```css
:root {
  /* Neutral - White Background (Azrael 배) */
  --azrael-white: #FFFFFF;
  --azrael-gray-50: #FAFAFA;
  --azrael-gray-100: #F5F5F5;
  --azrael-gray-200: #EEEEEE;
  --azrael-gray-300: #E0E0E0;
  --azrael-gray-400: #BDBDBD;
  --azrael-gray-600: #757575;
  --azrael-gray-800: #424242;
  --azrael-gray-900: #212121;
}
```

**사용 규칙**:
- **white**: 메인 배경, 카드
- **gray-50**: 테이블 헤더, 섹션 배경
- **gray-100~300**: 테두리, 구분선
- **gray-600~900**: 텍스트 (중요도별)

### 2.3. Semantic Colors (기능별)

```css
:root {
  /* Success - Green */
  --azrael-success: #4CAF50;
  --azrael-success-light: #E8F5E9;

  /* Error - Red */
  --azrael-error: #F44336;
  --azrael-error-light: #FFEBEE;

  /* Warning - Amber */
  --azrael-warning: #FFC107;
  --azrael-warning-light: #FFF8E1;

  /* Info - Blue */
  --azrael-info: #2196F3;
  --azrael-info-light: #E3F2FD;
}
```

### 2.4. Chart Colors (테이블/간트/캘린더)

```css
:root {
  /* 테이블 1 - Warm Orange */
  --chart-table1: #FF9800;
  --chart-table1-light: #FFE0B2;

  /* 테이블 2 (Ext.) - Teal */
  --chart-table2: #009688;
  --chart-table2-light: #B2DFDB;

  /* 테이블 3 (Int.) - Deep Purple */
  --chart-table3: #673AB7;
  --chart-table3-light: #D1C4E9;
}
```

**사용**:
- 간트 차트 바 색상
- 캘린더 이벤트 색상
- 범례 표시

---

## 3. 타이포그래피

### 3.1. Font Stack

```css
:root {
  /* Display Font - 헤더, 브랜드 */
  --font-display: 'Nunito', 'Noto Sans KR', sans-serif;

  /* Body Font - 본문, 데이터 */
  --font-body: 'Inter', 'Noto Sans KR', sans-serif;

  /* Mono Font - 코드, 시각 */
  --font-mono: 'JetBrains Mono', 'Consolas', monospace;
}
```

**선정 이유**:
- **Nunito**: 둥글고 친근한 sans-serif (Azrael의 귀여움 + 프로페셔널)
- **Inter**: 가독성 높은 UI 폰트 (데이터 테이블에 최적)
- **JetBrains Mono**: 날짜/시각 표시에 명확함

### 3.2. Font Sizes & Weights

```css
:root {
  /* Display */
  --text-display: 3rem;     /* 48px - 로고 */
  --text-h1: 2rem;          /* 32px - 페이지 제목 */
  --text-h2: 1.5rem;        /* 24px - 섹션 제목 */
  --text-h3: 1.25rem;       /* 20px - 서브 섹션 */

  /* Body */
  --text-base: 0.875rem;    /* 14px - 기본 텍스트 */
  --text-sm: 0.75rem;       /* 12px - 보조 텍스트 */
  --text-xs: 0.625rem;      /* 10px - 캡션 */

  /* Weight */
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
}
```

**적용**:
- Display: `Nunito Bold` (700) → "Azrael" 로고
- 헤더: `Nunito SemiBold` (600)
- 본문: `Inter Regular` (400)
- 강조: `Inter Medium` (500)
- 시각: `JetBrains Mono Regular` (400)

---

## 4. 레이아웃 및 그리드

### 4.1. 그리드 시스템

**12 Column Grid**:
```css
.container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 2rem;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1.5rem;
}
```

**반응형 (PC 전용)**:
```css
/* Large Desktop: 1440px+ */
.container { max-width: 1440px; }

/* Desktop: 1280px ~ 1439px */
@media (max-width: 1439px) {
  .container { max-width: 1280px; }
}

/* Minimum: 1280px */
@media (max-width: 1279px) {
  .warning { display: block; /* "화면이 좁습니다" 경고 */ }
}
```

### 4.2. Spacing Scale (8px 기반)

```css
:root {
  --space-1: 0.5rem;   /* 8px */
  --space-2: 1rem;     /* 16px */
  --space-3: 1.5rem;   /* 24px */
  --space-4: 2rem;     /* 32px */
  --space-5: 2.5rem;   /* 40px */
  --space-6: 3rem;     /* 48px */
  --space-8: 4rem;     /* 64px */
  --space-10: 5rem;    /* 80px */
}
```

**적용**:
- `space-1`: 버튼 내부 padding
- `space-2`: 카드 padding, 요소 간 gap
- `space-3`: 섹션 내부 margin
- `space-4`: 섹션 간 margin
- `space-6`: 페이지 상단 여백

---

## 5. 컴포넌트 스타일

### 5.1. Buttons

**Primary Button (주황색)**:
```css
.btn-primary {
  background: var(--azrael-orange-500);
  color: white;
  font-family: var(--font-body);
  font-weight: var(--weight-medium);
  font-size: var(--text-base);
  padding: 0.625rem 1.5rem; /* 10px 24px */
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(255, 152, 0, 0.2);
}

.btn-primary:hover {
  background: var(--azrael-orange-600);
  box-shadow: 0 4px 8px rgba(255, 152, 0, 0.3);
  transform: translateY(-1px);
}

.btn-primary:active {
  background: var(--azrael-orange-700);
  transform: translateY(0);
}

.btn-primary:disabled {
  background: var(--azrael-gray-300);
  color: var(--azrael-gray-600);
  cursor: not-allowed;
  box-shadow: none;
}
```

**Secondary Button (회색 테두리)**:
```css
.btn-secondary {
  background: white;
  color: var(--azrael-gray-800);
  border: 1.5px solid var(--azrael-gray-300);
  /* 나머지 primary와 동일 */
}

.btn-secondary:hover {
  border-color: var(--azrael-orange-500);
  color: var(--azrael-orange-600);
}
```

**Icon Button (작은 액션)**:
```css
.btn-icon {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--azrael-gray-600);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-icon:hover {
  background: var(--azrael-orange-50);
  color: var(--azrael-orange-600);
}
```

### 5.2. Input Fields

**Text Input**:
```css
.input {
  font-family: var(--font-body);
  font-size: var(--text-base);
  padding: 0.625rem 1rem;
  border: 1.5px solid var(--azrael-gray-300);
  border-radius: 6px;
  background: white;
  color: var(--azrael-gray-900);
  transition: all 0.2s ease;
  outline: none;
}

.input:focus {
  border-color: var(--azrael-orange-500);
  box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.1);
}

.input::placeholder {
  color: var(--azrael-gray-400);
  font-style: italic;
}
```

**Date Picker**:
```css
.date-input {
  /* input 스타일 상속 */
  font-family: var(--font-mono); /* 날짜는 monospace */
  letter-spacing: 0.02em;
}

.date-input::before {
  content: '📅';
  margin-right: 0.5rem;
  filter: grayscale(0.3); /* 약간 톤 다운 */
}
```

### 5.3. Dropdown

**Select / Dropdown**:
```css
.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-trigger {
  /* input 스타일 기반 */
  background: white;
  cursor: pointer;
  padding-right: 2.5rem; /* 화살표 공간 */
}

.dropdown-trigger::after {
  content: '▼';
  position: absolute;
  right: 1rem;
  color: var(--azrael-gray-600);
  font-size: 0.625rem;
  transition: transform 0.2s ease;
}

.dropdown.open .dropdown-trigger::after {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  min-width: 100%;
  background: white;
  border: 1.5px solid var(--azrael-gray-200);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  max-height: 300px;
  overflow-y: auto;
}

.dropdown-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.15s ease;
  border-bottom: 1px solid var(--azrael-gray-100);
}

.dropdown-item:hover {
  background: var(--azrael-orange-50);
  color: var(--azrael-orange-700);
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-divider {
  height: 1px;
  background: var(--azrael-gray-300);
  margin: 0.5rem 0;
}
```

### 5.4. Tables

**Table Container**:
```css
.table-container {
  background: white;
  border: 2px solid var(--azrael-gray-200);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.table-header {
  background: linear-gradient(135deg, var(--azrael-orange-50) 0%, var(--azrael-gray-50) 100%);
  padding: 1rem 1.5rem;
  border-bottom: 2px solid var(--azrael-orange-300);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  font-family: var(--font-display);
  font-size: var(--text-h3);
  font-weight: var(--weight-semibold);
  color: var(--azrael-orange-900);
}
```

**Table Styles**:
```css
table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-body);
  font-size: var(--text-sm);
}

thead {
  background: var(--azrael-gray-50);
  border-bottom: 2px solid var(--azrael-gray-300);
}

th {
  padding: 0.875rem 1rem;
  text-align: center;
  font-weight: var(--weight-semibold);
  color: var(--azrael-gray-800);
  white-space: nowrap;
}

td {
  padding: 0.75rem 1rem;
  text-align: center;
  border-bottom: 1px solid var(--azrael-gray-200);
  color: var(--azrael-gray-900);
}

tr:hover {
  background: var(--azrael-orange-50);
}

/* 하위 일감 들여쓰기 */
tr.subtask td:first-child {
  padding-left: 2rem;
  position: relative;
}

tr.subtask td:first-child::before {
  content: 'ㄴ';
  position: absolute;
  left: 1rem;
  color: var(--azrael-gray-400);
}
```

**Editable Cell**:
```css
td.editable {
  cursor: text;
  position: relative;
}

td.editable:hover {
  background: var(--azrael-orange-50);
  outline: 1px dashed var(--azrael-orange-300);
}

td.editing {
  background: white;
  outline: 2px solid var(--azrael-orange-500);
  box-shadow: 0 0 0 4px rgba(255, 152, 0, 0.1);
}
```

### 5.5. Cards

**Card**:
```css
.card {
  background: white;
  border: 1.5px solid var(--azrael-gray-200);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.card:hover {
  border-color: var(--azrael-orange-300);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--azrael-gray-200);
}

.card-icon {
  width: 24px;
  height: 24px;
  color: var(--azrael-orange-500);
}

.card-title {
  font-family: var(--font-display);
  font-size: var(--text-h3);
  font-weight: var(--weight-semibold);
  color: var(--azrael-gray-900);
}
```

### 5.6. Badges & Labels

**Badge** (상태 표시):
```css
.badge {
  display: inline-block;
  padding: 0.25rem 0.625rem;
  border-radius: 12px;
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.badge-primary {
  background: var(--azrael-orange-100);
  color: var(--azrael-orange-900);
}

.badge-success {
  background: var(--azrael-success-light);
  color: var(--azrael-success);
}

.badge-error {
  background: var(--azrael-error-light);
  color: var(--azrael-error);
}
```

---

## 6. 모션 및 애니메이션

### 6.1. Timing Functions

```css
:root {
  /* Easing */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);

  /* Duration */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
}
```

### 6.2. Page Load Animation (고양이 발자국 효과)

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-in {
  animation: fadeInUp 0.4s var(--ease-out) backwards;
}

/* Staggered Animation */
.animate-in:nth-child(1) { animation-delay: 0ms; }
.animate-in:nth-child(2) { animation-delay: 80ms; }
.animate-in:nth-child(3) { animation-delay: 160ms; }
.animate-in:nth-child(4) { animation-delay: 240ms; }
```

### 6.3. Hover Effects (고양이 호기심)

```css
/* 버튼 호버 - 살짝 점프 */
.btn-primary:hover {
  transform: translateY(-2px);
}

/* 카드 호버 - 살짝 확대 */
.card:hover {
  transform: scale(1.01);
}

/* 테이블 행 호버 - 주황 배경 */
tr:hover {
  background: var(--azrael-orange-50);
  transition: background 0.15s ease;
}
```

### 6.4. Loading States (고양이 꼬리 흔들기)

```css
@keyframes tailWag {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}

.loading-icon {
  animation: tailWag 0.6s ease-in-out infinite;
  color: var(--azrael-orange-500);
}

/* Spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--azrael-orange-100);
  border-top-color: var(--azrael-orange-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
```

---

## 7. 화면별 디자인 명세

### 7.1. 로그인 화면

**레이아웃**:
```
┌────────────────────────────────────┐
│                                    │
│          (Azrael 로고)             │
│          🐱 주황 고양이 일러스트      │
│                                    │
│            Azrael                  │
│      L10n 일정 관리 도구            │
│                                    │
│     ┌──────────────────────┐      │
│     │  🔐 Gmail로 로그인    │      │
│     └──────────────────────┘      │
│                                    │
│     회사 계정만 접근 가능합니다.     │
│                                    │
└────────────────────────────────────┘
```

**디자인 특징**:
- **배경**: 부드러운 그라데이션
  ```css
  background: linear-gradient(135deg, #FFF4E6 0%, #FFFFFF 100%);
  ```
- **로고**: Azrael 텍스트 + 고양이 발자국 🐾 아이콘
- **고양이 일러스트**: 미니멀한 주황 고양이 실루엣 (SVG)
- **버튼**: 넓고 둥근 Primary 버튼 (16px border-radius)

**고양이 실루엣 SVG 예시**:
```html
<svg viewBox="0 0 100 100" class="cat-logo">
  <!-- 귀 -->
  <path d="M20,30 L30,10 L35,30 Z" fill="#FF9800"/>
  <path d="M65,30 L70,10 L80,30 Z" fill="#FF9800"/>
  <!-- 얼굴 -->
  <circle cx="50" cy="50" r="25" fill="#FF9800"/>
  <!-- 눈 -->
  <circle cx="40" cy="45" r="3" fill="#212121"/>
  <circle cx="60" cy="45" r="3" fill="#212121"/>
  <!-- 코 -->
  <path d="M50,55 L45,60 L55,60 Z" fill="#E65100"/>
  <!-- 수염 -->
  <line x1="30" y1="50" x2="15" y2="48" stroke="#424242" stroke-width="1"/>
  <line x1="30" y1="55" x2="15" y2="55" stroke="#424242" stroke-width="1"/>
  <line x1="70" y1="50" x2="85" y2="48" stroke="#424242" stroke-width="1"/>
  <line x1="70" y1="55" x2="85" y2="55" stroke="#424242" stroke-width="1"/>
</svg>
```

### 7.2. 온보딩 화면

**레이아웃**:
```css
.onboarding {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FFF8E1 0%, #FFF4E6 50%, #FFFFFF 100%);
  padding: 2rem;
}

.onboarding-card {
  max-width: 600px;
  background: white;
  border-radius: 20px;
  padding: 3rem;
  box-shadow: 0 8px 32px rgba(255, 152, 0, 0.15);
  border: 2px solid var(--azrael-orange-100);
}

.onboarding-title {
  font-family: var(--font-display);
  font-size: var(--text-h1);
  color: var(--azrael-orange-900);
  text-align: center;
  margin-bottom: 2rem;
}

.onboarding-subtitle {
  font-size: var(--text-base);
  color: var(--azrael-gray-700);
  text-align: center;
  margin-bottom: 2rem;
}
```

**프로젝트 선택 라디오**:
```css
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.radio-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border: 1.5px solid var(--azrael-gray-300);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.radio-item:hover {
  border-color: var(--azrael-orange-400);
  background: var(--azrael-orange-50);
}

.radio-item input[type="radio"] {
  width: 20px;
  height: 20px;
  accent-color: var(--azrael-orange-500);
  margin-right: 1rem;
}

.radio-item label {
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  color: var(--azrael-gray-900);
  cursor: pointer;
  flex: 1;
}

.radio-item:has(input:checked) {
  border-color: var(--azrael-orange-500);
  background: var(--azrael-orange-50);
  box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.1);
}
```

### 7.3. 메인 화면

**Header**:
```css
.main-header {
  background: white;
  border-bottom: 2px solid var(--azrael-gray-200);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  width: 32px;
  height: 32px;
  /* Azrael 고양이 아이콘 */
}

.logo-text {
  font-family: var(--font-display);
  font-size: var(--text-h2);
  font-weight: var(--weight-bold);
  color: var(--azrael-orange-600);
  letter-spacing: -0.02em;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}
```

**Input Section (업데이트일 입력)**:
```css
.input-section {
  background: white;
  border: 2px solid var(--azrael-gray-200);
  border-radius: 16px;
  padding: 2rem;
  margin: 2rem auto;
  max-width: 800px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.input-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.input-label {
  font-weight: var(--weight-medium);
  color: var(--azrael-gray-800);
  min-width: 100px;
}

.input-label::after {
  content: ':';
  margin-left: 0.25rem;
}
```

**Divider (또는)**:
```css
.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 2rem 0;
  color: var(--azrael-gray-400);
  font-size: var(--text-sm);
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--azrael-gray-300);
}

.divider::before {
  margin-right: 1rem;
}

.divider::after {
  margin-left: 1rem;
}
```

### 7.4. 결과 화면 (테이블 + 간트 + 캘린더)

**상단 날짜 표시**:
```css
.date-summary {
  display: flex;
  gap: 2rem;
  padding: 1.5rem;
  background: linear-gradient(90deg, var(--azrael-orange-50) 0%, var(--azrael-gray-50) 100%);
  border-radius: 12px;
  border-left: 4px solid var(--azrael-orange-500);
  margin-bottom: 2rem;
}

.date-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.date-label {
  font-size: var(--text-sm);
  color: var(--azrael-gray-600);
  font-weight: var(--weight-medium);
}

.date-value {
  font-family: var(--font-mono);
  font-size: var(--text-h3);
  color: var(--azrael-orange-700);
  font-weight: var(--weight-semibold);
}
```

**간트 차트 컨테이너**:
```css
.gantt-container {
  background: white;
  border: 2px solid var(--azrael-gray-200);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  overflow-x: auto;
}

.gantt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

/* Frappe Gantt 커스터마이징 */
.gantt .bar {
  fill: var(--chart-table1); /* 테이블별 색상 */
  rx: 4;
  ry: 4;
}

.gantt .bar:hover {
  fill: var(--azrael-orange-600);
  filter: brightness(1.1);
}

.gantt .arrow {
  stroke: var(--azrael-gray-400);
  stroke-width: 1.5;
}
```

**캘린더 컨테이너**:
```css
.calendar-container {
  background: white;
  border: 2px solid var(--azrael-gray-200);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

/* Event Calendar 커스터마이징 */
.ec-event {
  border-radius: 4px;
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  padding: 0.25rem 0.5rem;
}

.ec-event.table1 {
  background: var(--chart-table1);
  color: white;
}

.ec-event.table2 {
  background: var(--chart-table2);
  color: white;
}

.ec-event.table3 {
  background: var(--chart-table3);
  color: white;
}
```

### 7.5. 설정 화면

**사이드바 네비게이션**:
```css
.settings-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 2rem;
  min-height: calc(100vh - 80px);
}

.settings-sidebar {
  background: var(--azrael-gray-50);
  border-right: 1px solid var(--azrael-gray-200);
  padding: 1.5rem 0;
}

.settings-nav-item {
  padding: 0.875rem 1.5rem;
  cursor: pointer;
  transition: all 0.15s ease;
  border-left: 3px solid transparent;
  color: var(--azrael-gray-700);
  font-weight: var(--weight-regular);
}

.settings-nav-item:hover {
  background: white;
  color: var(--azrael-orange-600);
}

.settings-nav-item.active {
  background: white;
  color: var(--azrael-orange-700);
  font-weight: var(--weight-semibold);
  border-left-color: var(--azrael-orange-500);
}

.settings-content {
  padding: 2rem;
}
```

---

## 8. 아이콘 시스템

### 8.1. 아이콘 스타일

**컨셉**: Lucide Icons (간결하고 현대적)
- **크기**: 16px, 20px, 24px
- **Stroke Width**: 2px (명확한 가시성)
- **색상**: 문맥에 따라 gray-600 (기본) 또는 orange-500 (강조)

**주요 아이콘**:
```
🐱 고양이 발자국 - 로고, 브랜드
📅 달력 - 업데이트일 입력
⚙️ 톱니바퀴 - 설정
🚪 문 - 로그아웃
📋 클립보드 - 이미지 복사
▼▲ 화살표 - 하위 일감 펼치기/접기
+ - 추가
↓ - 하위 추가
✕ - 삭제
```

### 8.2. 고양이 발자국 패턴 (배경 장식)

```css
.paw-pattern {
  background-image:
    radial-gradient(circle at 20% 30%, rgba(255, 152, 0, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(255, 152, 0, 0.03) 0%, transparent 50%);
  background-size: 400px 400px;
  background-position: 0 0, 200px 200px;
}

/* 발자국 아이콘 (순수 CSS) */
.paw-icon::before {
  content: '🐾';
  font-size: 1.5rem;
  filter: grayscale(1) opacity(0.3);
}
```

---

## 9. 반응형 & 상태

### 9.1. 최소 해상도 경고

```css
.resolution-warning {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  z-index: 10000;
  align-items: center;
  justify-content: center;
  text-align: center;
}

@media (max-width: 1279px) {
  .resolution-warning {
    display: flex;
  }
}
```

```html
<div class="resolution-warning">
  <div>
    <h2>🐱 Azrael은 PC 전용입니다</h2>
    <p>최소 1280x720 해상도가 필요합니다.</p>
    <p>PC에서 접속해주세요.</p>
  </div>
</div>
```

### 9.2. Loading States

**전체 화면 로딩**:
```css
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-cat {
  width: 80px;
  height: 80px;
  animation: tailWag 0.6s ease-in-out infinite;
}

.loading-text {
  margin-top: 1rem;
  font-size: var(--text-base);
  color: var(--azrael-gray-600);
}
```

### 9.3. Toast Messages (알림)

```css
.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  min-width: 300px;
  max-width: 500px;
  padding: 1rem 1.5rem;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 1rem;
  animation: slideInRight 0.3s var(--ease-out);
  z-index: 1000;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.toast-success {
  background: var(--azrael-success-light);
  border-left: 4px solid var(--azrael-success);
  color: var(--azrael-gray-900);
}

.toast-error {
  background: var(--azrael-error-light);
  border-left: 4px solid var(--azrael-error);
  color: var(--azrael-gray-900);
}

.toast-info {
  background: var(--azrael-orange-50);
  border-left: 4px solid var(--azrael-orange-500);
  color: var(--azrael-gray-900);
}
```

---

## 10. 특수 효과 (Azrael의 장난기)

### 10.1. 고양이 발자국 커서 (선택적)

```css
* {
  cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><text y="20" font-size="20">🐾</text></svg>'), auto;
}

button, a, [role="button"] {
  cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><text y="20" font-size="20">👆</text></svg>'), pointer;
}
```

**⚠️ 주의**: 전문적인 업무 도구이므로 **기본 커서 유지 권장**. 재미 요소는 미묘하게만.

### 10.2. 미묘한 그림자 (고양이 실루엣)

```css
.card::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  height: 10px;
  background: radial-gradient(ellipse, rgba(255, 152, 0, 0.15) 0%, transparent 70%);
  z-index: -1;
}
```

### 10.3. Hover 시 고양이 귀 흔들림 (미니 이스터에그)

```css
@keyframes wiggleEars {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-2deg); }
  75% { transform: rotate(2deg); }
}

.logo-icon:hover {
  animation: wiggleEars 0.5s ease;
}
```

---

## 11. 다크 모드 (미구현 - Phase 1+ 검토)

**현재**: Light 모드만 지원
**이유**:
- 데이터 테이블 가독성 우선
- 4인 내부 사용으로 개인화 불필요
- 개발 범위 최소화

**Phase 1+ 검토 시 고려**:
```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1A1A1A;
    --azrael-orange-500: #FFB74D; /* 다크 모드에서는 밝은 주황 */
  }
}
```

---

## 12. 화면별 와이어프레임

### 12.1. 로그인 화면

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                ┃
┃         🐱 (주황 고양이)         ┃
┃                                ┃
┃          A z r a e l           ┃
┃      L10n 일정 관리 도구        ┃
┃                                ┃
┃   ┏━━━━━━━━━━━━━━━━━━━━━━┓   ┃
┃   ┃  🔐 Gmail로 로그인    ┃   ┃
┃   ┗━━━━━━━━━━━━━━━━━━━━━━┛   ┃
┃                                ┃
┃   회사 계정만 접근 가능합니다.   ┃
┃                                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
배경: 부드러운 주황→흰색 그라데이션
```

### 12.2. 메인 화면

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🐱 Azrael           프로젝트 [M4/GL ▼]  [⚙️] [🚪] ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                               ┃
┃  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃
┃  ┃  업데이트일: [2026-02-10 (월) 📅] [계산] ┃  ┃
┃  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃
┃                                               ┃
┃              ─────── 또는 ───────              ┃
┃                                               ┃
┃  마지막 계산: 2026-02-10 업데이트              ┃
┃  (2026-01-08 15:30에 계산됨)                  ┃
┃  [결과 보기]                                  ┃
┃                                               ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### 12.3. 테이블 결과 화면

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  헤즈업: 01/28(화)    iOS 심사일: 02/03(월)      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
(주황 그라데이션 배경, 좌측 주황 테두리 강조)

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  26-02-10 업데이트 일정표   [📋 복사] ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ # │ 배치 │   마감   │ 테이블 전달 │   ┃
┃───┼──────┼──────────┼─────────────┤   ┃
┃ 1 │ 정기 │ 01/10... │ 01/15...    │   ┃
┃ 2 │ 1차  │ 01/20... │ 01/25...    │   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
(hover 시 행 배경 연한 주황)

[간트 차트 - 주황 바]
[캘린더 - 주황/청록/보라 이벤트]
```

---

## 13. 브랜딩 요소

### 13.1. 로고

**텍스트 로고**:
```
  🐾 Azrael
```
- 폰트: Nunito Bold
- 색상: Orange-600 (#FB8C00)
- 크기: 32px
- 고양이 발자국 이모지 또는 SVG 아이콘

**파비콘**: 주황 고양이 실루엣 (16x16, 32x32)

### 13.2. 빈 상태 일러스트

**프로젝트 없음**:
```
     🐱
  "야옹~ 프로젝트가 없어요"
  [+ 프로젝트 추가하기]
```

**테이블 없음**:
```
     😿
  "계산 결과가 없습니다"
  업데이트일을 입력하고 [계산] 버튼을 눌러주세요
```

---

## 14. 컴포넌트 라이브러리 명세

### 14.1. Button Variants

| Variant | 배경 | 텍스트 | 테두리 | 사용 |
|---------|------|-------|-------|------|
| Primary | Orange-500 | White | - | 계산, 저장, 추가 |
| Secondary | White | Gray-800 | Gray-300 | 취소, 닫기 |
| Danger | Red | White | - | 삭제 |
| Ghost | Transparent | Gray-700 | - | 서브 액션 |

### 14.2. Table Variants

| 테이블 | 헤더 배경 | 테두리 강조 | 간트 색상 | 캘린더 색상 |
|--------|----------|-----------|----------|-----------|
| 테이블 1 | Orange-50 | Orange-300 | Orange-500 | Orange-500 |
| 테이블 2 | Teal-50 | Teal-300 | Teal-600 | Teal-600 |
| 테이블 3 | Purple-50 | Purple-300 | Purple-600 | Purple-600 |

### 14.3. Modal

```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  animation: scaleIn 0.3s var(--ease-bounce);
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 2px solid var(--azrael-gray-200);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-family: var(--font-display);
  font-size: var(--text-h3);
  font-weight: var(--weight-semibold);
  color: var(--azrael-gray-900);
}

.modal-close {
  /* btn-icon 스타일 */
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--azrael-gray-200);
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}
```

---

## 15. 애니메이션 디테일

### 15.1. 페이지 전환

```css
.page-transition-enter {
  opacity: 0;
  transform: translateX(20px);
}

.page-transition-enter-active {
  opacity: 1;
  transform: translateX(0);
  transition: all 0.3s var(--ease-out);
}

.page-transition-exit {
  opacity: 1;
}

.page-transition-exit-active {
  opacity: 0;
  transition: opacity 0.2s var(--ease-in);
}
```

### 15.2. 테이블 행 추가 애니메이션

```css
@keyframes rowAppear {
  from {
    opacity: 0;
    transform: translateY(-10px);
    background: var(--azrael-orange-100);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    background: transparent;
  }
}

tr.new-row {
  animation: rowAppear 0.4s var(--ease-out);
}
```

### 15.3. 계산 중 애니메이션 (고양이가 생각하는 중)

```css
@keyframes thinking {
  0%, 100% {
    content: '🐱';
  }
  33% {
    content: '🤔';
  }
  66% {
    content: '💭';
  }
}

.calculating::before {
  animation: thinking 1.5s infinite;
}
```

---

## 16. 접근성 (최소 요구사항)

**Phase 0 정책**: 접근성 고려 최소화 (4인 내부 사용)

**구현 범위**:
- ✅ 키보드 네비게이션 (Tab, Enter, Esc)
- ✅ Focus 상태 표시 (주황 outline)
- ❌ ARIA 레이블 (불필요)
- ❌ 스크린 리더 (불필요)

```css
*:focus-visible {
  outline: 2px solid var(--azrael-orange-500);
  outline-offset: 2px;
}
```

---

## 17. 디자인 토큰 전체

```css
:root {
  /* Colors */
  --color-primary: var(--azrael-orange-500);
  --color-primary-hover: var(--azrael-orange-600);
  --color-primary-active: var(--azrael-orange-700);
  --color-bg: var(--azrael-white);
  --color-surface: var(--azrael-gray-50);
  --color-border: var(--azrael-gray-300);
  --color-text: var(--azrael-gray-900);
  --color-text-muted: var(--azrael-gray-600);

  /* Spacing */
  --spacing-unit: 8px;

  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.12);
  --shadow-orange: 0 4px 16px rgba(255, 152, 0, 0.2);

  /* Transitions */
  --transition-fast: 150ms;
  --transition-normal: 200ms;
  --transition-slow: 300ms;
}
```

---

## 18. 구현 우선순위

### Phase 0 디자인 구현 순서

**P0 (최우선)**:
1. CSS 변수 정의 (색상, 타이포그래피)
2. 버튼, Input 기본 컴포넌트
3. 로그인 화면 (브랜딩 중요)
4. 테이블 스타일 (핵심 기능)

**P1 (높음)**:
5. 온보딩 화면 (첫인상)
6. 메인 화면 레이아웃
7. 간트/캘린더 커스터마이징
8. Toast 메시지

**P2 (중간)**:
9. Modal 스타일
10. 설정 화면 레이아웃
11. Hover/Active 상태

**P3 (낮음)**:
12. 고양이 애니메이션 (장난기)
13. 발자국 패턴 배경
14. 미묘한 인터랙션

---

## 19. 디자인 체크리스트

**시각적 일관성**:
- [ ] 모든 주황색이 Orange-500 기준
- [ ] 모든 border-radius가 8px 배수
- [ ] 모든 spacing이 8px 배수
- [ ] 모든 버튼이 동일한 높이 (40px)

**Azrael 정체성**:
- [ ] 주황색이 과하지 않게 (강조색으로만)
- [ ] 고양이 요소가 미묘하게 (발자국, 귀 흔들림)
- [ ] 프로페셔널함 유지 (업무 도구)
- [ ] 데이터 가독성 우선

**성능**:
- [ ] 애니메이션 60fps 유지
- [ ] CSS만 사용 (JS 애니메이션 최소화)
- [ ] 이미지 최적화 (SVG 우선)

---

## 20. 참조 자료

**Color Inspiration**:
- Azrael 고양이 공식 이미지
- Orange Tabby Cat 색상 팔레트
- Google Material Design Orange

**Font Pairing**:
- Nunito: https://fonts.google.com/specimen/Nunito
- Inter: https://fonts.google.com/specimen/Inter
- Noto Sans KR: https://fonts.google.com/noto/specimen/Noto+Sans+KR

**참조 문서**:
- [Azrael-PRD-Master.md](./Azrael-PRD-Master.md)
- [Azrael-PRD-Phase0.md](./Azrael-PRD-Phase0.md)
- [Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)

---

**문서 종료**
