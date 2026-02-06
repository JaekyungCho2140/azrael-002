/**
 * JIRA Summary 템플릿 시스템
 * Phase 1: 변수 치환 엔진
 * 참조: prd/Azrael-PRD-Phase1.md §4
 */

/**
 * 템플릿 변수
 */
export interface TemplateVars {
  date: string;          // YYMMDD (예: 260210)
  headsUp: string;       // MMDD (예: 0128)
  projectName: string;   // 프로젝트명 (예: M4/GL)
  taskName: string;      // Task 배치명 (예: REGULAR)
  subtaskName?: string;  // Subtask 배치명 (예: 번역)
  stageName: string;     // 현재 업무 단계명
}

/**
 * 템플릿 변수 치환
 * @param template - 템플릿 문자열 (예: "{date} 업데이트 {taskName}")
 * @param vars - 치환할 변수 값
 * @returns 치환된 문자열 (예: "260210 업데이트 REGULAR")
 */
export function applyTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/{date}/g, vars.date)
    .replace(/{headsUp}/g, vars.headsUp)
    .replace(/{projectName}/g, vars.projectName)
    .replace(/{taskName}/g, vars.taskName)
    .replace(/{subtaskName}/g, vars.subtaskName || '')
    .replace(/{stageName}/g, vars.stageName);
}

/**
 * JIRA Summary 생성 (fallback 포함)
 * @param template - 사용자 설정 템플릿 (null 가능)
 * @param vars - 변수 값
 * @param isSubtask - Subtask 여부
 * @returns JIRA Summary 문자열
 */
export function getSummary(
  template: string | null | undefined,
  vars: TemplateVars,
  isSubtask: boolean = false
): string {
  // 템플릿이 설정되어 있으면 사용
  if (template) {
    return applyTemplate(template, vars);
  }

  // NULL이면 기본 형식 사용 (fallback)
  if (isSubtask) {
    // Subtask 기본 형식
    return `${vars.date} 업데이트 ${vars.taskName} ${vars.subtaskName}`;
  } else {
    // Task 기본 형식
    return `${vars.date} 업데이트 ${vars.taskName}`;
  }
}

/**
 * 날짜를 YYMMDD 형식으로 변환
 * @param date - 날짜
 * @returns YYMMDD 형식 (예: 260210)
 */
export function formatDateYYMMDD(date: Date): string {
  const yy = String(date.getFullYear()).substring(2); // 26
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

/**
 * 날짜를 MMDD 형식으로 변환
 * @param date - 날짜
 * @returns MMDD 형식 (예: 0128)
 */
export function formatDateMMDD(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}${dd}`;
}
