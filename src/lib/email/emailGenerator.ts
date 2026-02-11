/**
 * 이메일 생성 파이프라인
 * - generateEmail: 템플릿 + 계산 결과 → 렌더링된 이메일 (제목/본문HTML/본문텍스트)
 * - convertToInlineStyles: CSS → 인라인 스타일 변환 (Gmail/Outlook 호환)
 * - stripHtmlTags: 제목용 HTML 태그 제거
 *
 * 파이프라인 순서 (v2.7):
 *   1. 날짜 포맷팅 (이메일용: 시간 제외)
 *   2. 테이블 HTML 생성 (children 평탄화 포함)
 *   3. Disclaimer HTML 렌더링
 *   4. 템플릿 변수 컨텍스트 구성
 *   5. 템플릿 렌더링 (제목: stripHtmlTags, 본문: renderTemplate)
 *   6. 인라인 스타일 변환 (juice)
 *   7. 플레인텍스트 변환
 *
 * 참조: prd/Azrael-PRD-Phase2.md §4.4
 */

import juice from 'juice';
import type {
  EmailGenerationRequest,
  EmailGenerationResult,
  EmailTemplate,
  Project,
  CalculationResult,
  TemplateContext,
} from '../../types';
import { renderTemplate } from './templateParser';
import {
  formatEmailDate,
  formatUpdateDateShort,
  getEntriesByTableType,
  formatTableHtml,
  htmlToPlainText,
} from './formatters';
import { substituteDisclaimerVariables } from '../businessDays';
import { renderDisclaimerHtml } from './sanitizer';

// ============================================================
// 타입 정의
// ============================================================

/**
 * 이메일 생성 의존 데이터
 * 모달에서 이미 로드된 데이터를 전달받아 DB 재조회 방지.
 *
 * 참조: PRD §4.4 deps 매개변수 (v2.7)
 */
export interface GenerateEmailDeps {
  template: EmailTemplate;
  project: Project;
  calcResult: CalculationResult;
}

// ============================================================
// generateEmail
// ============================================================

/**
 * 이메일 생성 파이프라인
 *
 * v2.7: 동기 함수 — 모든 의존 데이터가 이미 로드되어 전달되므로 비동기 작업 없음.
 *       async/await가 필요 없으며, 호출부에서 동기적으로 사용 가능.
 *
 * 참조: PRD §4.4 generateEmail (v2.7, v2.8)
 *
 * @param request - 생성 요청 (프로젝트ID, 업데이트일, 테이블 타입, 템플릿ID)
 * @param deps - 이미 로드된 의존 데이터 (template, project, calcResult)
 * @returns EmailGenerationResult { subject, bodyHtml, bodyText }
 */
export function generateEmail(
  request: EmailGenerationRequest,
  deps: GenerateEmailDeps,
): EmailGenerationResult {
  const { template, project, calcResult } = deps;

  // 1. 날짜 포맷팅 (이메일용: 시간 제외)
  const updateDate = formatEmailDate(request.updateDate);
  const updateDateShort = formatUpdateDateShort(request.updateDate);
  const headsUp = formatEmailDate(calcResult.headsUpDate);
  const iosReviewDate = calcResult.iosReviewDate
    ? formatEmailDate(calcResult.iosReviewDate)
    : null;
  const paidProductDate = calcResult.paidProductDate
    ? formatEmailDate(calcResult.paidProductDate)
    : null;

  // 2. 테이블 HTML 생성 (children 평탄화 포함)
  const entries = getEntriesByTableType(calcResult, request.tableType);
  const tableHtml = formatTableHtml(entries, request.tableType);

  // 3. Disclaimer 변수 치환 + HTML 렌더링
  const disclaimerWithVars = substituteDisclaimerVariables(
    project.disclaimer, calcResult, formatEmailDate
  );
  const disclaimerHtml = renderDisclaimerHtml(disclaimerWithVars);

  // 4. 템플릿 변수 컨텍스트 구성
  const context: TemplateContext = {
    updateDate,
    updateDateShort,
    headsUp,
    iosReviewDate,
    table: tableHtml,
    disclaimer: disclaimerHtml || null, // v2.5: 빈 문자열 → null ({{#if disclaimer}} 평가용)
    projectName: project.name,
    showIosReviewDate: project.showIosReviewDate && iosReviewDate != null,
    paidProductDate,
    showPaidProductDate: project.showPaidProductDate && paidProductDate != null,
  };

  // 5. 템플릿 렌더링 (entity 디코딩 → 조건부 → 변수 순서 — §2.5)
  const subject = stripHtmlTags(
    renderTemplate(template.subjectTemplate, context),
  );
  const renderedBody = renderTemplate(template.bodyTemplate, context);

  // 6. 인라인 스타일 변환 (juice) + 플레인텍스트 변환
  const bodyHtml = convertToInlineStyles(renderedBody);
  const bodyText = htmlToPlainText(bodyHtml);

  return { subject, bodyHtml, bodyText };
}

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * HTML 태그 제거 (제목용)
 * subject 템플릿에 실수로 HTML 태그가 포함될 경우 strip 처리.
 *
 * 참조: PRD §4.4 stripHtmlTags (v2.5)
 */
function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

/**
 * CSS를 인라인 스타일로 변환 (Gmail/Outlook 호환)
 *
 * juice 라이브러리로 <style> 블록 및 외부 CSS를
 * 각 요소의 inline style 속성으로 변환.
 *
 * 참조: PRD §4.4 convertToInlineStyles, §5 juice (v2.5)
 *
 * @param html - 변환할 HTML 문자열
 * @returns 인라인 스타일이 적용된 HTML
 */
function convertToInlineStyles(html: string): string {
  return juice(html, {
    removeStyleTags: true,
    preserveMediaQueries: false,
  });
}
