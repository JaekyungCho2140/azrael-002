/**
 * 이메일 템플릿 파서
 * - 단순 변수 치환: {variableName}
 * - 조건부 블록: {{#if condition}}...{{/if}}
 * - TipTap HTML entity 디코딩
 *
 * 참조: prd/Azrael-PRD-Phase2.md §2.4, §2.5
 */

import {
  TemplateContext,
  VALID_TEMPLATE_VARIABLES,
  BOOLEAN_ONLY_VARIABLES,
} from '../../types';

// ============================================================
// 템플릿 렌더링
// ============================================================

/**
 * TipTap HTML entity 디코딩
 * TipTap 에디터가 중괄호를 HTML entity로 변환할 수 있으므로,
 * 변수 치환 전에 관련 entity를 원본 문자로 복원.
 *
 * 참조: PRD §2.5 (v2.5)
 */
function decodeTemplateEntities(template: string): string {
  return template
    .replace(/&#123;/g, '{')
    .replace(/&#125;/g, '}')
    .replace(/&lcub;/g, '{')
    .replace(/&rcub;/g, '}');
}

/**
 * 조건부 블록 처리 (중첩 미지원)
 * {{#if varName}}...{{/if}} 형태의 블록을 context[varName] 평가 후 렌더링/제거.
 *
 * ⚠️ 중첩 {{#if}} 사용 시 동작이 예측 불가능 (비탐욕 regex).
 *    저장 시 validateTemplate()에서 중첩 감지 경고 표시.
 *
 * 참조: PRD §2.5 (v2.5)
 */
function processConditionals(template: string, context: TemplateContext): string {
  return template.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key, content) => (context[key] ? content : ''),
  );
}

/**
 * 단순 변수 치환
 * - null/undefined → '[미입력]' 플레이스홀더 (v2.2)
 * - boolean → String(value) 변환 (v2.5)
 * - 빈 문자열 → 그대로 출력
 *
 * 참조: PRD §2.5
 */
function replaceVariables(template: string, context: TemplateContext): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = context[key];
    if (value == null) return '[미입력]';
    if (typeof value === 'boolean') return String(value);
    return String(value);
  });
}

/**
 * 템플릿 렌더링 (entity 디코딩 → 조건부 → 변수 순서)
 *
 * 참조: PRD §2.5 renderTemplate (v2.8)
 *
 * @param template - 원본 템플릿 문자열 (HTML)
 * @param context - 변수 값 맵
 * @returns 렌더링된 결과 문자열
 */
export function renderTemplate(template: string, context: TemplateContext): string {
  const decoded = decodeTemplateEntities(template);
  const withoutConditionals = processConditionals(decoded, context);

  // v2.8: 조건부 처리 후 잔여 블록 태그 감지
  if (/\{\{#if \w+\}\}/.test(withoutConditionals) || /\{\{\/if\}\}/.test(withoutConditionals)) {
    console.warn(
      '[renderTemplate] 조건부 블록 처리 후 잔여 태그가 발견되었습니다. 템플릿 구조를 확인하세요.',
    );
  }

  return replaceVariables(withoutConditionals, context);
}

// ============================================================
// 템플릿 유효성 검증
// ============================================================

/**
 * 템플릿 변수 유효성 검증
 * 저장 시 경고 목록을 반환하며, 경고가 있어도 저장은 허용.
 *
 * 검증 항목:
 * 1. 존재하지 않는 변수 감지
 * 2. boolean 전용 변수의 단순 변수 사용 경고
 * 3. 닫히지 않은 중괄호 감지
 * 4. 중첩 조건부 블록 감지
 * 5. 열림/닫힘 불일치 감지
 * 6. TipTap에 의해 깨진 변수 구문 감지
 *
 * 참조: PRD §2.4 validateTemplate (v2.7)
 *
 * @param template - 검증할 템플릿 문자열
 * @returns 경고 메시지 배열 (빈 배열 = 문제 없음)
 */
export function validateTemplate(template: string): string[] {
  const warnings: string[] = [];
  const validVars = VALID_TEMPLATE_VARIABLES as readonly string[];
  const booleanOnly = BOOLEAN_ONLY_VARIABLES as readonly string[];

  // 1. 단순 변수 검증 (조건부 블록 내부 포함)
  const variablePattern = /\{(\w+)\}/g;
  let match;
  while ((match = variablePattern.exec(template)) !== null) {
    if (!validVars.includes(match[1])) {
      warnings.push(`알 수 없는 변수: {${match[1]}}`);
    }
    // v2.7: boolean 전용 변수를 단순 변수로 사용 시 경고
    if (booleanOnly.includes(match[1])) {
      warnings.push(
        `{${match[1]}}는 조건부 블록({{#if}})에서만 사용하세요. 단순 변수로 사용하면 "true"/"false" 텍스트가 출력됩니다.`,
      );
    }
  }

  // 2. 닫히지 않은 중괄호 검사
  if (/\{[^}]*$/m.test(template)) {
    warnings.push('닫히지 않은 중괄호가 있습니다.');
  }

  // 3. 중첩 조건부 블록 감지 (v2.6: {{/if}} 이전까지만 탐색)
  const nestedPattern = /\{\{#if (\w+)\}\}(?:(?!\{\{\/if\}\})[\s\S])*?\{\{#if \w+\}\}/;
  if (nestedPattern.test(template)) {
    warnings.push('중첩된 조건부 블록({{#if}})은 지원되지 않습니다.');
  }

  // 4. 열림/닫힘 불일치 감지 (v2.7)
  const openCount = (template.match(/\{\{#if \w+\}\}/g) || []).length;
  const closeCount = (template.match(/\{\{\/if\}\}/g) || []).length;
  if (openCount > closeCount) {
    warnings.push(
      `닫히지 않은 조건부 블록이 ${openCount - closeCount}개 있습니다. {{/if}}를 확인하세요.`,
    );
  } else if (closeCount > openCount) {
    warnings.push(`여는 태그 없이 {{/if}}가 ${closeCount - openCount}개 있습니다.`);
  }

  // 5. TipTap HTML 태그가 변수 구문을 감싸는 경우 경고 (v2.7)
  const brokenVariablePattern = /\{[^}]*<[^>]+>[^}]*\}/g;
  if (brokenVariablePattern.test(template)) {
    warnings.push(
      '변수 구문 내에 HTML 태그가 포함되어 있습니다. TipTap 에디터에서 변수 텍스트에 서식을 적용하면 치환이 실패할 수 있습니다.',
    );
  }

  return warnings;
}
