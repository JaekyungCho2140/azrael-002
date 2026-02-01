/**
 * Disclaimer HTML 새니타이저 및 렌더러
 * - sanitize: 허용 태그 보존, 나머지 HTML 이스케이프 (XSS 방지)
 * - renderDisclaimerHtml: Disclaimer 커스텀 태그 → HTML 변환
 *
 * 커스텀 태그: <b>, <r>, <g>, <bl>, <u>
 * UUID 기반 플레이스홀더로 충돌 방지 (v2.5)
 *
 * 참조: prd/Azrael-PRD-Phase2.md §2.7
 */

// ============================================================
// 허용 태그 및 HTML 변환 규칙
// ============================================================

/** 허용된 커스텀 태그 (PRD §2.7) */
const ALLOWED_TAGS = ['b', 'r', 'g', 'bl', 'u'] as const;

/**
 * 커스텀 태그 → HTML 변환 매핑 (PRD §2.7 HTML 변환 규칙)
 *
 * | 커스텀 태그 | HTML 변환 |
 * |------------|-----------|
 * | <b>        | <strong>  |
 * | <r>        | <span style="color:red"> |
 * | <g>        | <span style="color:green"> |
 * | <bl>       | <span style="color:blue"> |
 * | <u>        | <u>       |
 */
const TAG_TO_HTML: Record<string, { open: string; close: string }> = {
  b:  { open: '<strong>',                          close: '</strong>' },
  r:  { open: '<span style="color:red">',          close: '</span>' },
  g:  { open: '<span style="color:green">',        close: '</span>' },
  bl: { open: '<span style="color:blue">',         close: '</span>' },
  u:  { open: '<u>',                                close: '</u>' },
};

// ============================================================
// sanitize
// ============================================================

/**
 * Disclaimer 텍스트 새니타이저
 * 허용된 커스텀 태그는 보존하고, 나머지 HTML 태그 및 특수문자를 이스케이프.
 * UUID 기반 null-byte 플레이스홀더로 사용자 입력 충돌 방지 (v2.5).
 *
 * 참조: PRD §2.7 sanitize 함수
 *
 * @param input - 원본 Disclaimer 텍스트 (커스텀 태그 포함)
 * @returns 새니타이즈된 문자열 (허용 태그만 남김)
 */
export function sanitize(input: string): string {
  let result = input;
  const placeholders = new Map<string, string>();

  // 1. 허용된 태그를 UUID 기반 고유 플레이스홀더로 교체
  for (const tag of ALLOWED_TAGS) {
    const openRegex = new RegExp(`<${tag}>`, 'gi');
    const closeRegex = new RegExp(`</${tag}>`, 'gi');
    const openPlaceholder = `\u0000OPEN_${crypto.randomUUID()}\u0000`;
    const closePlaceholder = `\u0000CLOSE_${crypto.randomUUID()}\u0000`;

    placeholders.set(openPlaceholder, `<${tag}>`);
    placeholders.set(closePlaceholder, `</${tag}>`);

    result = result.replace(openRegex, openPlaceholder);
    result = result.replace(closeRegex, closePlaceholder);
  }

  // 2. 나머지 HTML 태그 및 특수문자 escape
  result = result
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // 3. 플레이스홀더를 원래 태그로 복원
  for (const [placeholder, original] of placeholders) {
    const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), original);
  }

  return result;
}

// ============================================================
// renderDisclaimerHtml
// ============================================================

/**
 * 커스텀 태그 제거 (빈 값 판별용)
 * <b>, <r>, <g>, <bl>, <u> 및 닫는 태그를 모두 제거하여
 * 실질적 텍스트 내용만 남김.
 */
function stripCustomTags(text: string): string {
  let result = text;
  for (const tag of ALLOWED_TAGS) {
    result = result.replace(new RegExp(`</?${tag}>`, 'gi'), '');
  }
  return result;
}

/**
 * 새니타이즈된 Disclaimer의 커스텀 태그를 HTML로 변환
 *
 * 변환: <b> → <strong>, <r> → <span style="color:red">, 등
 * 줄바꿈: \n → <br>
 */
function convertCustomTagsToHtml(sanitized: string): string {
  let result = sanitized;

  for (const tag of ALLOWED_TAGS) {
    const mapping = TAG_TO_HTML[tag];
    result = result.replace(new RegExp(`<${tag}>`, 'gi'), mapping.open);
    result = result.replace(new RegExp(`</${tag}>`, 'gi'), mapping.close);
  }

  // 줄바꿈 변환
  result = result.replace(/\n/g, '<br>');

  return result;
}

/**
 * Disclaimer 커스텀 태그 → HTML 변환
 *
 * 처리 순서 (v2.6):
 *   1. null 체크 → 빈 문자열 반환
 *   2. trim() + 커스텀 태그 strip → 빈 문자열이면 빈 반환
 *   3. sanitize(input) — XSS 방지
 *   4. 커스텀 태그 → HTML 변환
 *
 * v2.8: 내부 try/catch — 파싱/렌더링 실패 시 빈 문자열 반환 + console.warn.
 *
 * 참조: PRD §2.7, §4.4 renderDisclaimerHtml
 *
 * @param disclaimer - 프로젝트 Disclaimer 원본 텍스트 (null 가능)
 * @returns HTML 문자열 (빈 disclaimer → 빈 문자열)
 */
export function renderDisclaimerHtml(disclaimer: string | null): string {
  // 1. null 체크
  if (disclaimer == null) return '';

  try {
    // 2. 실질적 텍스트 확인 (v2.6: 공백만 포함된 경우도 빈 취급)
    const stripped = stripCustomTags(disclaimer).trim();
    if (stripped === '') return '';

    // 3. XSS 방지
    const sanitized = sanitize(disclaimer);

    // 4. 커스텀 태그 → HTML 변환
    return convertCustomTagsToHtml(sanitized);
  } catch (err) {
    console.warn('[renderDisclaimerHtml] Disclaimer 렌더링 실패:', err);
    return '';
  }
}
