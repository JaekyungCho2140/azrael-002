/**
 * EmailGeneratorModal
 * 이메일 복사 메인 모달 (800px)
 *
 * 구조:
 *   1. 테이블 선택 라디오 (T1/T2/T3)
 *   2. 템플릿 선택 (기본/상세/사용자정의)
 *   3. 미리보기 영역 (EmailPreview)
 *   4. 하단 버튼: [취소] [클립보드 복사]
 *
 * 상태 관리:
 *   - selectedTableType: 기본 'table2' (T2 Ext.)
 *   - selectedTemplateId: 첫 번째 built-in 템플릿
 *   - showHtmlSource: false (렌더링 미리보기)
 *   - emailResult: 생성된 이메일 결과
 *   - 모달 열 때마다 초기값으로 리셋
 *
 * 참조: prd/Azrael-PRD-Phase2.md §3.2, §3.3, §4.3
 */

import { useState, useEffect, useCallback } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { EmailTemplateSelector } from './EmailTemplateSelector';
import { EmailPreview } from './EmailPreview';
import { useEmailTemplates } from '../hooks/useEmailTemplates';
import { generateEmail } from '../lib/email/emailGenerator';
import {
  copyEmailToClipboard,
  copySubjectToClipboard,
  checkClipboardSupport,
} from '../lib/email/clipboard';
import type {
  TableType,
  Project,
  CalculationResult,
  EmailGenerationResult,
} from '../types';
import { TOAST_DURATION_MS } from '../constants';
import './EmailGeneratorModal.css';

// ============================================================
// Props
// ============================================================

interface EmailGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  project: Project;
  updateDate: Date;
  calculationResult: CalculationResult | null;
}

// ============================================================
// 상수
// ============================================================

const TABLE_OPTIONS: { value: TableType; label: string }[] = [
  { value: 'table1', label: '테이블 1 (내부 일정표)' },
  { value: 'table2', label: '테이블 2 (Ext. 외부용)' },
  { value: 'table3', label: '테이블 3 (Int. 내부용)' },
];

// ============================================================
// Component
// ============================================================

export function EmailGeneratorModal({
  isOpen,
  onClose,
  projectId,
  project,
  updateDate,
  calculationResult,
}: EmailGeneratorModalProps) {
  // ─── 상태 ───
  const [selectedTableType, setSelectedTableType] = useState<TableType>('table2');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showHtmlSource, setShowHtmlSource] = useState(false);
  const [emailResult, setEmailResult] = useState<EmailGenerationResult | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ─── 데이터 조회 ───
  const { data: templates = [], isLoading: isLoadingTemplates } = useEmailTemplates(projectId);
  const customTemplates = templates.filter((t) => !t.isBuiltIn);

  // ─── 클립보드 지원 확인 ───
  const clipboardCheck = checkClipboardSupport();

  // ─── 모달 열릴 때 상태 초기화 ───
  useEffect(() => {
    if (isOpen) {
      setSelectedTableType('table2');
      setSelectedTemplateId(null); // 템플릿 로드 완료 후 별도 useEffect에서 설정
      setShowHtmlSource(false);
      setEmailResult(null);
      setIsCopying(false);
      setToast(null);
    }
  }, [isOpen]);

  // ─── 템플릿 로드 완료 시 기본 템플릿 선택 ───
  useEffect(() => {
    if (isOpen && templates.length > 0 && selectedTemplateId === null) {
      setSelectedTemplateId(templates[0]?.id ?? null);
    }
  }, [isOpen, templates.length, selectedTemplateId]);

  // ─── 이메일 생성 (테이블/템플릿 변경 시 자동 실행) ───
  useEffect(() => {
    if (!selectedTemplateId || !calculationResult) {
      setEmailResult(null);
      return;
    }

    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template) {
      setEmailResult(null);
      return;
    }

    try {
      const result = generateEmail(
        {
          projectId,
          updateDate,
          tableType: selectedTableType,
          templateId: selectedTemplateId,
        },
        {
          template,
          project,
          calcResult: calculationResult,
        },
      );
      setEmailResult(result);
    } catch (err) {
      console.error('이메일 생성 실패:', err);
      setEmailResult(null);
    }
  }, [selectedTableType, selectedTemplateId, calculationResult, templates, projectId, updateDate, project]);

  // ─── 클립보드 복사 핸들러 ───
  const handleCopyBody = useCallback(async () => {
    if (!emailResult || isCopying) return;

    setIsCopying(true);
    try {
      await copyEmailToClipboard(emailResult.bodyHtml, emailResult.bodyText);
      setToast({ message: '클립보드에 복사되었습니다', type: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : '클립보드 복사에 실패했습니다. 다시 시도해주세요.';
      setToast({ message, type: 'error' });
    } finally {
      setIsCopying(false);
    }
  }, [emailResult, isCopying]);

  // ─── 제목 복사 핸들러 ───
  const handleCopySubject = useCallback(async () => {
    if (!emailResult) return;
    try {
      await copySubjectToClipboard(emailResult.subject);
      setToast({ message: '제목이 복사되었습니다', type: 'success' });
    } catch {
      setToast({ message: '제목 복사에 실패했습니다', type: 'error' });
    }
  }, [emailResult]);

  // ─── 토스트 자동 해제 ───
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ─── 렌더링 ───
  const footer = (
    <div className="email-modal-footer">
      <Button variant="secondary" onClick={onClose}>취소</Button>
      <Button
        onClick={handleCopyBody}
        disabled={!emailResult || isCopying || !clipboardCheck.supported}
        title={!clipboardCheck.supported ? clipboardCheck.warning : undefined}
      >
        {isCopying ? '복사 중...' : '클립보드 복사'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="이메일 복사"
      maxWidth="800px"
      footer={footer}
    >
      <div className="email-generator-content">
        {/* Firefox 경고 */}
        {!clipboardCheck.supported && (
          <div className="email-clipboard-warning">
            {clipboardCheck.warning}
          </div>
        )}

        {/* 테이블 선택 */}
        <div className="email-section">
          <div className="email-section-label">테이블 선택</div>
          <div className="email-table-radios">
            {TABLE_OPTIONS.map((opt) => (
              <label key={opt.value} className="email-table-radio">
                <input
                  type="radio"
                  name="tableType"
                  value={opt.value}
                  checked={selectedTableType === opt.value}
                  onChange={() => setSelectedTableType(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 템플릿 선택 */}
        <div className="email-section">
          <EmailTemplateSelector
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelect={setSelectedTemplateId}
            isLoading={isLoadingTemplates}
            hasCustomTemplates={customTemplates.length > 0}
          />
        </div>

        {/* 미리보기 */}
        <div className="email-section">
          {!calculationResult ? (
            <div className="email-no-result">먼저 계산을 실행해주세요</div>
          ) : !selectedTemplateId ? (
            <div className="email-no-result">템플릿을 선택해주세요</div>
          ) : emailResult ? (
            <EmailPreview
              subject={emailResult.subject}
              bodyHtml={emailResult.bodyHtml}
              showHtmlSource={showHtmlSource}
              onToggleHtmlSource={() => setShowHtmlSource((prev) => !prev)}
              onCopySubject={handleCopySubject}
            />
          ) : (
            <div className="email-no-result">이메일을 생성할 수 없습니다</div>
          )}
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
