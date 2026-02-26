/**
 * 스케줄 테이블 ADF 텍스트 마크업 생성
 * CalculationResult의 테이블 엔트리를 ADF 테이블 마크업 문자열로 변환
 *
 * v1.2: Epic Description에 표 자동 삽입
 */

import type { ScheduleEntry, CalculationResult } from '../../types';
import { formatTableDate } from '../businessDays';

/**
 * 테이블 타입별 엔트리 추출 (children 평탄화)
 */
function getEntries(calcResult: CalculationResult, tableType: 'table1' | 'table2' | 'table3'): ScheduleEntry[] {
  const entries = tableType === 'table1'
    ? calcResult.table1Entries
    : tableType === 'table2'
      ? calcResult.table2Entries
      : calcResult.table3Entries;

  // children 평탄화
  const flat: ScheduleEntry[] = [];
  entries.forEach(entry => {
    flat.push(entry);
    if (entry.children) {
      entry.children.forEach(child => flat.push(child));
    }
  });
  return flat;
}

/**
 * ScheduleEntry[] → ADF 테이블 마크업 문자열
 * T1: ||#|배치명|마감|테이블전달|설명|담당자||
 * T2/T3: ||#|배치명|HO|HB|설명||
 */
export function formatScheduleTableForADF(
  calcResult: CalculationResult,
  tableType: 'table1' | 'table2' | 'table3'
): string {
  const entries = getEntries(calcResult, tableType);
  if (entries.length === 0) return '';

  const lines: string[] = [];

  // 헤더
  if (tableType === 'table1') {
    lines.push('||#|배치명|마감|테이블전달|설명|담당자||');
  } else {
    lines.push('||#|배치명|HO|HB|설명||');
  }

  // 데이터 행
  let parentIdx = 0;
  entries.forEach(entry => {
    const isChild = entry.parentId != null;
    if (!isChild) parentIdx++;

    const idx = isChild
      ? `${parentIdx}.${entry.index}`
      : String(parentIdx);

    const stageName = isChild ? `ㄴ ${entry.stageName}` : entry.stageName;
    const start = formatTableDate(entry.startDateTime);
    const end = formatTableDate(entry.endDateTime);
    const desc = (entry.description || '').replace(/\n/g, ' ').replace(/\|/g, '\\|');

    if (tableType === 'table1') {
      const assignee = (entry.assignee || '').replace(/\n/g, ' ').replace(/\|/g, '\\|');
      lines.push(`|${idx}|${stageName}|${start}|${end}|${desc}|${assignee}|`);
    } else {
      lines.push(`|${idx}|${stageName}|${start}|${end}|${desc}|`);
    }
  });

  return lines.join('\n');
}
