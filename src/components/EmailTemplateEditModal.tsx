/**
 * EmailTemplateEditModal
 * 이메일 템플릿 편집/생성 모달 (1100px, 좌우 분할)
 *
 * 좌측: 이름 + 제목 + TipTap 에디터
 * 우측: 실시간 미리보기 (300ms 디바운스)
 *
 * 참조: prd/Azrael-PRD-Phase2.md §4.3, §5 편집 모달 레이아웃
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { EmailTemplateEditor } from './EmailTemplateEditor';
import { EmailPreview } from './EmailPreview';
import {
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
} from '../hooks/useEmailTemplates';
import { generateEmail } from '../lib/email/emailGenerator';
import { validateTemplate } from '../lib/email/templateParser';
import { copySubjectToClipboard } from '../lib/email/clipboard';
import type {
  EmailTemplate,
  Project,
  CalculationResult,
  TableType,
  EmailGenerationResult,
} from '../types';
import './EmailTemplateEditModal.css';

// ============================================================
// Props
// ============================================================

interface EmailTemplateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  template: EmailTemplate | null; // null = 새 템플릿 생성 모드
  project: Project;
  calculationResult: CalculationResult | null;
  onSave: (template: EmailTemplate) => void;
}

// ============================================================
// HTML 정규화 (변경 감지용)
// ============================================================

function normalizeHtml(html: string): string {
  return html.replace(/\s+/g, ' ').trim();
}

// ============================================================
// Component
// ============================================================

export function EmailTemplateEditModal({
  isOpen,
  onClose,
  projectId,
  template,
  project,
  calculationResult,
  onSave,
}: EmailTemplateEditModalProps) {
  // ─── 편집 상태 ───
  const [name, setName] = useState('');
  const [subjectTemplate, setSubjectTemplate] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('');
  const [previewTableType, setPreviewTableType] = useState<TableType>('table1');
  const [showHtmlSource, setShowHtmlSource] = useState(false);
  const [nameError, setNameError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 초기값 스냅샷 (변경 감지용)
  const initialRef = useRef<{ name: string; subject: string; body: string }>({
    name: '',
    subject: '',
    body: '',
  });

  // ─── Mutations ───
  const createMutation = useCreateEmailTemplate();
  const updateMutation = useUpdateEmailTemplate();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ─── 모달 열릴 때 초기화 ───
  useEffect(() => {
    if (isOpen) {
      const n = template?.name ?? '';
      const s = template?.subjectTemplate ?? '';
      const b = template?.bodyTemplate ?? '';
      setName(n);
      setSubjectTemplate(s);
      setBodyTemplate(b);
      setPreviewTableType('table1');
      setShowHtmlSource(false);
      setNameError('');
      setToast(null);
      initialRef.current = { name: n, subject: s, body: b };
    }
  }, [isOpen, template]);

  // ─── 변경 감지 ───
  const hasUnsavedChanges = useMemo(() => {
    const init = initialRef.current;
    if (!template) {
      // 새 템플릿: 뭔가 입력했으면 변경 있음
      return !!(name || subjectTemplate || bodyTemplate);
    }
    return (
      name !== init.name ||
      subjectTemplate !== init.subject ||
      normalizeHtml(bodyTemplate) !== normalizeHtml(init.body)
    );
  }, [name, subjectTemplate, bodyTemplate, template]);

  // ─── 닫기 핸들러 (비저장 변경 확인) ───
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      if (!confirm('저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?')) {
        return;
      }
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  // ─── 300ms 디바운스 미리보기 ───
  const [debouncedBody, setDebouncedBody] = useState(bodyTemplate);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedBody(bodyTemplate), 300);
    return () => clearTimeout(timer);
  }, [bodyTemplate]);

  // 미리보기 생성
  const previewResult = useMemo<EmailGenerationResult | null>(() => {
    if (!calculationResult) return null;
    if (!subjectTemplate && !debouncedBody) return null;

    try {
      return generateEmail(
        {
          projectId,
          updateDate: calculationResult.updateDate,
          tableType: previewTableType,
          templateId: template?.id ?? 'preview',
        },
        {
          template: {
            id: template?.id ?? 'preview',
            projectId,
            name: name || '미리보기',
            subjectTemplate,
            bodyTemplate: debouncedBody,
            isBuiltIn: false,
            createdAt: new Date().toISOString(),
            createdBy: null,
            updatedAt: new Date().toISOString(),
          },
          project,
          calcResult: calculationResult,
        },
      );
    } catch {
      return null;
    }
  }, [subjectTemplate, debouncedBody, previewTableType, calculationResult, project, projectId, name, template]);

  // ─── 이름 유효성 검사 ───
  useEffect(() => {
    if (name.length > 50) {
      setNameError('이름은 50자 이내로 입력해주세요');
    } else {
      setNameError('');
    }
  }, [name]);

  // ─── 저장 핸들러 ───
  const handleSave = useCallback(() => {
    // 이름 검사
    if (!name.trim()) {
      setNameError('이름을 입력해주세요');
      return;
    }
    if (name.length > 50) {
      return;
    }

    // 템플릿 유효성 경고
    const bodyWarnings = validateTemplate(bodyTemplate);
    const subjectWarnings = validateTemplate(subjectTemplate);
    const allWarnings = [...subjectWarnings, ...bodyWarnings];
    if (allWarnings.length > 0) {
      const proceed = confirm(
        `템플릿 경고:\n${allWarnings.join('\n')}\n\n그래도 저장하시겠습니까?`
      );
      if (!proceed) return;
    }

    const data = {
      name: name.trim(),
      subjectTemplate,
      bodyTemplate,
    };

    if (template) {
      // 수정
      updateMutation.mutate(
        { templateId: template.id, data, projectId },
        {
          onSuccess: (updated) => {
            onSave(updated);
            onClose();
          },
          onError: (err: any) => {
            const message = err.message?.includes('uq_email_templates_project_name')
              ? '이미 존재하는 템플릿 이름입니다'
              : `저장에 실패했습니다: ${err.message}`;
            setToast({ message, type: 'error' });
          },
        },
      );
    } else {
      // 생성
      createMutation.mutate(
        { projectId, data },
        {
          onSuccess: (created) => {
            onSave(created);
            onClose();
          },
          onError: (err: any) => {
            const message = err.message?.includes('uq_email_templates_project_name')
              ? '이미 존재하는 템플릿 이름입니다'
              : `생성에 실패했습니다: ${err.message}`;
            setToast({ message, type: 'error' });
          },
        },
      );
    }
  }, [name, subjectTemplate, bodyTemplate, template, projectId, onSave, onClose, createMutation, updateMutation]);

  // ─── 제목 복사 핸들러 ───
  const handleCopySubject = useCallback(async () => {
    if (!previewResult) return;
    try {
      await copySubjectToClipboard(previewResult.subject);
      setToast({ message: '제목이 복사되었습니다', type: 'success' });
    } catch {
      setToast({ message: '제목 복사에 실패했습니다', type: 'error' });
    }
  }, [previewResult]);

  // ─── 토스트 자동 해제 ───
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ─── 렌더링 ───
  const modalTitle = template
    ? `템플릿 편집: "${template.name}"`
    : '새 템플릿';

  const footer = (
    <div className="edit-modal-footer">
      <Button variant="secondary" onClick={handleClose}>취소</Button>
      <Button
        onClick={handleSave}
        disabled={isSaving || !!nameError}
      >
        {isSaving ? '저장 중...' : '저장'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      maxWidth="1100px"
      footer={footer}
    >
      <div className="edit-modal-content">
        {/* 이름 입력 */}
        <div className="edit-name-row">
          <label className="edit-field-label">
            템플릿 이름
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="템플릿 이름 (최대 50자)"
              maxLength={50}
              autoFocus={!template}
            />
          </label>
          {nameError && <div className="edit-name-error">{nameError}</div>}
        </div>

        {/* 제목 입력 */}
        <div className="edit-subject-row">
          <label className="edit-field-label">
            제목 템플릿
            <input
              type="text"
              className="form-input"
              value={subjectTemplate}
              onChange={(e) => setSubjectTemplate(e.target.value)}
              placeholder="예: [L10n] {updateDateShort} 업데이트 일정 안내"
            />
          </label>
        </div>

        {/* 미리보기 테이블 선택 */}
        <div className="edit-preview-table-row">
          <span className="edit-field-label-inline">미리보기 테이블:</span>
          <select
            value={previewTableType}
            onChange={(e) => setPreviewTableType(e.target.value as TableType)}
            className="form-input edit-table-select"
          >
            <option value="table1">T1 (내부 일정표)</option>
            <option value="table2">T2 (Ext. 외부용)</option>
            <option value="table3">T3 (Int. 내부용)</option>
          </select>
        </div>

        {/* 좌우 분할 */}
        <div className="edit-split-layout">
          {/* 좌: 에디터 */}
          <div className="edit-left-pane">
            <div className="edit-pane-label">본문 편집</div>
            <EmailTemplateEditor
              content={bodyTemplate}
              onChange={setBodyTemplate}
              editorKey={template?.id ?? 'new'}
            />
          </div>

          {/* 우: 미리보기 */}
          <div className="edit-right-pane">
            <div className="edit-pane-label">실시간 미리보기</div>
            {!calculationResult ? (
              <div className="edit-no-preview">
                먼저 계산을 실행해주세요
              </div>
            ) : previewResult ? (
              <EmailPreview
                subject={previewResult.subject}
                bodyHtml={previewResult.bodyHtml}
                showHtmlSource={showHtmlSource}
                onToggleHtmlSource={() => setShowHtmlSource((prev) => !prev)}
                onCopySubject={handleCopySubject}
              />
            ) : (
              <div className="edit-no-preview">
                본문을 입력하면 미리보기가 표시됩니다
              </div>
            )}
          </div>
        </div>

        {/* 인라인 토스트 */}
        {toast && (
          <div className={`email-toast email-toast-${toast.type}`}>
            {toast.type === 'success' ? '✓' : '✕'} {toast.message}
          </div>
        )}
      </div>
    </Modal>
  );
}
