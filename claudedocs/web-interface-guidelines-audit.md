# Web Interface Guidelines 준수 감사 보고서

**프로젝트**: Azrael - L10n 일정 관리 도구
**감사 일자**: 2026-01-21
**감사 기준**: Vercel Web Interface Guidelines

---

## 요약

| 카테고리 | 준수 | 위반 | 심각도 |
|---------|------|------|--------|
| 접근성 (Accessibility) | 1 | 5 | 🔴 높음 |
| 폼 요소 (Forms) | 2 | 3 | 🟡 중간 |
| 애니메이션 (Animation) | 0 | 2 | 🟡 중간 |
| 포커스 상태 (Focus) | 1 | 4 | 🔴 높음 |
| 다크 모드 (Dark Mode) | 0 | 1 | 🟢 낮음 |
| 국제화 (i18n) | 0 | 1 | 🟢 낮음 |
| 터치 (Touch) | 0 | 1 | 🟢 낮음 |
| **총계** | **4** | **17** | - |

---

## ⚠️ 미구현 기능 관련 제안 유효성 검토

### 다크 모드 관련 (`color-scheme`)

**현재 상태**: Azrael은 **라이트 모드 전용** 앱입니다. 다크 모드를 지원하지 않습니다.

**제안 유효성**: ✅ **유효함**

`color-scheme` 설정은 다크 모드 "구현"을 의미하는 것이 아닙니다. 브라우저에게 "이 앱은 라이트 모드만 사용합니다"라고 **선언**하는 것입니다.

| 요소 | 설정 안 함 | `color-scheme: light` 설정 |
|------|-----------|---------------------------|
| 스크롤바 | 브라우저 기본 (OS 다크모드 시 검은 스크롤바) | 항상 라이트 스타일 |
| 폼 컨트롤 | OS 설정 따름 (불일치 가능) | 앱과 일관된 스타일 |
| 시스템 색상 | 예측 불가능 | 라이트 테마로 고정 |

**결론**: 다크 모드를 구현하지 않더라도, `color-scheme: light`를 명시하면 OS가 다크 모드여도 앱 UI가 일관되게 표시됩니다. **간단한 1줄 추가**로 해결 가능.

---

## 위반 항목 상세

### 🔴 심각도: 높음

#### 1. ARIA 속성 누락
**규칙**: 인터랙티브 요소에 적절한 ARIA 속성 필요

| 파일 | 라인 | 문제 |
|------|------|------|
| `Modal.tsx` | 21 | 모달 overlay에 `role="dialog"`, `aria-modal="true"` 누락 |
| `Modal.tsx` | 25 | 닫기 버튼에 `aria-label="닫기"` 누락 |
| `Toast.tsx` | 28 | Toast에 `role="alert"`, `aria-live="polite"` 누락 |
| `EditableCell.tsx` | 101-110 | contentEditable div에 `role="textbox"`, `aria-label` 누락 |

##### 💡 이 문제가 중요한 이유 (비개발자용)

**현재 상태로 유지하면?**
- 🚫 **시각 장애인 사용 불가**: 스크린 리더(화면 낭독기)가 모달이 열렸는지, 어떤 알림인지 인식하지 못합니다
- 🚫 **법적 리스크**: 장애인차별금지법에 따라 공공기관/대기업 대상 서비스는 접근성 의무화
- 🚫 **사용자 혼란**: 키보드만 사용하는 사용자가 "X" 버튼의 용도를 알 수 없음

**수정하면?**
- ✅ **스크린 리더 호환**: "대화상자가 열렸습니다", "닫기 버튼" 등 음성 안내
- ✅ **포용적 설계**: 장애인, 고령자 포함 더 많은 사용자가 이용 가능
- ✅ **SEO 및 품질 점수 향상**: Google Lighthouse 접근성 점수 개선

---

#### 2. `outline: none` 대체 포커스 스타일 없음
**규칙**: `outline` 제거 시 대체 포커스 표시자 필수

| 파일 | 라인 | 문제 |
|------|------|------|
| `ScheduleTable.css` | 78 | `outline: none` - 대체 스타일 없음 |
| `Input.css` | 27 | `outline: none` - `box-shadow`로 대체됨 ✅ |
| `MainScreen.css` | 55 | `outline: none` - 대체 스타일 확인 필요 |
| `Modal.css` | 125 | `outline: none` - 대체 스타일 확인 필요 |

##### 💡 이 문제가 중요한 이유 (비개발자용)

**현재 상태로 유지하면?**
- 🚫 **키보드 사용자 길 잃음**: Tab 키로 이동 시 현재 위치를 알 수 없음 (마치 마우스 커서가 안 보이는 것과 같음)
- 🚫 **실수 유발**: 어떤 버튼이 선택되었는지 모르고 Enter를 누르면 의도치 않은 동작 발생
- 🚫 **생산성 저하**: 마우스가 불편한 사용자(손목 부상, RSI 등)가 효율적으로 작업 불가

