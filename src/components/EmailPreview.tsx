/**
 * EmailPreview
 * 이메일 미리보기 영역 (제목 + 본문 렌더링 + HTML 소스 토글)
 *
 * - 제목: 클릭 시 navigator.clipboard.writeText()로 복사
 * - 본문: HTML 렌더링 또는 소스 코드 표시
 * - [HTML 보기] / [미리보기] 토글 버튼
 *
 * 참조: prd/Azrael-PRD-Phase2.md §3.3, §4.3
 */

import { useState } from 'react';

// ============================================================
// Props
// ============================================================

interface EmailPreviewProps {
  subject: string;
  bodyHtml: string;
  showHtmlSource: boolean;
  onToggleHtmlSource: () => void;
  onCopySubject: () => void;
}

// ============================================================
// Component
// ============================================================

export function EmailPreview({
  subject,
  bodyHtml,
  showHtmlSource,
  onToggleHtmlSource,
  onCopySubject,
}: EmailPreviewProps) {
  const [subjectCopied, setSubjectCopied] = useState(false);

  const handleCopySubject = () => {
    onCopySubject();
    setSubjectCopied(true);
    setTimeout(() => setSubjectCopied(false), 2000);
  };

  return (
    <div className="email-preview">
      <div className="preview-header">
        <span className="preview-label">미리보기</span>
        <button
          type="button"
          className="preview-toggle-btn"
          onClick={onToggleHtmlSource}
        >
          {showHtmlSource ? '미리보기' : 'HTML 보기'}
        </button>
      </div>

      <div className="preview-content">
        {/* 제목 영역 */}
        <div
          className="preview-subject"
          onClick={handleCopySubject}
          title="클릭하여 제목 복사"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleCopySubject();
          }}
        >
          <span className="preview-subject-label">제목:</span>
          <span className="preview-subject-text">{subject}</span>
          <span className="preview-subject-copy">
            {subjectCopied ? '✓ 복사됨' : '📋'}
          </span>
        </div>

        {/* 본문 영역 */}
        <div className="preview-body">
          {showHtmlSource ? (
            <pre className="preview-html-source">
              <code>{bodyHtml}</code>
            </pre>
          ) : (
            <div
              className="preview-html-rendered"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
