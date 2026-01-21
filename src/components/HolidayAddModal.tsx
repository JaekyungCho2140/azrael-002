/**
 * Holiday Add Modal
 * 공휴일 수동 추가 모달
 * 참조: prd/Azrael-PRD-Phase0.md §10.4
 */

import { useState, useEffect, useId } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Holiday } from '../types';

interface HolidayAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (holiday: Holiday) => void;
}

export function HolidayAddModal({ isOpen, onClose, onSave }: HolidayAddModalProps) {
  const [date, setDate] = useState('');
  const [name, setName] = useState('');

  // 폼 라벨 연결용 ID
  const dateId = useId();
  const nameId = useId();

  useEffect(() => {
    if (!isOpen) {
      setDate('');
      setName('');
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!date) {
      alert('날짜를 선택해주세요.');
      return;
    }

    if (!name.trim()) {
      alert('공휴일 이름을 입력해주세요.');
      return;
    }

    // YYYY-MM-DD 문자열을 로컬 시간대 정오로 변환 (시간대 문제 방지)
    const [year, month, day] = date.split('-').map(Number);
    const holiday: Holiday = {
      date: new Date(year, month - 1, day, 12, 0, 0),
      name: name.trim(),
      isManual: true
    };

    onSave(holiday);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="공휴일 추가"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button onClick={handleSave}>추가</Button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label" htmlFor={dateId}>날짜</label>
        <input
          id={dateId}
          type="date"
          className="form-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={nameId}>공휴일 이름</label>
        <input
          id={nameId}
          type="text"
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 근로자의 날"
        />
      </div>
    </Modal>
  );
}
