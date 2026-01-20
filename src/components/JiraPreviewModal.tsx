/**
 * JIRA Preview Modal
 * JIRA 일감 생성 전 미리보기
 * 참조: prd/Phase1-Final-Requirements-Summary.md §6.4
 */

import { Modal } from './Modal';
import { Button } from './Button';
import { formatTableDate } from '../lib/businessDays';
import './JiraPreviewModal.css';

interface JiraIssuePreview {
  type: 'Epic' | 'Task' | 'Sub-task';
  issueTypeName?: string;  // 실제 JIRA 이슈 타입 이름 (예: "PM(표준)", "업무")
  summary: string;
  startDate?: Date;
  endDate?: Date;
  stageId: string;
  children?: JiraIssuePreview[];
}

interface JiraPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  epic: {
    summary: string;
    startDate: Date;
    endDate: Date;
  };
  tasks: JiraIssuePreview[];
  isCreating?: boolean;
}

export function JiraPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  epic,
  tasks,
  isCreating = false,
}: JiraPreviewModalProps) {
  // 통계 계산
  const epicCount = 1;
  const taskCount = tasks.filter(t => t.type === 'Task').length;
  const subtaskCount = tasks.reduce((sum, t) => sum + (t.children?.length || 0), 0);

  const renderIssue = (issue: JiraIssuePreview, depth: number = 0): JSX.Element => {
    const icon = issue.type === 'Epic' ? '📦' : issue.type === 'Task' ? '📋' : '📄';
    const indent = depth * 20;

    return (
      <div key={issue.stageId} style={{ marginLeft: `${indent}px` }}>
        <div className="jira-issue-item">
          <div className="issue-header">
            <span className="issue-icon">{icon}</span>
            <span className="issue-type">[{issue.issueTypeName || issue.type}]</span>
            <span className="issue-summary">{issue.summary}</span>
          </div>
          {issue.startDate && issue.endDate && (
            <div className="issue-dates">
              {formatTableDate(issue.startDate)} ~ {formatTableDate(issue.endDate)}
            </div>
          )}
        </div>

        {/* 하위 일감 (Subtasks) 렌더링 */}
        {issue.children && issue.children.map(child => renderIssue(child, depth + 1))}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="JIRA 일감 미리보기"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isCreating}>
            취소
          </Button>
          <Button onClick={onConfirm} disabled={isCreating}>
            {isCreating ? '생성 중...' : 'JIRA 생성'}
          </Button>
        </>
      }
    >
      <div className="jira-preview-content">
        {/* Epic */}
        <div className="jira-issue-item epic">
          <div className="issue-header">
            <span className="issue-icon">📦</span>
            <span className="issue-type">[Epic]</span>
            <span className="issue-summary">{epic.summary}</span>
          </div>
          <div className="issue-dates">
            {formatTableDate(epic.startDate)} ~ {formatTableDate(epic.endDate)}
          </div>
        </div>

        {/* Tasks */}
        {tasks.map(task => renderIssue(task, 1))}

        {/* 통계 */}
        <div className="jira-stats">
          <div>총 {epicCount} Epic, {taskCount} Tasks, {subtaskCount} Subtasks</div>
        </div>
      </div>
    </Modal>
  );
}
