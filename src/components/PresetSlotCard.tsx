/**
 * PresetSlotCard Component
 * 개별 몰아보기 슬롯 카드 (빈 슬롯 포함)
 * 참조: prd/Azrael-PRD-Phase4.md §3.3, §3.6
 */

import { useState, useRef, useEffect } from 'react';
import { ScheduleTable } from './ScheduleTable';
import { PresetSlotWithData, CalculationResult, TableType } from '../types';
import { PRESET_NAME_MAX_LENGTH } from '../constants';
import { formatDateOnly } from '../lib/businessDays';
import './PresetSlotCard.css';

interface PresetSlotCardProps {
  slotIndex: number;
  preset: PresetSlotWithData | null;
  currentCalculationResult: CalculationResult | null;
  onSave: (slotIndex: number) => void;
  onDelete: (presetId: string, presetName: string) => void;
  onUpdateName: (presetId: string, newName: string) => void;
  onUpdateVisibleTable: (presetId: string, table: TableType) => void;
}

export function PresetSlotCard({
  slotIndex,
  preset,
  currentCalculationResult,
  onSave,
  onDelete,
  onUpdateName,
  onUpdateVisibleTable,
}: PresetSlotCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 편집 모드 진입 시 input 포커스
  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  // 이름 편집 시작
  const handleStartEdit = () => {
    if (!preset) return;
    setEditName(preset.name);
    setIsEditingName(true);
  };

  // 이름 저장
  const handleSaveName = () => {
    if (!preset) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      // 빈 이름 → 이전 이름 복원
      setIsEditingName(false);
      return;
    }
    if (trimmed.length > PRESET_NAME_MAX_LENGTH) {
      setIsEditingName(false);
      return;
    }
    if (trimmed !== preset.name) {
      onUpdateName(preset.id, trimmed);
    }
    setIsEditingName(false);
  };

  // 이름 편집 키보드 핸들러
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setIsEditingName(false);
    }
  };

  // 테이블 엔트리 가져오기
  const getTableEntries = () => {
    if (!preset?.calculationResult) return [];
    const table = preset.visibleTable;
    if (table === 'table1') return preset.calculationResult.table1Entries;
    if (table === 'table2') return preset.calculationResult.table2Entries;
    return preset.calculationResult.table3Entries;
  };

  // 테이블 라벨
  const getTableLabel = (table: TableType) => {
    if (table === 'table1') return '테이블 1';
    if (table === 'table2') return '테이블 2 (Ext.)';
    return '테이블 3 (Int.)';
  };

  // 빈 슬롯
  if (!preset) {
    return (
      <div className="preset-slot-card preset-slot-empty">
        <div className="preset-slot-header">
          <span className="preset-slot-title">#{slotIndex}: 빈 슬롯</span>
        </div>
        <div className="preset-slot-empty-body">
          <button
            className="preset-add-button"
            onClick={() => onSave(slotIndex)}
            disabled={!currentCalculationResult}
            title={!currentCalculationResult ? '먼저 톺아보기에서 계산을 진행하세요' : ''}
          >
            + 몰아보기 추가
          </button>
          {!currentCalculationResult && (
            <p className="preset-empty-hint">먼저 톺아보기에서 계산을 진행하세요</p>
          )}
          {currentCalculationResult && (
            <p className="preset-empty-hint">몰아보기를 추가하세요</p>
          )}
        </div>
      </div>
    );
  }

  // 채워진 슬롯
  const calc = preset.calculationResult;

  return (
    <div className="preset-slot-card">
      <div className="preset-slot-header">
        <div className="preset-slot-title-area">
          <span className="preset-slot-index">#{slotIndex}:</span>
          {isEditingName ? (
            <input
              ref={inputRef}
              className="preset-name-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={handleKeyDown}
              maxLength={PRESET_NAME_MAX_LENGTH}
            />
          ) : (
            <span
              className="preset-slot-name"
              onDoubleClick={handleStartEdit}
              title="더블클릭으로 이름 편집"
            >
              {preset.name}
            </span>
          )}
        </div>
        <button
          className="preset-delete-button"
          onClick={() => onDelete(preset.id, preset.name)}
          title="몰아보기 삭제"
        >
          ✕
        </button>
      </div>

      {calc ? (
        <div className="preset-slot-body">
          {/* 주요 일정 */}
          <div className="preset-dates">
            <div className="preset-date-item">
              <span className="preset-date-label">업데이트일</span>
              <span className="preset-date-value">{formatDateOnly(calc.updateDate)}</span>
            </div>
            <div className="preset-date-item">
              <span className="preset-date-label">헤즈업</span>
              <span className="preset-date-value">{formatDateOnly(calc.headsUpDate)}</span>
            </div>
            {calc.iosReviewDate && (
              <div className="preset-date-item">
                <span className="preset-date-label">iOS 심사일</span>
                <span className="preset-date-value">{formatDateOnly(calc.iosReviewDate)}</span>
              </div>
            )}
            {calc.paidProductDate && (
              <div className="preset-date-item">
                <span className="preset-date-label">유료화 상품</span>
                <span className="preset-date-value">{formatDateOnly(calc.paidProductDate)}</span>
              </div>
            )}
          </div>

          {/* 테이블 드롭다운 */}
          <div className="preset-table-selector">
            <select
              className="preset-table-dropdown"
              value={preset.visibleTable}
              onChange={(e) => onUpdateVisibleTable(preset.id, e.target.value as TableType)}
            >
              <option value="table1">{getTableLabel('table1')}</option>
              <option value="table2">{getTableLabel('table2')}</option>
              <option value="table3">{getTableLabel('table3')}</option>
            </select>
          </div>

          {/* 테이블 (읽기 전용) */}
          <div className="preset-table-container">
            <ScheduleTable
              title=""
              entries={getTableEntries()}
              type={preset.visibleTable}
            />
          </div>
        </div>
      ) : (
        <div className="preset-slot-loading">
          <p>계산 결과를 불러오는 중...</p>
        </div>
      )}
    </div>
  );
}
