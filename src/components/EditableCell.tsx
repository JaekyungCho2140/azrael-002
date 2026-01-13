/**
 * EditableCell Component
 * contentEditable을 사용한 셀 편집 기능
 * 참조: prd/Azrael-PRD-Phase0.md §9
 */

import { useState, useRef, useEffect } from 'react';
import './EditableCell.css';

interface EditableCellProps {
  value: string;
  onSave: (newValue: string) => void;
  placeholder?: string;
}

export function EditableCell({ value, onSave, placeholder }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const cellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // 편집 모드 진입
  const handleClick = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  // 편집 종료 및 저장
  const handleBlur = () => {
    setIsEditing(false);
    const newValue = cellRef.current?.innerHTML || '';
    if (newValue !== value) {
      onSave(newValue);
    }
  };

  // Enter 키로 저장
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      cellRef.current?.blur();
    }
  };

  // 서식 적용
  const applyFormat = (format: string, value?: string) => {
    document.execCommand(format, false, value);
    cellRef.current?.focus();
  };

  return (
    <div className="editable-cell-wrapper">
      {isEditing && (
        <div className="format-toolbar">
          <button
            type="button"
            onClick={() => applyFormat('bold')}
            className="format-btn"
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => applyFormat('italic')}
            className="format-btn"
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => applyFormat('foreColor', 'red')}
            className="format-btn format-btn-red"
            title="빨강"
          >
            A
          </button>
          <button
            type="button"
            onClick={() => applyFormat('foreColor', 'blue')}
            className="format-btn format-btn-blue"
            title="파랑"
          >
            A
          </button>
          <button
            type="button"
            onClick={() => applyFormat('foreColor', 'black')}
            className="format-btn format-btn-black"
            title="검정"
          >
            A
          </button>
        </div>
      )}
      <div
        ref={cellRef}
        className={`editable-cell ${isEditing ? 'editing' : ''}`}
        contentEditable={isEditing}
        onClick={handleClick}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        dangerouslySetInnerHTML={{ __html: editValue || placeholder || '' }}
        suppressContentEditableWarning
      />
    </div>
  );
}
