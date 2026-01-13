/**
 * Stage Edit Modal
 * 업무 단계 추가/편집 모달
 * 참조: prd/Azrael-PRD-Phase0.md §10.3
 */

import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { WorkStage } from '../types';

interface StageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage?: WorkStage;
  onSave: (stage: WorkStage) => void;
}

export function StageEditModal({ isOpen, onClose, stage, onSave }: StageEditModalProps) {
  const [name, setName] = useState('');
  const [startOffsetDays, setStartOffsetDays] = useState(10);
  const [endOffsetDays, setEndOffsetDays] = useState(10);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [tableTargets, setTableTargets] = useState<('table1' | 'table2' | 'table3')[]>(['table1', 'table2', 'table3']);

  useEffect(() => {
    if (stage) {
      setName(stage.name);
      setStartOffsetDays(stage.startOffsetDays);
      setEndOffsetDays(stage.endOffsetDays);
      setStartTime(stage.startTime);
      setEndTime(stage.endTime);
      setTableTargets(stage.tableTargets);
    } else {
      setName('');
      setStartOffsetDays(10);
      setEndOffsetDays(10);
      setStartTime('09:00');
      setEndTime('18:00');
      setTableTargets(['table1', 'table2', 'table3']);
    }
  }, [stage, isOpen]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('업무 단계 이름을 입력해주세요.');
      return;
    }

    if (tableTargets.length === 0) {
      alert('최소 1개 이상의 테이블을 선택해주세요.');
      return;
    }

    const updatedStage: WorkStage = {
      id: stage?.id || `stage_${Date.now()}`,
      name: name.trim(),
      startOffsetDays,
      endOffsetDays,
      startTime,
      endTime,
      order: stage?.order ?? 0,
      depth: stage?.depth ?? 0,
      tableTargets
    };

    onSave(updatedStage);
    onClose();
  };

  const toggleTableTarget = (target: 'table1' | 'table2' | 'table3') => {
    if (tableTargets.includes(target)) {
      setTableTargets(tableTargets.filter(t => t !== target));
    } else {
      setTableTargets([...tableTargets, target]);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={stage ? '업무 단계 편집' : '업무 단계 추가'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button onClick={handleSave}>저장</Button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">업무 단계 이름</label>
        <input
          type="text"
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 정기, 1차, 2차"
        />
      </div>

      <div className="form-group">
        <label className="form-label">마감 역산 영업일 (시작일시)</label>
        <input
          type="number"
          className="form-input"
          value={startOffsetDays}
          onChange={(e) => setStartOffsetDays(Number(e.target.value))}
          placeholder="예: 13"
        />
        <small style={{ color: 'var(--azrael-gray-500)', fontSize: 'var(--text-xs)' }}>
          양수: 과거, 음수: 미래
        </small>
      </div>

      <div className="form-group">
        <label className="form-label">테이블 전달 역산 영업일 (종료일시)</label>
        <input
          type="number"
          className="form-input"
          value={endOffsetDays}
          onChange={(e) => setEndOffsetDays(Number(e.target.value))}
          placeholder="예: 10"
        />
        <small style={{ color: 'var(--azrael-gray-500)', fontSize: 'var(--text-xs)' }}>
          양수: 과거, 음수: 미래
        </small>
      </div>

      <div className="form-group">
        <label className="form-label">기본 시작 시각 (HH:MM)</label>
        <input
          type="time"
          className="form-input"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">기본 종료 시각 (HH:MM)</label>
        <input
          type="time"
          className="form-input"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">표시할 테이블 선택</label>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={tableTargets.includes('table1')}
              onChange={() => toggleTableTarget('table1')}
            />
            <span>테이블 1 (일정표)</span>
          </label>
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={tableTargets.includes('table2')}
              onChange={() => toggleTableTarget('table2')}
            />
            <span>테이블 2 (Ext.)</span>
          </label>
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={tableTargets.includes('table3')}
              onChange={() => toggleTableTarget('table3')}
            />
            <span>테이블 3 (Int.)</span>
          </label>
        </div>
      </div>
    </Modal>
  );
}
