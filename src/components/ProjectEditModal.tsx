/**
 * Project Edit Modal
 * 프로젝트 추가/편집 모달
 * 참조: prd/Azrael-PRD-Phase0.md §10.2
 */

import { useState, useEffect, useId } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Project } from '../types';
import { DEFAULT_HEADSUP_OFFSET, DEFAULT_IOS_REVIEW_OFFSET, DEFAULT_PAID_PRODUCT_OFFSET, MAX_DISCLAIMER_LENGTH } from '../constants';

interface ProjectEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;
  onSave: (project: Project) => void;
}

export function ProjectEditModal({ isOpen, onClose, project, onSave }: ProjectEditModalProps) {
  const [name, setName] = useState('');
  const [headsUpOffset, setHeadsUpOffset] = useState(DEFAULT_HEADSUP_OFFSET);
  const [showIosReviewDate, setShowIosReviewDate] = useState(false);
  const [iosReviewOffset, setIosReviewOffset] = useState(DEFAULT_IOS_REVIEW_OFFSET);
  const [showPaidProductDate, setShowPaidProductDate] = useState(false);
  const [paidProductOffset, setPaidProductOffset] = useState(DEFAULT_PAID_PRODUCT_OFFSET);
  const [disclaimer, setDisclaimer] = useState('');

  // JIRA 관련 필드 (Phase 0.5 + Phase 1 + Phase 1.5 + Phase 1.7)
  const [jiraProjectKey, setJiraProjectKey] = useState('');
  const [jiraEpicTemplate, setJiraEpicTemplate] = useState('');
  const [jiraHeadsupTemplate, setJiraHeadsupTemplate] = useState('');
  const [jiraHeadsupDescription, setJiraHeadsupDescription] = useState('');
  const [jiraEpicDescription, setJiraEpicDescription] = useState('');
  const [jiraEpicTableEnabled, setJiraEpicTableEnabled] = useState(false);
  const [jiraEpicTableType, setJiraEpicTableType] = useState<'table1' | 'table2' | 'table3'>('table1');
  const [jiraTaskIssueType, setJiraTaskIssueType] = useState('');

  // 폼 라벨 연결용 ID
  const nameId = useId();
  const headsUpOffsetId = useId();
  const showIosReviewDateId = useId();
  const iosReviewOffsetId = useId();
  const showPaidProductDateId = useId();
  const paidProductOffsetId = useId();
  const disclaimerId = useId();
  const jiraProjectKeyId = useId();
  const jiraEpicTemplateId = useId();
  const jiraHeadsupTemplateId = useId();
  const jiraHeadsupDescriptionId = useId();
  const jiraTaskIssueTypeId = useId();

  useEffect(() => {
    if (project) {
      setName(project.name);
      setHeadsUpOffset(project.headsUpOffset);
      setShowIosReviewDate(project.showIosReviewDate);
      setIosReviewOffset(project.iosReviewOffset || DEFAULT_IOS_REVIEW_OFFSET);
      setShowPaidProductDate(project.showPaidProductDate);
      setPaidProductOffset(project.paidProductOffset || DEFAULT_PAID_PRODUCT_OFFSET);
      setDisclaimer(project.disclaimer);
      setJiraProjectKey(project.jiraProjectKey || '');
      setJiraEpicTemplate(project.jiraEpicTemplate || '');
      setJiraHeadsupTemplate(project.jiraHeadsupTemplate || '');
      setJiraHeadsupDescription(project.jiraHeadsupDescription || '');
      setJiraEpicDescription(project.jiraEpicDescription || '');
      setJiraEpicTableEnabled(project.jiraEpicTableEnabled ?? false);
      setJiraEpicTableType(project.jiraEpicTableType || 'table1');
      setJiraTaskIssueType(project.jiraTaskIssueType || '');
    } else {
      setName('');
      setHeadsUpOffset(DEFAULT_HEADSUP_OFFSET);
      setShowIosReviewDate(false);
      setIosReviewOffset(DEFAULT_IOS_REVIEW_OFFSET);
      setShowPaidProductDate(false);
      setPaidProductOffset(DEFAULT_PAID_PRODUCT_OFFSET);
      setDisclaimer('');
      setJiraProjectKey('');
      setJiraEpicTemplate('');
      setJiraHeadsupTemplate('');
      setJiraHeadsupDescription('');
      setJiraEpicDescription('');
      setJiraEpicTableEnabled(false);
      setJiraEpicTableType('table1');
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
      paidProductOffset: showPaidProductDate ? paidProductOffset : undefined,
      showPaidProductDate,
      templateId: project?.templateId || `template_${Date.now()}`,
      disclaimer,
      jiraProjectKey: jiraProjectKey.trim() || undefined,
      jiraEpicTemplate: jiraEpicTemplate.trim() || undefined,
      jiraHeadsupTemplate: jiraHeadsupTemplate.trim() || undefined,
      jiraHeadsupDescription: jiraHeadsupDescription.trim() || undefined,
      jiraEpicDescription: jiraEpicDescription.trim() || undefined,
      jiraEpicTableEnabled,
      jiraEpicTableType,
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
        <label className="form-label" htmlFor={nameId}>프로젝트 이름</label>
        <input
          id={nameId}
          type="text"
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: MIR5/GL"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={headsUpOffsetId}>헤즈업 Offset (영업일 전)</label>
        <input
          id={headsUpOffsetId}
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
            id={showIosReviewDateId}
            type="checkbox"
            checked={showIosReviewDate}
            onChange={(e) => setShowIosReviewDate(e.target.checked)}
          />
          <span>iOS 심사일 표시</span>
        </label>
      </div>

      {showIosReviewDate && (
        <div className="form-group">
          <label className="form-label" htmlFor={iosReviewOffsetId}>iOS 심사일 Offset (영업일 전)</label>
          <input
            id={iosReviewOffsetId}
            type="number"
            className="form-input"
            value={iosReviewOffset}
            onChange={(e) => setIosReviewOffset(Number(e.target.value))}
            min="0"
          />
        </div>
      )}

      <div className="form-group">
        <label className="form-checkbox">
          <input
            id={showPaidProductDateId}
            type="checkbox"
            checked={showPaidProductDate}
            onChange={(e) => setShowPaidProductDate(e.target.checked)}
          />
          <span>유료화 상품 협의 일정 표시</span>
        </label>
      </div>

      {showPaidProductDate && (
        <div className="form-group">
          <label className="form-label" htmlFor={paidProductOffsetId}>유료화 상품 협의 일정 Offset (영업일 전)</label>
          <input
            id={paidProductOffsetId}
            type="number"
            className="form-input"
            value={paidProductOffset}
            onChange={(e) => setPaidProductOffset(Number(e.target.value))}
            min="0"
          />
          <small style={{ color: 'var(--azrael-gray-500)', fontSize: 'var(--text-xs)' }}>
            Disclaimer에서 {'{paidProductDate}'} 변수로 사용 가능
          </small>
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor={disclaimerId}>Disclaimer (선택)</label>
        <textarea
          id={disclaimerId}
          className="form-input"
          value={disclaimer}
          onChange={(e) => setDisclaimer(e.target.value)}
          placeholder={`테이블 하단에 표시될 메모 (최대 6줄/${MAX_DISCLAIMER_LENGTH}자)`}
          rows={4}
          maxLength={MAX_DISCLAIMER_LENGTH}
        />
        <small style={{ color: 'var(--azrael-gray-500)', fontSize: 'var(--text-xs)' }}>
          {disclaimer.length}/{MAX_DISCLAIMER_LENGTH}자
        </small>
      </div>

      {/* JIRA 프로젝트 키 (Phase 1) */}
      <div className="form-group">
        <label className="form-label" htmlFor={jiraProjectKeyId}>JIRA 프로젝트 키 (선택)</label>
        <input
          id={jiraProjectKeyId}
          type="text"
          className="form-input"
          value={jiraProjectKey}
          onChange={(e) => setJiraProjectKey(e.target.value)}
          placeholder="예: L10NM4, L10NNC, L10NLY"
        />
        <small style={{ color: 'var(--azrael-gray-500)', fontSize: 'var(--text-xs)' }}>
          JIRA 연동 시 사용할 프로젝트 키
        </small>
      </div>

      {/* Epic Summary 템플릿 (Phase 0.5) */}
      <div className="form-group">
        <label className="form-label" htmlFor={jiraEpicTemplateId}>
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
          id={jiraEpicTemplateId}
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

        {/* Epic Description 템플릿 (v1.2) */}
        <div className="form-group">
          <label className="form-label" htmlFor="jiraEpicDescription">
            Epic Description 템플릿 (선택)
            <span
              className="info-icon"
              title="사용 가능한 변수: {updateDate}, {updateDateDay}, {updateDateFull}, {headsUp}, {headsUpDay}, {headsUpFull}, {iosReviewDate}, {iosReviewDateFull}, {paidProductDate}, {paidProductDateFull}, {projectName}&#10;ADF 테이블 마크업: ||헤더1|헤더2|| |데이터1|데이터2|"
              style={{ marginLeft: '0.5rem', cursor: 'help', color: 'var(--azrael-gray-400)' }}
            >
              ?
            </span>
          </label>
          <textarea
            id="jiraEpicDescription"
            className="form-input"
            value={jiraEpicDescription}
            onChange={(e) => setJiraEpicDescription(e.target.value)}
            placeholder="Epic 일감의 설명에 삽입될 내용 (ADF 테이블 마크업 지원)"
            rows={4}
            style={{ resize: 'vertical' }}
          />
          <small style={{ color: 'var(--azrael-gray-500)', fontSize: 'var(--text-xs)' }}>
            비워두면 Epic 설명 없이 생성됩니다
          </small>

          {/* 표 자동 삽입 토글 */}
          <div style={{ marginTop: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={jiraEpicTableEnabled}
                onChange={(e) => setJiraEpicTableEnabled(e.target.checked)}
              />
              <span style={{ fontSize: 'var(--text-sm)' }}>스케줄 표 자동 삽입</span>
            </label>
          </div>

          {/* 테이블 선택 라디오 (토글 ON일 때만) */}
          {jiraEpicTableEnabled && (
            <div style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', display: 'flex', gap: '1rem' }}>
              {(['table1', 'table2', 'table3'] as const).map((t) => (
                <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
                  <input
                    type="radio"
                    name="epicTableType"
                    value={t}
                    checked={jiraEpicTableType === t}
                    onChange={() => setJiraEpicTableType(t)}
                  />
                  {t === 'table1' ? 'T1 (Standard)' : t === 'table2' ? 'T2 (Ext.)' : 'T3 (Int.)'}
                </label>
              ))}
            </div>
          )}
        </div>

      {/* 헤즈업 Task Summary 템플릿 (Phase 0.5) */}
      <div className="form-group">
        <label className="form-label" htmlFor={jiraHeadsupTemplateId}>
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
          id={jiraHeadsupTemplateId}
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
        <label className="form-label" htmlFor={jiraHeadsupDescriptionId}>
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
          id={jiraHeadsupDescriptionId}
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
        <label className="form-label" htmlFor={jiraTaskIssueTypeId}>
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
          id={jiraTaskIssueTypeId}
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
