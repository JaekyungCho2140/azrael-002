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

  // JIRA 관련 필드 (Phase 0.5 + Phase 1 + Phase 1.5 + Phase 1.7)
  const [jiraProjectKey, setJiraProjectKey] = useState('');
  const [jiraEpicTemplate, setJiraEpicTemplate] = useState('');
  const [jiraHeadsupTemplate, setJiraHeadsupTemplate] = useState('');
  const [jiraHeadsupDescription, setJiraHeadsupDescription] = useState('');
  const [jiraTaskIssueType, setJiraTaskIssueType] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setHeadsUpOffset(project.headsUpOffset);
      setShowIosReviewDate(project.showIosReviewDate);
      setIosReviewOffset(project.iosReviewOffset || 7);
      setDisclaimer(project.disclaimer);
      setJiraProjectKey(project.jiraProjectKey || '');
      setJiraEpicTemplate(project.jiraEpicTemplate || '');
      setJiraHeadsupTemplate(project.jiraHeadsupTemplate || '');
      setJiraHeadsupDescription(project.jiraHeadsupDescription || '');
      setJiraTaskIssueType(project.jiraTaskIssueType || '');
    } else {
      setName('');
      setHeadsUpOffset(10);
      setShowIosReviewDate(false);
      setIosReviewOffset(7);
      setDisclaimer('');
      setJiraProjectKey('');
      setJiraEpicTemplate('');
      setJiraHeadsupTemplate('');
      setJiraHeadsupDescription('');
      setJiraTaskIssueType('');
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
      disclaimer,
      jiraProjectKey: jiraProjectKey.trim() || undefined,
      jiraEpicTemplate: jiraEpicTemplate.trim() || undefined,
      jiraHeadsupTemplate: jiraHeadsupTemplate.trim() || undefined,
      jiraHeadsupDescription: jiraHeadsupDescription.trim() || undefined,
      jiraTaskIssueType: jiraTaskIssueType.trim() || undefined
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

      {/* JIRA 프로젝트 키 (Phase 1) */}
      <div className="form-group">
        <label className="form-label">JIRA 프로젝트 키 (선택)</label>
        <input
          type="text"
          className="form-input"
          value={jiraProjectKey}
          onChange={(e) => setJiraProjectKey(e.target.value)}
          placeholder="예: M4L10N, NCL10N"
        />
        <small style={{ color: 'var(--azrael-gray-500)', fontSize: 'var(--text-xs)' }}>
          JIRA 연동 시 사용할 프로젝트 키
        </small>
      </div>

      {/* Epic Summary 템플릿 (Phase 0.5) */}
      <div className="form-group">
        <label className="form-label">
          Epic Summary 템플릿 (선택)
          <span
            className="info-icon"
            title="사용 가능한 변수: {date}, {headsUp}, {projectName}"
            style={{ marginLeft: '0.5rem', cursor: 'help', color: 'var(--azrael-gray-400)' }}
          >
            ?
          </span>
        </label>
        <input
          type="text"
          className="form-input"
          value={jiraEpicTemplate}
          onChange={(e) => setJiraEpicTemplate(e.target.value)}
          placeholder="{date} 업데이트"
        />
        <small style={{ color: 'var(--azrael-gray-500)', fontSize: 'var(--text-xs)' }}>
          비워두면 기본 형식 사용
        </small>
      </div>

      {/* 헤즈업 Task Summary 템플릿 (Phase 0.5) */}
      <div className="form-group">
        <label className="form-label">
          헤즈업 Task Summary 템플릿 (선택)
          <span
            className="info-icon"
            title="사용 가능한 변수: {date}, {headsUp}, {projectName}"
            style={{ marginLeft: '0.5rem', cursor: 'help', color: 'var(--azrael-gray-400)' }}
          >
            ?
          </span>
        </label>
        <input
          type="text"
          className="form-input"
          value={jiraHeadsupTemplate}
          onChange={(e) => setJiraHeadsupTemplate(e.target.value)}
          placeholder="{date} 업데이트 일정 헤즈업"
        />
        <small style={{ color: 'var(--azrael-gray-500)', fontSize: 'var(--text-xs)' }}>
          비워두면 기본 형식 사용
        </small>
      </div>

      {/* 헤즈업 Task 설명 (Phase 1.7) */}
      <div className="form-group">
        <label className="form-label">
          헤즈업 Task 설명 (선택)
          <span
            className="info-icon"
            title="표 입력 형식: ||헤더1|헤더2|| (헤더행), |내용1|내용2| (데이터행)"
            style={{ marginLeft: '0.5rem', cursor: 'help', color: 'var(--azrael-gray-400)' }}
          >
            ?
          </span>
        </label>
        <textarea
          className="form-input"
          value={jiraHeadsupDescription}
          onChange={(e) => setJiraHeadsupDescription(e.target.value)}
          placeholder="헤즈업 Task의 JIRA 설명 (ADF 테이블 마크업 지원)&#10;&#10;예시:&#10;||담당자|상태|마감일||&#10;|홍길동|진행중|2026-01-25|"
          rows={5}
        />
        <small style={{ color: 'var(--azrael-gray-500)', fontSize: 'var(--text-xs)' }}>
          표 형식: ||헤더1|헤더2|| (헤더), |내용1|내용2| (데이터)
        </small>
      </div>

      {/* Task 이슈 타입 (Phase 1.5) */}
      <div className="form-group">
        <label className="form-label">
          Task 이슈 타입 (선택)
          <span
            className="info-icon"
            title="JIRA에서 Epic 하위에 생성할 Task의 이슈 타입 이름. 예: PM(표준), Story, 작업"
            style={{ marginLeft: '0.5rem', cursor: 'help', color: 'var(--azrael-gray-400)' }}
          >
            ?
          </span>
        </label>
        <input
          type="text"
          className="form-input"
          value={jiraTaskIssueType}
          onChange={(e) => setJiraTaskIssueType(e.target.value)}
          placeholder="PM(표준)"
        />
        <small style={{ color: 'var(--azrael-gray-500)', fontSize: 'var(--text-xs)' }}>
          비워두면 "PM(표준)" 사용
        </small>
      </div>
    </Modal>
  );
}
