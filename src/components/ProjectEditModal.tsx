/**
 * Project Edit Modal
 * 프로젝트 추가/편집 모달
 * 참조: prd/Azrael-PRD-Phase0.md §10.2
 */

import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Project } from '../types';

interface ProjectEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;
  onSave: (project: Project) => void;
}

export function ProjectEditModal({ isOpen, onClose, project, onSave }: ProjectEditModalProps) {
  const [name, setName] = useState('');
  const [headsUpOffset, setHeadsUpOffset] = useState(10);
  const [showIosReviewDate, setShowIosReviewDate] = useState(false);
  const [iosReviewOffset, setIosReviewOffset] = useState(7);
  const [disclaimer, setDisclaimer] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setHeadsUpOffset(project.headsUpOffset);
      setShowIosReviewDate(project.showIosReviewDate);
      setIosReviewOffset(project.iosReviewOffset || 7);
      setDisclaimer(project.disclaimer);
    } else {
      setName('');
      setHeadsUpOffset(10);
      setShowIosReviewDate(false);
      setIosReviewOffset(7);
      setDisclaimer('');
    }
  }, [project, isOpen]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('프로젝트 이름을 입력해주세요.');
      return;
    }

    const updatedProject: Project = {
      id: project?.id || `project_${Date.now()}`,
      name: name.trim(),
      headsUpOffset,
      iosReviewOffset: showIosReviewDate ? iosReviewOffset : undefined,
      showIosReviewDate,
      templateId: project?.templateId || `template_${Date.now()}`,
      disclaimer
    };

    onSave(updatedProject);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={project ? '프로젝트 편집' : '새 프로젝트 추가'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button onClick={handleSave}>저장</Button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">프로젝트 이름</label>
        <input
          type="text"
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: MIR5/GL"
        />
      </div>

      <div className="form-group">
        <label className="form-label">헤즈업 Offset (영업일 전)</label>
        <input
          type="number"
          className="form-input"
          value={headsUpOffset}
          onChange={(e) => setHeadsUpOffset(Number(e.target.value))}
          min="0"
        />
      </div>

      <div className="form-group">
        <label className="form-checkbox">
          <input
            type="checkbox"
            checked={showIosReviewDate}
            onChange={(e) => setShowIosReviewDate(e.target.checked)}
          />
          <span>iOS 심사일 표시</span>
        </label>
      </div>

      {showIosReviewDate && (
        <div className="form-group">
          <label className="form-label">iOS 심사일 Offset (영업일 전)</label>
          <input
            type="number"
            className="form-input"
            value={iosReviewOffset}
            onChange={(e) => setIosReviewOffset(Number(e.target.value))}
            min="0"
          />
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Disclaimer (선택)</label>
        <textarea
          className="form-input"
          value={disclaimer}
          onChange={(e) => setDisclaimer(e.target.value)}
          placeholder="테이블 하단에 표시될 메모 (최대 6줄/600자)"
          rows={4}
          maxLength={600}
        />
        <small style={{ color: 'var(--azrael-gray-500)', fontSize: 'var(--text-xs)' }}>
          {disclaimer.length}/600자
        </small>
      </div>
    </Modal>
  );
}
