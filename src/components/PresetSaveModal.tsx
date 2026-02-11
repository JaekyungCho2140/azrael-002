/**
 * PresetSaveModal Component
 * 몰아보기 저장 모달
 * 참조: prd/Azrael-PRD-Phase4.md §3.5
 */

import { useState, useEffect, useRef } from 'react';
import { CalculationResult, TableType } from '../types';
import { PRESET_NAME_MAX_LENGTH } from '../constants';
import { formatDateOnly } from '../lib/businessDays';
import { useSavePresetSlot } from '../hooks/usePresetSlots';
import './Modal.css';
import './PresetSaveModal.css';

interface PresetSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  slotIndex: number;
  calculationResult: CalculationResult;
  existingNames: string[];
}

/**
 * 중복 이름 자동 번호 생성
 */
function generateUniqueName(baseName: string, existingNames: string[]): string {
  if (!existingNames.includes(baseName)) {
    return baseName;
  }
  let counter = 2;
  while (existingNames.includes(`${baseName} (${counter})`)) {
    counter++;
  }
  return `${baseName} (${counter})`;
}

export function PresetSaveModal({
  isOpen,
  onClose,
  projectId,
  slotIndex,
  calculationResult,
  existingNames,
}: PresetSaveModalProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const saveMutation = useSavePresetSlot();

  // 기본 이름: 업데이트일 (YY-MM-DD)
  const defaultName = (() => {
    const d = calculationResult.updateDate;
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  })();

  const [name, setName] = useState('');
  const [visibleTable, setVisibleTable] = useState<TableType>('table1');
  const [error, setError] = useState('');

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      const uniqueName = generateUniqueName(defaultName, existingNames);
      setName(uniqueName);
      setVisibleTable('table1');
      setError('');
      // 포커스
      setTimeout(() => nameInputRef.current?.select(), 100);
    }
  }, [isOpen, defaultName, existingNames]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('몰아보기 이름을 입력해주세요');
      return;
    }
    if (trimmed.length > PRESET_NAME_MAX_LENGTH) {
      setError(`몰아보기 이름은 ${PRESET_NAME_MAX_LENGTH}자 이내로 입력해주세요`);
      return;
    }

    try {
      await saveMutation.mutateAsync({
        projectId,
        slotIndex,
        name: trimmed,
        calculationId: calculationResult.id,
        visibleTable,
      });
      onClose();
    } catch (err: any) {
      // UNIQUE 위반
      if (err?.code === '23505') {
        setError('이 업데이트일은 이미 다른 슬롯에 저장되어 있습니다');
      } else if (err?.code === '23503') {
        setError('참조하는 계산 결과가 존재하지 않습니다. 페이지를 새로고침해주세요.');
      } else {
        setError('몰아보기 저장에 실패했습니다.');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !saveMutation.isPending) {
      handleSave();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content preset-save-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>몰아보기 저장</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p className="preset-save-description">
            톺아보기 화면의 계산 결과를 몰아보기로 저장합니다.
          </p>

          <div className="preset-save-info">
            <div className="preset-save-info-item">
              <span className="preset-save-info-label">업데이트일</span>
              <span className="preset-save-info-value">{formatDateOnly(calculationResult.updateDate)}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">슬롯 이름</label>
            <input
              ref={nameInputRef}
              className="form-input"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              maxLength={PRESET_NAME_MAX_LENGTH}
              placeholder="몰아보기 이름"
            />
            <span className="preset-name-count">{name.length}/{PRESET_NAME_MAX_LENGTH}</span>
          </div>

          <div className="form-group">
            <label className="form-label">표시할 테이블</label>
            <div className="preset-table-radio-group">
              {(['table1', 'table2', 'table3'] as TableType[]).map((t) => (
                <label key={t} className="preset-table-radio">
                  <input
                    type="radio"
                    name="visibleTable"
                    value={t}
                    checked={visibleTable === t}
                    onChange={() => setVisibleTable(t)}
                  />
                  <span>{t === 'table1' ? '테이블 1' : t === 'table2' ? '테이블 2 (Ext.)' : '테이블 3 (Int.)'}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="preset-save-error">{error}</p>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>취소</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
