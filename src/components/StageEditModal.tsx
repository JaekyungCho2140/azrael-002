/**
 * Stage Edit Modal
 * 업무 단계 추가/편집 모달
 * 참조: prd/Azrael-PRD-Phase0.md §10.3
 */

import { useState, useEffect, useId } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { WorkStage } from '../types';
import { useJiraAssignees } from '../hooks/useSupabase';

interface StageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage?: WorkStage;
  existingSubtasks?: WorkStage[];  // 기존 하위 일감 (편집 시)
  onSave: (stage: WorkStage, subtasks: WorkStage[]) => void;
}

export function StageEditModal({ isOpen, onClose, stage, existingSubtasks, onSave }: StageEditModalProps) {
  const [name, setName] = useState('');
  const [startOffsetDays, setStartOffsetDays] = useState(10);
  const [endOffsetDays, setEndOffsetDays] = useState(10);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [tableTargets, setTableTargets] = useState<('table1' | 'table2' | 'table3')[]>(['table1', 'table2', 'table3']);
  const [jiraSummaryTemplate, setJiraSummaryTemplate] = useState('');

  // Phase 1.7: 부가 정보 상태
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [jiraDescription, setJiraDescription] = useState('');
  const [jiraAssigneeId, setJiraAssigneeId] = useState<string | null>(null);

  // 하위 일감 템플릿 상태
  const [showSubtaskAccordion, setShowSubtaskAccordion] = useState(false);
  const [subtasks, setSubtasks] = useState<WorkStage[]>([]);

  // JIRA 담당자 목록 조회
  const { data: jiraAssignees = [] } = useJiraAssignees();

  // 폼 라벨 연결용 ID
  const nameId = useId();
  const startOffsetDaysId = useId();
  const endOffsetDaysId = useId();
  const startTimeId = useId();
  const endTimeId = useId();
  const jiraSummaryTemplateId = useId();
  const descriptionId = useId();
  const assigneeId = useId();
  const jiraDescriptionId = useId();
  const jiraAssigneeIdField = useId();

  useEffect(() => {
    if (stage) {
      setName(stage.name);
      setStartOffsetDays(stage.startOffsetDays);
      setEndOffsetDays(stage.endOffsetDays);
      setStartTime(stage.startTime);
      setEndTime(stage.endTime);
      setTableTargets(stage.tableTargets);
      setJiraSummaryTemplate(stage.jiraSummaryTemplate || '');
      // Phase 1.7: 부가 정보 로드
      setDescription(stage.description || '');
      setAssignee(stage.assignee || '');
      setJiraDescription(stage.jiraDescription || '');
      setJiraAssigneeId(stage.jiraAssigneeId || null);
      // 기존 하위 일감 로드
      setSubtasks(existingSubtasks || []);
    } else {
      setName('');
      setStartOffsetDays(10);
      setEndOffsetDays(10);
      setStartTime('09:00');
      setEndTime('18:00');
      setTableTargets(['table1', 'table2', 'table3']);
      setJiraSummaryTemplate('');
      // Phase 1.7: 부가 정보 초기화
      setDescription('');
      setAssignee('');
      setJiraDescription('');
      setJiraAssigneeId(null);
      setSubtasks([]);
    }
    setShowSubtaskAccordion(false);
  }, [stage, existingSubtasks, isOpen]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('업무 단계 이름을 입력해주세요.');
      return;
    }

    if (tableTargets.length === 0) {
      alert('최소 1개 이상의 테이블을 선택해주세요.');
      return;
    }

    // 하위 일감 개수 검증 (Phase 0.5)
    if (subtasks.length > 9) {
      alert('하위 일감은 최대 9개까지 추가할 수 있습니다.');
      return;
    }

    // JIRA Summary 템플릿 검증
    if (jiraSummaryTemplate) {
      const validation = validateTemplate(jiraSummaryTemplate);
      if (!validation.valid) {
        alert(`유효하지 않은 변수: ${validation.invalidVars.join(', ')}`);
        return;
      }
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
      tableTargets,
      jiraSummaryTemplate: jiraSummaryTemplate.trim() || undefined,
      // Phase 1.7: 부가 정보 필드
      description: description.trim(),
      assignee: assignee.trim(),
      jiraDescription: jiraDescription.trim(),
      jiraAssigneeId,
    };

    // 하위 일감 검증 및 order 설정
    const validatedSubtasks = subtasks.map((subtask, index) => ({
      ...subtask,
      parentStageId: updatedStage.id,
      order: (stage?.order ?? 0) + (index + 1) * 0.1,  // 부모.order + 0.1, 0.2, 0.3...
      depth: 1
    }));

    onSave(updatedStage, validatedSubtasks);
    onClose();
  };

  const addSubtask = () => {
    const newSubtask: WorkStage = {
      id: `stage_${Date.now()}_${subtasks.length}`,
      name: '',
      startOffsetDays: startOffsetDays,
      endOffsetDays: endOffsetDays,
      startTime: '09:00',
      endTime: '18:00',
      order: 0,
      depth: 1,
      parentStageId: stage?.id,
      tableTargets: [...tableTargets],
      jiraSummaryTemplate: '{date} 업데이트 {taskName} {subtaskName}',
      jiraSubtaskIssueType: '번역',  // 기본값: 번역
      // Phase 1.7: 부가 정보 필드 (기본값)
      description: '',
      assignee: '',
      jiraDescription: '',
      jiraAssigneeId: null,
    };
    setSubtasks([...subtasks, newSubtask]);
  };

  const updateSubtask = (index: number, field: keyof WorkStage, value: any) => {
    const updated = [...subtasks];
    updated[index] = { ...updated[index], [field]: value };
    setSubtasks(updated);
  };

  const deleteSubtask = (index: number) => {
    if (confirm('이 하위 일감을 삭제하시겠습니까?')) {
      const updated = subtasks.filter((_, i) => i !== index);
      setSubtasks(updated);
    }
  };

  const toggleSubtaskTableTarget = (index: number, target: 'table1' | 'table2' | 'table3') => {
    const updated = [...subtasks];
    const currentTargets = updated[index].tableTargets;
    if (currentTargets.includes(target)) {
      updated[index].tableTargets = currentTargets.filter(t => t !== target);
    } else {
      updated[index].tableTargets = [...currentTargets, target];
    }
    setSubtasks(updated);
  };

  // 템플릿 검증 함수
  const VALID_VARIABLES = ['date', 'headsUp', 'projectName', 'taskName', 'subtaskName', 'stageName'];
  const validateTemplate = (template: string): { valid: boolean; invalidVars: string[] } => {
    const varRegex = /{(\w+)}/g;
    const invalidVars: string[] = [];
    let match;

    while ((match = varRegex.exec(template)) !== null) {
      const varName = match[1];
      if (!VALID_VARIABLES.includes(varName)) {
        invalidVars.push(varName);
      }
    }

    return {
      valid: invalidVars.length === 0,
      invalidVars
    };
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
        <label className="form-label" htmlFor={nameId}>업무 단계 이름</label>
        <input
          id={nameId}
          type="text"
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 정기, 1차, 2차"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={startOffsetDaysId}>마감 역산 영업일 (시작일시)</label>
        <input
          id={startOffsetDaysId}
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
        <label className="form-label" htmlFor={endOffsetDaysId}>테이블 전달 역산 영업일 (종료일시)</label>
        <input
          id={endOffsetDaysId}
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
        <label className="form-label" htmlFor={startTimeId}>기본 시작 시각 (HH:MM)</label>
        <input
          id={startTimeId}
          type="time"
          className="form-input"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={endTimeId}>기본 종료 시각 (HH:MM)</label>
        <input
          id={endTimeId}
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

      {/* JIRA Summary 템플릿 (Phase 0.5) */}
      <div className="form-group">
        <label className="form-label" htmlFor={jiraSummaryTemplateId}>
          JIRA Summary 템플릿
          <span
            className="info-icon"
            title={`사용 가능한 변수:\n{date} - 업데이트일 (YYMMDD)\n{headsUp} - 헤즈업 날짜 (MMDD)\n{projectName} - 프로젝트명\n{taskName} - Task 배치명\n{subtaskName} - Subtask 배치명\n{stageName} - 현재 업무 단계명`}
            style={{ marginLeft: '0.5rem', cursor: 'help', color: 'var(--azrael-gray-400)' }}
          >
            ?
          </span>
        </label>
        <input
          id={jiraSummaryTemplateId}
          type="text"
          className="form-input"
          value={jiraSummaryTemplate}
          onChange={(e) => setJiraSummaryTemplate(e.target.value)}
          placeholder={stage?.depth === 0 ? "{date} 업데이트 {taskName}" : "{date} 업데이트 {taskName} {subtaskName}"}
        />
        <small style={{ color: 'var(--azrael-gray-500)', fontSize: 'var(--text-xs)' }}>
          선택적 - 비워두면 기본 형식 사용
        </small>
      </div>

      {/* Phase 1.7: 부가 정보 입력 필드 */}
      <div className="form-group">
        <label className="form-label" htmlFor={descriptionId}>설명 (모든 테이블 공통)</label>
        <textarea
          id={descriptionId}
          className="form-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="업무 설명을 입력하세요"
          rows={3}
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      {/* T1 전용 필드 */}
      {tableTargets.includes('table1') && (
        <div className="form-group">
          <label className="form-label" htmlFor={assigneeId}>담당자 (테이블 1 전용)</label>
          <textarea
            id={assigneeId}
            className="form-input"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="담당자 이름 (개행 가능)"
            rows={2}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>
      )}

      {/* T2/T3 전용 필드 */}
      {(tableTargets.includes('table2') || tableTargets.includes('table3')) && (
        <>
          <div className="form-group">
            <label className="form-label" htmlFor={jiraDescriptionId}>JIRA 설명 (테이블 2/3 전용)</label>
            <textarea
              id={jiraDescriptionId}
              className="form-input"
              value={jiraDescription}
              onChange={(e) => setJiraDescription(e.target.value)}
              placeholder="JIRA 일감 설명"
              rows={3}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor={jiraAssigneeIdField}>JIRA 담당자 (테이블 2/3 전용)</label>
            <select
              id={jiraAssigneeIdField}
              className="form-input"
              value={jiraAssigneeId || ''}
              onChange={(e) => setJiraAssigneeId(e.target.value || null)}
            >
              <option value="">선택 안 함</option>
              {jiraAssignees.map((assignee: any) => (
                <option key={assignee.id} value={assignee.jiraAccountId}>
                  {assignee.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* 하위 일감 템플릿 아코디언 (depth=0인 경우만) */}
      {(stage?.depth === 0 || !stage) && (
        <div className="form-group" style={{ marginTop: '1.5rem' }}>
          <div
            className="accordion-header"
            onClick={() => setShowSubtaskAccordion(!showSubtaskAccordion)}
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '0.75rem',
              background: 'var(--azrael-gray-50)',
              borderRadius: '8px',
              userSelect: 'none'
            }}
          >
            <span style={{ marginRight: '0.5rem', fontSize: '0.875rem' }}>
              {showSubtaskAccordion ? '▼' : '▶'}
            </span>
            <span style={{ fontWeight: 'var(--weight-semibold)' }}>
              하위 일감 템플릿 (선택적)
            </span>
          </div>

          {showSubtaskAccordion && (
            <div className="subtask-container" style={{ marginTop: '1rem', padding: '1rem', background: 'var(--azrael-gray-50)', borderRadius: '8px' }}>
              {subtasks.map((subtask, index) => (
                <div key={subtask.id} className="subtask-form" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid var(--azrael-gray-200)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <strong style={{ color: 'var(--azrael-gray-700)' }}>{index + 1}. 하위 일감</strong>
                    <button
                      type="button"
                      className="btn-icon btn-danger"
                      onClick={() => deleteSubtask(index)}
                      style={{ fontSize: '0.875rem' }}
                    >
                      ✕ 삭제
                    </button>
                  </div>

                  {/* 배치명 */}
                  <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>배치명</label>
                    <input
                      type="text"
                      className="form-input"
                      value={subtask.name}
                      onChange={(e) => updateSubtask(index, 'name', e.target.value)}
                      placeholder="예: 번역, 검수"
                      style={{ fontSize: 'var(--text-sm)' }}
                    />
                  </div>

                  {/* Offset */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>시작 Offset</label>
                      <input
                        type="number"
                        className="form-input"
                        value={subtask.startOffsetDays}
                        onChange={(e) => updateSubtask(index, 'startOffsetDays', Number(e.target.value))}
                        style={{ fontSize: 'var(--text-sm)' }}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>종료 Offset</label>
                      <input
                        type="number"
                        className="form-input"
                        value={subtask.endOffsetDays}
                        onChange={(e) => updateSubtask(index, 'endOffsetDays', Number(e.target.value))}
                        style={{ fontSize: 'var(--text-sm)' }}
                      />
                    </div>
                  </div>

                  {/* 시각 */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>시작 시각</label>
                      <input
                        type="time"
                        className="form-input"
                        value={subtask.startTime}
                        onChange={(e) => updateSubtask(index, 'startTime', e.target.value)}
                        style={{ fontSize: 'var(--text-sm)' }}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>종료 시각</label>
                      <input
                        type="time"
                        className="form-input"
                        value={subtask.endTime}
                        onChange={(e) => updateSubtask(index, 'endTime', e.target.value)}
                        style={{ fontSize: 'var(--text-sm)' }}
                      />
                    </div>
                  </div>

                  {/* 테이블 선택 */}
                  <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>테이블</label>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <label className="form-checkbox" style={{ fontSize: 'var(--text-xs)' }}>
                        <input
                          type="checkbox"
                          checked={subtask.tableTargets.includes('table2')}
                          onChange={() => toggleSubtaskTableTarget(index, 'table2')}
                        />
                        <span>T2</span>
                      </label>
                      <label className="form-checkbox" style={{ fontSize: 'var(--text-xs)' }}>
                        <input
                          type="checkbox"
                          checked={subtask.tableTargets.includes('table3')}
                          onChange={() => toggleSubtaskTableTarget(index, 'table3')}
                        />
                        <span>T3</span>
                      </label>
                    </div>
                  </div>

                  {/* JIRA Summary 템플릿 */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                      JIRA Summary
                      <span
                        className="info-icon"
                        title="사용 가능한 변수: {date}, {taskName}, {subtaskName}"
                        style={{ marginLeft: '0.5rem', cursor: 'help', color: 'var(--azrael-gray-400)' }}
                      >
                        ?
                      </span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={subtask.jiraSummaryTemplate || ''}
                      onChange={(e) => updateSubtask(index, 'jiraSummaryTemplate', e.target.value)}
                      placeholder="{date} 업데이트 {taskName} {subtaskName}"
                      style={{ fontSize: 'var(--text-sm)' }}
                    />
                  </div>

                  {/* Subtask 이슈 타입 (Phase 1.5) */}
                  <div className="form-group" style={{ marginBottom: 0, marginTop: '0.5rem' }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                      Subtask 이슈 타입
                      <span
                        className="info-icon"
                        title="JIRA에서 생성할 Subtask 이슈 타입을 선택하세요."
                        style={{ marginLeft: '0.5rem', cursor: 'help', color: 'var(--azrael-gray-400)' }}
                      >
                        ?
                      </span>
                    </label>
                    <select
                      className="form-input"
                      value={subtask.jiraSubtaskIssueType || ''}
                      onChange={(e) => updateSubtask(index, 'jiraSubtaskIssueType', e.target.value)}
                      style={{ fontSize: 'var(--text-sm)' }}
                    >
                      <option value="번역">번역</option>
                      <option value="PM(하위)">PM(하위)</option>
                      <option value="검수">검수</option>
                      <option value="Side Project(하위)">Side Project(하위)</option>
                    </select>
                  </div>

                  {/* Phase 1.7: 하위 일감 부가 정보 */}
                  <div className="form-group" style={{ marginTop: '0.5rem' }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>설명</label>
                    <textarea
                      className="form-input"
                      value={subtask.description || ''}
                      onChange={(e) => updateSubtask(index, 'description', e.target.value)}
                      placeholder="하위 일감 설명"
                      rows={2}
                      style={{ fontSize: 'var(--text-sm)', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>

                  {(subtask.tableTargets.includes('table2') || subtask.tableTargets.includes('table3')) && (
                    <>
                      <div className="form-group" style={{ marginTop: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>JIRA 설명</label>
                        <textarea
                          className="form-input"
                          value={subtask.jiraDescription || ''}
                          onChange={(e) => updateSubtask(index, 'jiraDescription', e.target.value)}
                          placeholder="JIRA Subtask 설명"
                          rows={2}
                          style={{ fontSize: 'var(--text-sm)', resize: 'vertical', fontFamily: 'inherit' }}
                        />
                      </div>

                      <div className="form-group" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>JIRA 담당자</label>
                        <select
                          className="form-input"
                          value={subtask.jiraAssigneeId || ''}
                          onChange={(e) => updateSubtask(index, 'jiraAssigneeId', e.target.value || null)}
                          style={{ fontSize: 'var(--text-sm)' }}
                        >
                          <option value="">선택 안 함</option>
                          {jiraAssignees.map((assignee: any) => (
                            <option key={assignee.id} value={assignee.jiraAccountId}>
                              {assignee.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              ))}

              <Button
                variant="secondary"
                onClick={addSubtask}
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                + 하위 일감 추가
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
