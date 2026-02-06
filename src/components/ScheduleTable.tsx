/**
 * Schedule Table Component
 * 참조: prd/Azrael-PRD-Phase0.md §5 테이블 출력
 */

import { ScheduleEntry } from '../types';
import { formatTableDate } from '../lib/businessDays';
import { CopyImageButton } from './CopyImageButton';
import './ScheduleTable.css';

interface ScheduleTableProps {
  title: string;
  entries: ScheduleEntry[];
  type: 'table1' | 'table2' | 'table3';
  disclaimer?: string;
}

/**
 * 커스텀 서식 파싱 (Disclaimer, 설명 등 공통 사용)
 * 지원 태그: <b></b> 굵게, <r></r> 빨강, <g></g> 초록, <bl></bl> 파랑, <u></u> 밑줄
 * 색상 태그는 중복 불가, 나머지는 중복 가능
 */
function parseCustomFormat(text: string): string {
  // 태그 매핑 (순서 중요: 더 긴 태그 먼저 처리)
  const tagMap: Array<[RegExp, string, string]> = [
    [/<bl>(.*?)<\/bl>/gs, '<span class="fmt-blue">', '</span>'],
    [/<b>(.*?)<\/b>/gs, '<span class="fmt-bold">', '</span>'],
    [/<r>(.*?)<\/r>/gs, '<span class="fmt-red">', '</span>'],
    [/<g>(.*?)<\/g>/gs, '<span class="fmt-green">', '</span>'],
    [/<u>(.*?)<\/u>/gs, '<span class="fmt-underline">', '</span>'],
  ];

  let result = text;

  for (const [regex, openTag, closeTag] of tagMap) {
    result = result.replace(regex, (_, content) => `${openTag}${content}${closeTag}`);
  }

  // 줄바꿈 처리
  result = result.replace(/\n/g, '<br/>');

  return result;
}

export function ScheduleTable({
  title,
  entries,
  type,
  disclaimer
}: ScheduleTableProps) {
  // 테이블 타입별 클래스
  const tableClass = type === 'table1' ? 'table-t1' : type === 'table2' ? 'table-t2' : 'table-t3';

  // parentIndex: 부모의 인덱스 (하위 일감 인덱스 표시용)
  const renderRow = (entry: ScheduleEntry, parentIndex?: number, childIndex?: number): JSX.Element[] => {
    const hasChildren = entry.children && entry.children.length > 0;
    const isChild = parentIndex !== undefined && childIndex !== undefined;

    // 인덱스 표시: 부모는 숫자, 하위는 "부모.자식" 형태
    const displayIndex = isChild ? `${parentIndex}.${childIndex}` : entry.index;

    const rows: JSX.Element[] = [];

    rows.push(
      <tr key={entry.id} className={isChild ? 'subtask' : ''}>

          {/* # - 인덱스 종속성 표현 */}
          <td className="copy-include col-index">{displayIndex}</td>

          {/* 배치 - 가운데 정렬, 들여쓰기 없음 */}
          <td className="copy-include col-stage">
            {isChild && 'ㄴ '}
            {entry.stageName}
          </td>

          {/* 마감/HO */}
          <td className="copy-include col-date">{formatTableDate(entry.startDateTime)}</td>

          {/* 테이블 전달/HB */}
          <td className="copy-include col-date">{formatTableDate(entry.endDateTime)}</td>

          {/* 설명 - Phase 1.7: 읽기 전용 (WorkStage 템플릿에서만 편집) */}
          <td className="copy-include readonly col-text col-description">
            <span dangerouslySetInnerHTML={{ __html: parseCustomFormat(entry.description || '') }} />
          </td>

          {/* 담당자 (테이블 1) 또는 JIRA 설명 (테이블 2/3) - Phase 1.7: 읽기 전용 */}
          {type === 'table1' ? (
            <td className="copy-include readonly col-text col-assignee">
              <span dangerouslySetInnerHTML={{ __html: (entry.assignee || '').replace(/\n/g, '<br/>') }} />
            </td>
          ) : (
            <td className="copy-exclude readonly col-text col-jira-description">
              <span dangerouslySetInnerHTML={{ __html: (entry.jiraDescription || '').replace(/\n/g, '<br/>') }} />
            </td>
          )}

          {/* JIRA 담당자 (테이블 2/3) - Phase 1.7: 읽기 전용, 이름 표시 */}
          {type !== 'table1' && (
            <td className="copy-exclude readonly col-jira-assignee">
              <span>{entry.jiraAssignee || ''}</span>
            </td>
          )}

        </tr>
    );

    // 하위 일감 렌더링 (부모 인덱스 전달)
    if (hasChildren) {
      entry.children!.forEach((child, idx) => {
        rows.push(...renderRow(child, entry.index, idx + 1));
      });
    }

    return rows;
  };

  const tableId = `table-${type}`;

  return (
    <div className="table-container" id={tableId}>
      <div className="table-header">
        <h3 className="table-title">{title}</h3>
        <CopyImageButton targetId={tableId} />
      </div>

      <table className={tableClass}>
        <colgroup>
          <col className="col-index" />
          <col className="col-stage" />
          <col className="col-date" />
          <col className="col-date" />
          <col className="col-description" />
          {type === 'table1' ? (
            <col className="col-assignee" />
          ) : (
            <>
              <col className="col-jira-description" />
              <col className="col-jira-assignee" />
            </>
          )}
        </colgroup>
        <thead>
          <tr>
            <th className="copy-include col-index">#</th>
            <th className="copy-include col-stage">배치</th>
            <th className="copy-include col-date">{type === 'table1' ? '마감' : 'HO'}</th>
            <th className="copy-include col-date">{type === 'table1' ? '테이블 전달' : 'HB'}</th>
            <th className="copy-include col-description">설명</th>
            <th className={type === 'table1' ? 'copy-include col-assignee' : 'copy-exclude col-jira-description'}>
              {type === 'table1' ? '담당자' : 'JIRA 설명'}
            </th>
            {type !== 'table1' && <th className="copy-exclude col-jira-assignee">JIRA 담당자</th>}
          </tr>
        </thead>
        <tbody>
          {entries.flatMap(entry => renderRow(entry))}
        </tbody>
      </table>

      {disclaimer && type === 'table1' && (
        <div
          className="disclaimer"
          dangerouslySetInnerHTML={{ __html: parseCustomFormat(disclaimer) }}
        />
      )}
    </div>
  );
}
