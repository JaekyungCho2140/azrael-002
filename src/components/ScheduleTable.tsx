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

export function ScheduleTable({
  title,
  entries,
  type,
  disclaimer
}: ScheduleTableProps) {
  // Phase 4: 편집 기능 제거 (읽기 전용 테이블)

  const renderRow = (entry: ScheduleEntry, depth: number = 0): JSX.Element[] => {
    const hasChildren = entry.children && entry.children.length > 0;

    const rows: JSX.Element[] = [];

    rows.push(
      <tr key={entry.id} className={depth > 0 ? 'subtask' : ''}>

          {/* # */}
          <td className="copy-include">{entry.index}</td>

          {/* 배치 */}
          <td className="copy-include" style={{ paddingLeft: depth > 0 ? '2rem' : undefined }}>
            {depth > 0 && 'ㄴ '}
            {entry.stageName}
          </td>

          {/* 마감/HO */}
          <td className="copy-include">{formatTableDate(entry.startDateTime)}</td>

          {/* 테이블 전달/HB */}
          <td className="copy-include">{formatTableDate(entry.endDateTime)}</td>

          {/* 설명 - Phase 1.7: 읽기 전용 (WorkStage 템플릿에서만 편집) */}
          <td className="copy-include readonly">
            <span dangerouslySetInnerHTML={{ __html: entry.description || '' }} />
          </td>

          {/* 담당자 (테이블 1) 또는 JIRA 설명 (테이블 2/3) - Phase 1.7: 읽기 전용 */}
          {type === 'table1' ? (
            <td className="copy-include readonly">
              <span dangerouslySetInnerHTML={{ __html: entry.assignee || '' }} />
            </td>
          ) : (
            <td className="copy-exclude readonly">
              <span dangerouslySetInnerHTML={{ __html: entry.jiraDescription || '' }} />
            </td>
          )}

          {/* JIRA 담당자 (테이블 2/3) - Phase 1.7: 읽기 전용, 이름 표시 */}
          {type !== 'table1' && (
            <td className="copy-exclude readonly jira-assignee">
              <span>{entry.jiraAssignee || ''}</span>
            </td>
          )}

        </tr>
    );

    // 하위 일감 렌더링 (항상 표시)
    if (hasChildren) {
      entry.children!.forEach(child => {
        rows.push(...renderRow(child, depth + 1));
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

      <table>
        <thead>
          <tr>
            <th className="copy-include">#</th>
            <th className="copy-include">배치</th>
            <th className="copy-include">{type === 'table1' ? '마감' : 'HO'}</th>
            <th className="copy-include">{type === 'table1' ? '테이블 전달' : 'HB'}</th>
            <th className="copy-include">설명</th>
            <th className={type === 'table1' ? 'copy-include' : 'copy-exclude'}>{type === 'table1' ? '담당자' : 'JIRA 설명'}</th>
            {type !== 'table1' && <th className="copy-exclude">JIRA 담당자</th>}
          </tr>
        </thead>
        <tbody>
          {entries.flatMap(entry => renderRow(entry))}
        </tbody>
      </table>

      {disclaimer && type === 'table1' && (
        <div className="disclaimer" style={{ whiteSpace: 'pre-wrap' }}>
          {disclaimer.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}
