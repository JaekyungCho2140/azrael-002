import { useState, useEffect } from 'react';
import { SlackMessageTemplate } from '../types';
import { Button } from './Button';
import {
  useCreateSlackTemplate,
  useUpdateSlackTemplate,
} from '../hooks/useSlackTemplates';

interface SlackTemplateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  template: SlackMessageTemplate | null; // null = 새 템플릿 추가
}

export function SlackTemplateEditModal({
  isOpen,
  onClose,
  projectId,
  template,
}: SlackTemplateEditModalProps) {
  const [name, setName] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('');

  const createMutation = useCreateSlackTemplate();
  const updateMutation = useUpdateSlackTemplate();

  // 템플릿 로드
  useEffect(() => {
    if (template) {
      setName(template.name);
      setBodyTemplate(template.bodyTemplate);
    } else {
      setName('');
      setBodyTemplate('');
    }
  }, [template]);

  // 저장 핸들러
  const handleSave = async () => {
    if (!name.trim()) {
      alert('템플릿 이름을 입력해주세요.');
      return;
    }

    if (!bodyTemplate.trim()) {
      alert('본문 템플릿을 입력해주세요.');
      return;
    }

    try {
      if (template) {
        // 수정
        await updateMutation.mutateAsync({
          id: template.id,
          updates: {
            name: template.isBuiltIn ? undefined : name, // 기본 템플릿은 이름 수정 불가
            bodyTemplate,
          },
        });
        alert('템플릿이 수정되었습니다.');
      } else {
        // 새로 추가
        await createMutation.mutateAsync({
          projectId,
          name,
          bodyTemplate,
        });
        alert('템플릿이 추가되었습니다.');
      }
      onClose();
    } catch (err: any) {
      alert(`저장 실패: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{template ? '템플릿 편집' : '새 템플릿 추가'}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">템플릿 이름</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 기본 일정 알림"
              maxLength={50}
              disabled={template?.isBuiltIn} // 기본 템플릿은 이름 수정 불가
            />
            {template?.isBuiltIn && (
              <small style={{ color: 'var(--azrael-gray-500)', fontSize: 'var(--text-xs)' }}>
                기본 제공 템플릿은 이름을 수정할 수 없습니다.
              </small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">본문 템플릿 (mrkdwn 형식)</label>
            <textarea
              className="form-input"
              value={bodyTemplate}
              onChange={(e) => setBodyTemplate(e.target.value)}
              rows={12}
              placeholder="예: {projectName} 업데이트일: {updateDate}"
              style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)' }}
            />
          </div>

          <div
            className="form-group"
            style={{
              padding: '1rem',
              background: 'var(--azrael-gray-100)',
              border: '1px solid var(--azrael-gray-300)',
              borderRadius: '8px',
            }}
          >
            <h4 style={{ marginBottom: '0.5rem', fontSize: 'var(--text-sm)' }}>사용 가능한 변수</h4>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--azrael-gray-600)' }}>
              <div>
                <strong>날짜 변수:</strong> {'{updateDate}'}, {'{updateDateShort}'}, {'{headsUp}'}
                , {'{iosReviewDate}'}, {'{paidProductDate}'}
              </div>
              <div style={{ marginTop: '0.25rem' }}>
                <strong>테이블:</strong> {'{table}'} — 일정 테이블 (mrkdwn 형식)
              </div>
              <div style={{ marginTop: '0.25rem' }}>
                <strong>기타:</strong> {'{projectName}'}, {'{disclaimer}'}
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <strong>조건부 블록:</strong>
              </div>
              <pre
                style={{
                  marginTop: '0.25rem',
                  padding: '0.5rem',
                  background: 'white',
                  border: '1px solid var(--azrael-gray-300)',
                  borderRadius: '4px',
                  fontSize: 'var(--text-xs)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {`{{#if showIosReviewDate}}
iOS 심사일: {iosReviewDate}
{{/if}}

{{#if showPaidProductDate}}
유료화 상품 협의: {paidProductDate}
{{/if}}`}
              </pre>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
    </div>
  );
}
