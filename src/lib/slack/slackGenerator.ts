/**
 * 슬랙 메시지 생성 파이프라인
 * - generateSlackMessage: 템플릿 + 계산 결과 → 렌더링된 슬랙 메시지
 *
 * 참조: prd/Azrael-PRD-Phase3.md §6.5
 */

import type {
  CalculationResult,
  Project,
  SlackMessageTemplate,
  TableType,
  TemplateContext,
} from '../../types';
import { formatEmailDate, formatUpdateDateShort, getEntriesByTableType } from '../email/formatters';
import { renderTemplate } from '../email/templateParser';
import { substituteDisclaimerVariables } from '../businessDays';
import { formatTableMrkdwn, convertDisclaimerToMrkdwn } from './formatter';

// ============================================================
// 타입 정의
// ============================================================

/**
 * 슬랙 메시지 생성 의존 데이터
 * 모달에서 이미 로드된 데이터를 전달받아 DB 재조회 방지.
 *
 * 참조: PRD §6.5
 */
export interface GenerateSlackMessageDeps {
  template: SlackMessageTemplate;
  project: Project;
  calcResult: CalculationResult;
}

// ============================================================
// generateSlackMessage
// ============================================================

/**
 * 슬랙 메시지 생성 파이프라인
 *
 * 파이프라인 순서:
 *   1. 날짜 포맷팅 (기존 formatEmailDate, formatUpdateDateShort 재사용)
 *   2. 테이블 mrkdwn 생성 (formatTableMrkdwn)
 *   3. Disclaimer mrkdwn 변환 (convertDisclaimerToMrkdwn)
 *   4. 변수 치환용 컨텍스트 구성 (이메일과 동일 구조)
 *   5. 템플릿 렌더링 (기존 renderTemplate 재사용)
 *
 * 참조: PRD §6.5 generateSlackMessage
 *
 * @param tableType - 테이블 타입 (table1, table2, table3)
 * @param deps - 이미 로드된 의존 데이터 (template, project, calcResult)
 * @returns 렌더링된 mrkdwn 메시지 문자열
 */
export function generateSlackMessage(
  tableType: TableType,
  deps: GenerateSlackMessageDeps,
): string {
  const { template, project, calcResult } = deps;

  // 1. 날짜 포맷팅 (기존 이메일/슬랙 공용 함수 재사용)
  const updateDate = formatEmailDate(calcResult.updateDate);
  const updateDateShort = formatUpdateDateShort(calcResult.updateDate);
  const headsUp = formatEmailDate(calcResult.headsUpDate);
  const iosReviewDate = calcResult.iosReviewDate
    ? formatEmailDate(calcResult.iosReviewDate)
    : null;
  const paidProductDate = calcResult.paidProductDate
    ? formatEmailDate(calcResult.paidProductDate)
    : null;

  // 2. 테이블 mrkdwn 생성
  const entries = getEntriesByTableType(calcResult, tableType);
  const tableMrkdwn = formatTableMrkdwn(entries, project.name);

  // 3. Disclaimer 변수 치환 + mrkdwn 변환
  const disclaimerWithVars = substituteDisclaimerVariables(
    project.disclaimer,
    calcResult,
    formatEmailDate,
  );
  const disclaimerMrkdwn = convertDisclaimerToMrkdwn(disclaimerWithVars);

  // 4. 컨텍스트 구성 (이메일과 동일 구조)
  const context: TemplateContext = {
    updateDate,
    updateDateShort,
    headsUp,
    iosReviewDate,
    table: tableMrkdwn,
    disclaimer: disclaimerMrkdwn || null,
    projectName: project.name,
    showIosReviewDate: project.showIosReviewDate && iosReviewDate != null,
    paidProductDate,
    showPaidProductDate: project.showPaidProductDate && paidProductDate != null,
  };

  // 5. 템플릿 렌더링 (기존 renderTemplate 재사용)
  return renderTemplate(template.bodyTemplate, context);
}
