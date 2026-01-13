/**
 * Schedule Table Component
 * 참조: prd/Azrael-PRD-Phase0.md §5 테이블 출력
 */

import { useState } from 'react';
import { ScheduleEntry } from '../types';
import { formatTableDate } from '../lib/businessDays';
import { CopyImageButton } from './CopyImageButton';
import './ScheduleTable.css';

interface ScheduleTableProps {
  title: string;
  entries: ScheduleEntry[];
  type: 'table1' | 'table2' | 'table3';
  disclaimer?: string;
  onUpdateEntry?: (entryId: string, field: string, value: string) => void;
  onAddSibling?: (entryId: string) => void;
  onAddChild?: (entryId: string) => void;
  onDelete?: (entryId: string) => void;
}

export function ScheduleTable({
  title,
  entries,
  type,
  disclaimer,
  onUpdateEntry,
  onAddSibling,
  onAddChild,
  onDelete
}: ScheduleTableProps) {
  const [editingCell, setEditingCell] = useState<{ entryId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (entryId: string, field: string, currentValue: string) => {
    setEditingCell({ entryId, field });
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    if (editingCell && onUpdateEntry) {
      onUpdateEntry(editingCell.entryId, editingCell.field, editValue);
    }
    setEditingCell(null);
    setEditValue('');
  };

  const renderRow = (entry: ScheduleEntry, depth: number = 0): JSX.Element[] => {
    const hasChildren = entry.children && entry.children.length > 0;

    const rows: JSX.Element[] = [];

    rows.push(
      <tr key={entry.id} className={depth > 0 ? 'subtask' : ''}>

          {/* # */}
          <td>{entry.index}</td>

          {/* 배치 */}
          <td style={{ paddingLeft: depth > 0 ? '2rem' : undefined }}>
            {depth > 0 && 'ㄴ '}
            {entry.stageName}
          </td>

          {/* 마감/HO */}
          <td>{formatTableDate(entry.startDateTime)}</td>

          {/* 테이블 전달/HB */}
          <td>{formatTableDate(entry.endDateTime)}</td>

          {/* 설명 */}
          <td
            className="editable"
            onClick={() => startEdit(entry.id, 'description', entry.description)}
          >
            {editingCell?.entryId === entry.id && editingCell.field === 'description' ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                autoFocus
              />
            ) : (
              <span dangerouslySetInnerHTML={{ __html: entry.description || '' }} />
            )}
          </td>

          {/* 담당자 (테이블 1) 또는 JIRA 설명 (테이블 2/3) */}
          {type === 'table1' ? (
            <td
              className="editable"
              onClick={() => startEdit(entry.id, 'assignee', entry.assignee || '')}
            >
              {editingCell?.entryId === entry.id && editingCell.field === 'assignee' ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  autoFocus
                />
              ) : (
                <span dangerouslySetInnerHTML={{ __html: entry.assignee || '' }} />
              )}
            </td>
          ) : (
            <td
              className="editable"
              onClick={() => startEdit(entry.id, 'jiraDescription', entry.jiraDescription || '')}
            >
              {editingCell?.entryId === entry.id && editingCell.field === 'jiraDescription' ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  autoFocus
                />
              ) : (
                <span dangerouslySetInnerHTML={{ __html: entry.jiraDescription || '' }} />
              )}
            </td>
          )}

          {/* 액션 버튼 (테이블 2/3) */}
          {type !== 'table1' && (
            <td>
              <div className="action-buttons">
                <button className="btn-icon" onClick={() => onAddSibling?.(entry.id)} title="같은 레벨 추가">
                  +
                </button>
                {depth === 0 && (
                  <button className="btn-icon" onClick={() => onAddChild?.(entry.id)} title="하위 일감 추가">
                    ↓
                  </button>
                )}
                <button className="btn-icon btn-danger" onClick={() => onDelete?.(entry.id)} title="삭제">
                  ✕
                </button>
              </div>
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
            <th>#</th>
            <th>배치</th>
            <th>{type === 'table1' ? '마감' : 'HO'}</th>
            <th>{type === 'table1' ? '테이블 전달' : 'HB'}</th>
            <th>설명</th>
            <th>{type === 'table1' ? '담당자' : 'JIRA 설명'}</th>
            {type !== 'table1' && <th>액션</th>}
          </tr>
        </thead>
        <tbody>
          {entries.flatMap(entry => renderRow(entry))}
        </tbody>
      </table>

      {disclaimer && type === 'table1' && (
        <div className="disclaimer">
          <div dangerouslySetInnerHTML={{ __html: disclaimer }} />
        </div>
      )}
    </div>
  );
}