**수정하면?**
- ✅ **명확한 시각적 피드백**: 현재 선택된 요소가 하이라이트됨
- ✅ **키보드 탐색 가능**: 마우스 없이도 모든 기능 사용 가능
- ✅ **파워 유저 지원**: 단축키와 Tab 탐색을 선호하는 사용자 만족도 향상

---

#### 3. 폼 라벨과 입력 필드 연결 누락
**규칙**: 모든 `<input>`에 `id`와 `<label htmlFor>` 연결 필요

| 파일 | 라인 | 문제 |
|------|------|------|
| `Input.tsx` | 17 | `<input>`에 `id` 없음, `<label>`과 연결 안 됨 |
| `ProjectEditModal.tsx` | 전체 | 모든 input에 id/htmlFor 연결 누락 |
| `StageEditModal.tsx` | 전체 | 모든 input에 id/htmlFor 연결 누락 |
| `HolidayAddModal.tsx` | 66-70, 77-81 | input에 id/htmlFor 연결 누락 |

##### 💡 이 문제가 중요한 이유 (비개발자용)

**현재 상태로 유지하면?**
- 🚫 **클릭 영역 좁음**: "프로젝트명" 텍스트를 클릭해도 입력창에 포커스가 안 됨
- 🚫 **스크린 리더 혼란**: "텍스트 입력창"만 읽히고, 무엇을 입력하는지 알 수 없음
- 🚫 **모바일 불편**: 작은 입력창을 정확히 터치해야 함

**수정하면?**
- ✅ **넓은 클릭 영역**: 라벨 텍스트 클릭으로 입력창 포커스 (특히 체크박스에서 중요!)
- ✅ **접근성 향상**: 스크린 리더가 "프로젝트명 입력창"으로 정확히 안내
- ✅ **사용 편의성**: 특히 체크박스의 경우 텍스트 클릭으로 선택/해제 가능

---

### 🟡 심각도: 중간

#### 4. `transition: all` 사용 (성능 안티패턴)
**규칙**: 구체적인 속성만 transition 지정 (예: `transition: background-color 0.2s`)

| 파일 | 라인 | 현재 | 권장 |
|------|------|------|------|
| `Button.css` | 14 | `transition: all 0.2s` | `transition: background-color, box-shadow, transform 0.2s` |
| `Modal.css` | 55, 121 | `transition: all 0.15s` | 구체적 속성 지정 |
| `Input.css` | 26 | `transition: all 0.2s` | `transition: border-color, box-shadow 0.2s` |
| `EditableCell.css` | 33, 59 | `transition: all 0.15s` | 구체적 속성 지정 |
| `MainScreen.css` | 54 | `transition: all 0.2s` | 구체적 속성 지정 |
| `OnboardingScreen.css` | 54 | `transition: all 0.2s` | 구체적 속성 지정 |
| `CalendarView.css` | 80 | `transition: all 0.2s` | 구체적 속성 지정 |
| `SettingsScreen.css` | 43 | `transition: all 0.15s` | 구체적 속성 지정 |
| `ScheduleTable.css` | 105 | `transition: all 0.15s` | 구체적 속성 지정 |

##### 💡 이 문제가 중요한 이유 (비개발자용)

**현재 상태로 유지하면?**
- 🚫 **불필요한 연산**: 브라우저가 모든 CSS 속성 변화를 감시해야 함
- 🚫 **저사양 기기 버벅임**: 오래된 PC나 저가 태블릿에서 애니메이션 끊김
- 🚫 **배터리 소모**: 노트북/태블릿 배터리 수명 단축

**수정하면?**
- ✅ **최적화된 성능**: 필요한 속성만 애니메이션, CPU/GPU 부하 감소
- ✅ **부드러운 동작**: 저사양 기기에서도 60fps 유지
- ✅ **배터리 절약**: 불필요한 연산 제거

**체감 차이**: 현재 프로젝트 규모에서는 체감이 어려울 수 있으나, 데이터가 많아지면 성능 차이가 두드러집니다.

---

#### 5. `prefers-reduced-motion` 미지원
**규칙**: 애니메이션에 reduced-motion 미디어 쿼리 적용 필요

| 파일 | 문제 |
|------|------|
| `index.css` | 전역 reduced-motion 쿼리 없음 |
| `Modal.css` | 모달 애니메이션에 reduced-motion 미적용 |

##### 💡 이 문제가 중요한 이유 (비개발자용)

**현재 상태로 유지하면?**
- 🚫 **멀미 유발 가능**: 전정기관 장애, 편두통 환자에게 애니메이션이 어지럼증/구역질 유발
- 🚫 **OS 설정 무시**: 사용자가 "애니메이션 줄이기" 설정을 켜도 여전히 애니메이션 재생
- 🚫 **접근성 위반**: 일부 국가에서는 법적 요구사항

