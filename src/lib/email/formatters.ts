/**
 * 이메일 날짜 포맷터 및 테이블 HTML 변환
 * - formatEmailDate: 이메일 변수용 날짜 (시간 제외)
 * - formatUpdateDateShort: 이메일 제목용 짧은 날짜
 * - getEntriesByTableType: CalculationResult → 테이블별 엔트리 추출 (children 평탄화)
 * - formatTableHtml: ScheduleEntry[] → HTML <table> 변환
 * - htmlToPlainText: HTML → 플레인텍스트 변환
 *
 * 참조: prd/Azrael-PRD-Phase2.md §2.2, §2.8, §4.4
 */

import type { CalculationResult, ScheduleEntry, TableType } from '../../types';
import { formatTableDate } from '../businessDays';

// ============================================================
// 날짜 포맷터
// ============================================================

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * Date → 이메일 본문용 날짜 형식 (시간 제외)
 * ⚠️ formatTableDate()와 다르게 시간(HH:MM)을 포함하지 않음.
 *    이메일 변수({updateDate}, {headsUp}, {iosReviewDate})에만 사용.
 *
 * 참조: PRD §4.4 (v2.8)
 *
 * @returns "MM/DD(요일)" 형식
 * @example formatEmailDate(new Date('2026-02-10')) → "02/10(월)"
 */
export function formatEmailDate(date: Date): string {
  if (isNaN(date.getTime())) return '[유효하지 않은 날짜]';
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const day = WEEKDAYS[date.getDay()];
  return `${mm}/${dd}(${day})`;
}

/**
 * Date → 이메일 제목용 짧은 형식
 *
 * 참조: PRD §4.4 (v2.5)
 *
 * @returns "MM-DD" 형식
 * @example formatUpdateDateShort(new Date('2026-02-10')) → "02-10"
 */