**수정하면?**
- ✅ **건강 배려**: 애니메이션 민감 사용자가 안전하게 사용 가능
- ✅ **사용자 선택 존중**: OS에서 "애니메이션 줄이기" 설정 시 즉시 적용
- ✅ **포용적 디자인**: 더 넓은 사용자층 지원

**대상 사용자**: 전정기관 장애, 간질, 편두통, ADHD 등 애니메이션에 민감한 사용자

---

#### 6. `autocomplete` 속성 누락
**규칙**: 적절한 입력 필드에 `autocomplete` 속성 필요

| 파일 | 라인 | 권장 |
|------|------|------|
| `SettingsScreen.tsx` | JIRA API Token 입력 | `autocomplete="off"` (보안 데이터) |

##### 💡 이 문제가 중요한 이유 (비개발자용)

**현재 상태로 유지하면?**
- 🚫 **보안 위험**: 브라우저가 API 토큰을 자동완성 목록에 저장할 수 있음
- 🚫 **의도치 않은 노출**: 다른 사이트에서 자동완성으로 토큰이 노출될 가능성
- 🚫 **공용 PC 위험**: 공용 컴퓨터에서 토큰이 저장되어 다른 사용자에게 노출

**수정하면?**
- ✅ **보안 강화**: 민감한 정보가 브라우저에 저장되지 않음
- ✅ **의도적 통제**: 사용자가 직접 입력하도록 유도
- ✅ **규정 준수**: 보안 표준 및 베스트 프랙티스 준수

---

### 🟢 심각도: 낮음

#### 7. `color-scheme` 미설정
**규칙**: 다크 모드 지원 시 `color-scheme` 메타 태그 또는 CSS 속성 필요

| 파일 | 문제 | 권장 |
|------|------|------|
| `index.html` | `<meta name="color-scheme">` 없음 | `<meta name="color-scheme" content="light">` 추가 |
| `tokens.css` | `:root`에 `color-scheme` 없음 | `color-scheme: light;` 추가 |

##### 💡 이 문제가 중요한 이유 (비개발자용)

**⚠️ 참고**: Azrael은 다크 모드를 지원하지 않습니다. 이 설정은 "라이트 모드만 사용함"을 브라우저에 알리는 것입니다.

**현재 상태로 유지하면?**
- 🚫 **UI 불일치**: 사용자 OS가 다크모드면, 스크롤바/폼 컨트롤이 검은색으로 표시되어 앱과 어색함
- 🚫 **시각적 혼란**: 밝은 앱 배경에 검은 스크롤바가 붙어 보임

**수정하면?**
- ✅ **일관된 UI**: OS 설정과 무관하게 앱 전체가 라이트 테마로 통일
- ✅ **전문적 느낌**: 스크롤바, 드롭다운 등 시스템 컨트롤도 앱과 조화

**수정 난이도**: HTML에 1줄 추가만으로 해결 (1분 작업)

---

#### 8. `Intl.*` API 미사용 (날짜/숫자 포맷)
**규칙**: 날짜/숫자 포맷에 `Intl.DateTimeFormat`, `Intl.NumberFormat` 사용 권장

| 파일 | 문제 |
|------|------|
| `businessDays.ts` | 수동 날짜 포맷 함수 사용 |

##### 💡 이 문제가 중요한 이유 (비개발자용)

*참고: 현재 한국어 고정 환경이라 낮은 우선순위*

**현재 상태로 유지하면?**
- 🚫 **다국어 확장 어려움**: 향후 영어/일어 지원 시 날짜 포맷 전체 수정 필요
- 🚫 **수동 관리 부담**: 날짜 포맷 로직을 직접 유지보수

**수정하면?**
- ✅ **자동 지역화**: `Intl.DateTimeFormat('ko-KR')` → `Intl.DateTimeFormat('en-US')` 변경만으로 영어 날짜 포맷
- ✅ **표준 준수**: 브라우저 내장 API 사용으로 일관성 보장

**권장**: 현재는 낮은 우선순위. 다국어 지원 시 적용.

---

#### 9. `touch-action: manipulation` 누락
**규칙**: 버튼/인터랙티브 요소에 더블탭 줌 방지

| 파일 | 문제 |
|------|------|
| `Button.css` | `touch-action: manipulation` 없음 |

##### 💡 이 문제가 중요한 이유 (비개발자용)

**현재 상태로 유지하면?**
- 🚫 **모바일 반응 지연**: 터치 후 300ms 대기 (더블탭 줌 대기 시간)
- 🚫 **답답한 느낌**: 버튼 터치해도 바로 반응하지 않는 것처럼 느껴짐

**수정하면?**
- ✅ **즉각 반응**: 터치 즉시 버튼 동작 (300ms 지연 제거)
- ✅ **네이티브 앱 같은 느낌**: 터치 반응이 빠르고 자연스러움

**대상**: 태블릿, 터치스크린 노트북 사용자

---

## 준수 항목

| 항목 | 파일 | 상태 |
|------|------|------|
| viewport 줌 비활성화 안함 | `index.html:6` | ✅ 준수 |
| `lang` 속성 설정 | `index.html:2` | ✅ 준수 (`lang="ko"`) |
| `:focus-visible` 전역 스타일 | `index.css:39-42` | ✅ 준수 |
| 시맨틱 버튼 사용 | `Button.tsx` | ✅ 준수 (`<button>` 태그) |

---

## 수정 계획

### Phase 1: 접근성 필수 수정 (우선순위: 높음)

**사용자 영향**: 스크린 리더 사용자, 키보드 전용 사용자가 앱을 사용할 수 있게 됩니다.

#### 1.1 Modal 접근성 개선
```tsx
// Modal.tsx 수정
<div
  className="modal-overlay"
  onClick={onClose}
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
    <div className="modal-header">
      <h3 id="modal-title">{title}</h3>
      <button
        className="modal-close"
        onClick={onClose}
        aria-label="닫기"
      >
        ✕
      </button>
    </div>
```

#### 1.2 Toast 접근성 개선
```tsx
// Toast.tsx 수정
<div
  className={`toast toast-${type}`}
  role="alert"
  aria-live="polite"
>
```

#### 1.3 Input 라벨 연결
```tsx
// Input.tsx 수정
import { useId } from 'react';

export function Input({ label, className = '', ...props }: InputProps) {
  const id = useId();
  return (
    <div className="input-wrapper">
      {label && <label className="input-label" htmlFor={id}>{label}</label>}
      <input id={id} className={`input ${className}`} {...props} />
    </div>
  );
}
```

### Phase 2: 포커스 및 애니메이션 개선 (우선순위: 중간)

**사용자 영향**: 키보드 사용자의 탐색 경험 개선, 애니메이션 민감 사용자 배려

#### 2.1 전역 reduced-motion 지원
```css
/* index.css 추가 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### 2.2 transition: all 구체화 (예시)
```css
/* Button.css 수정 */
.btn {
  transition: background-color 0.2s var(--ease-default),
              box-shadow 0.2s var(--ease-default),
              transform 0.2s var(--ease-default);
}

/* Input.css 수정 */
.input {
  transition: border-color 0.2s ease,
              box-shadow 0.2s ease;
}
```

#### 2.3 outline: none 대체 확인
```css
/* ScheduleTable.css:78 수정 */
.some-element:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--azrael-orange-500);
}
```

### Phase 3: 기타 개선 (우선순위: 낮음)

**사용자 영향**: UI 일관성 및 미세한 사용 경험 개선

#### 3.1 color-scheme 설정
```html
<!-- index.html head에 추가 -->
<meta name="color-scheme" content="light">
```

```css
/* tokens.css :root에 추가 */
:root {
  color-scheme: light;
  /* 기존 변수들... */
}
```

#### 3.2 touch-action 추가
```css
/* Button.css 추가 */
.btn {
  touch-action: manipulation;
}
```

---

## 수정 영향도 분석

| 수정 항목 | 영향 범위 | 테스트 필요 | 사용자 체감 |
|----------|----------|------------|------------|
| Modal ARIA | Modal 사용 화면 전체 | 스크린 리더 테스트 | 스크린 리더 사용자에게 큰 개선 |
| Input 라벨 연결 | 모든 폼 | 접근성 도구 검증 | 라벨 클릭 가능, 접근성 향상 |
| transition 구체화 | 전체 UI | 시각적 회귀 테스트 | 저사양 기기에서 성능 향상 |
| reduced-motion | 전체 애니메이션 | 애니메이션 비활성화 확인 | 민감 사용자 불편 해소 |
| color-scheme | 시스템 UI 요소 | 다크모드 OS에서 확인 | UI 일관성 향상 |

---

## 예상 ROI (투자 대비 효과)

| Phase | 수정 파일 수 | 작업 난이도 | 사용자 영향 |
|-------|-------------|------------|------------|
| Phase 1 | 5개 | 낮음 | ⭐⭐⭐⭐⭐ (접근성 필수) |
| Phase 2 | 10개 | 중간 | ⭐⭐⭐ (성능/UX 개선) |
| Phase 3 | 3개 | 낮음 | ⭐⭐ (미세 개선) |

**권장**: Phase 1을 우선 적용하세요. 접근성은 선택이 아닌 필수이며, 수정도 간단합니다.

---

## 참고 자료

- [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN ARIA Practices](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