export function formatUpdateDateShort(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

// ============================================================
// 테이블 엔트리 추출
// ============================================================

/**
 * CalculationResult에서 테이블 타입별 엔트리 추출 (children 평탄화)
 *
 * CalculationResult의 엔트리는 계층 구조(parent + children)이므로,
 * 이메일 테이블 렌더링을 위해 parent → children 순서로 flat array로 변환.
 *
 * 참조: PRD §4.4 getEntriesByTableType (v2.7, v2.8)
 *
 * @example
 * [{ index: 1, children: [{ index: 1.1 }, { index: 1.2 }] }, { index: 2 }]
 * → [{ index: 1 }, { index: 1.1 }, { index: 1.2 }, { index: 2 }]
 */
export function getEntriesByTableType(
  calcResult: CalculationResult,
  tableType: TableType,
): ScheduleEntry[] {
  let entries: ScheduleEntry[];

  switch (tableType) {
    case 'table1':
      entries = calcResult.table1Entries;
      break;
    case 'table2':
      entries = calcResult.table2Entries;
      break;
    case 'table3':
      entries = calcResult.table3Entries;
      break;
  }

  return flattenEntries(entries);
}

/**
 * 계층 엔트리를 평탄화 (parent → children 순서 유지)
 */
function flattenEntries(entries: ScheduleEntry[]): ScheduleEntry[] {
  const result: ScheduleEntry[] = [];
  for (const entry of entries) {
    result.push(entry);
    if (entry.children && entry.children.length > 0) {
      result.push(...entry.children);
    }
  }
  return result;
}

// ============================================================
// HTML 테이블 변환
// ============================================================

/** 테이블 타입별 컬럼 헤더 정의 (PRD §2.2) */
const TABLE_COLUMNS: Record<TableType, string[]> = {
  table1: ['#', '배치', '마감', '테이블 전달', '담당자', '설명'],
  table2: ['#', '배치', 'HO', 'HB', '설명'],
  table3: ['#', '배치', 'HO', 'HB', '설명'],
};

/** 공통 인라인 스타일 (Gmail/Outlook 호환) */
const STYLES = {
  table: 'border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px;',
  th: 'background-color: #f0f0f0; padding: 8px; text-align: left; border: 1px solid #dddddd;',
  td: 'padding: 8px; border: 1px solid #dddddd;',
} as const;

/**
 * ScheduleEntry[] → HTML <table> 변환
 * 테이블 타입에 따라 다른 컬럼 구성 사용.
 *
 * 참조: PRD §2.2 HTML 테이블 예시
 *
 * @param entries - 평탄화된 엔트리 배열 (getEntriesByTableType 결과)
 * @param tableType - 테이블 타입
 * @returns HTML <table> 문자열
 */
export function formatTableHtml(
  entries: ScheduleEntry[],
  tableType: TableType,
): string {
  const columns = TABLE_COLUMNS[tableType];

  // 빈 테이블 처리 (PRD §2.3)
  if (entries.length === 0) {
    return `<p style="font-family: Arial, sans-serif; font-size: 14px; color: #999999;">(해당 테이블에 일정이 없습니다)</p>`;
  }

  const headerRow = columns
    .map((col) => `<th style="${STYLES.th}">${escapeHtml(col)}</th>`)
    .join('');

  const bodyRows = entries
    .map((entry) => {
      const cells = buildCells(entry, tableType);
      return `<tr>${cells}</tr>`;
    })
    .join('\n    ');

  return `<table border="1" cellpadding="8" cellspacing="0" style="${STYLES.table}">
  <thead>
    <tr>${headerRow}</tr>
  </thead>
  <tbody>
    ${bodyRows}
  </tbody>
</table>`;
}

/**
 * 엔트리 → 셀 배열 생성 (테이블 타입별 컬럼 매핑)
 *
 * 참조: PRD §2.2 필드-컬럼 매핑
 */
function buildCells(entry: ScheduleEntry, tableType: TableType): string {
  const td = (value: string) => `<td style="${STYLES.td}">${escapeHtml(value)}</td>`;

  const index = String(entry.index);
  const stageName = entry.stageName;
  const start = formatTableDate(entry.startDateTime);
  const end = formatTableDate(entry.endDateTime);
  const description = entry.description || '';

  if (tableType === 'table1') {
    const assignee = entry.assignee || '';
    return [
      td(index),
      td(stageName),
      td(start),    // 마감
      td(end),      // 테이블 전달
      td(assignee), // 담당자
      td(description),
    ].join('');
  }

  // T2, T3: #, 배치, HO, HB, 설명
  return [
    td(index),
    td(stageName),
    td(start),       // HO
    td(end),         // HB
    td(description),
  ].join('');
}

/** HTML 특수문자 이스케이프 (테이블 셀 내용용) */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// HTML → 플레인텍스트 변환
// ============================================================

/**
 * HTML → 플레인텍스트 변환
 *
 * 변환 규칙 (PRD §2.8):
 * - <p>text</p> → text\n\n
 * - <br> / <br/> → \n
 * - <li>item</li> → • item\n
 * - <strong>/<em>/<u>/<span> → 태그만 제거
 * - <a href="url">text</a> → text (URL 제거)
 * - <table> → 행별 탭 구분, 행 간 줄바꿈
 * - HTML entities → 원본 문자
 * - inline style 속성 포함 태그 → 태그와 속성 제거
 *
 * 참조: PRD §2.8 (v2.5, v2.7, v2.8)
 */
export function htmlToPlainText(html: string): string {
  let text = html;

  // 테이블 처리: 행별 탭 구분
  text = text.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent: string) => {
    const rows: string[] = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
      const cells: string[] = [];
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]*>/g, '').trim());
      }
      rows.push(cells.join('\t'));
    }
    return rows.join('\n') + '\n';
  });

  // 블록 요소 변환
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '• ');

  // 링크: 텍스트만 보존 (v2.7)
  text = text.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1');

  // 나머지 HTML 태그 제거
  text = text.replace(/<[^>]*>/g, '');

  // HTML entities 디코딩
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // 연속 빈 줄 정리 (3줄 이상 → 2줄)
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}
