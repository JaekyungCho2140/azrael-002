/**
 * EmailTemplateEditor
 * TipTap WYSIWYG 에디터 래퍼 (이메일 템플릿 본문 편집)
 *
 * 기능: Bold, Italic, Underline, 목록, 링크, 테이블, 색상, 정렬, 변수 삽입
 * 제목(H1-H3)은 이메일에 불필요하므로 제외.
 *
 * 참조: prd/Azrael-PRD-Phase2.md §5 TipTap 기능 명세
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { useState, useCallback, useEffect } from 'react';
import './EmailTemplateEditor.css';

// ============================================================
// 변수 삽입 드롭다운 목록
// ============================================================

const VARIABLE_OPTIONS = [
  // 업데이트 날짜 (3형식)
  { label: '{updateDate} - 업데이트 날짜 (MMDD)', value: '{updateDate}' },
  { label: '{updateDateDay} - 업데이트 날짜 (MM/DD(요일))', value: '{updateDateDay}' },
  { label: '{updateDateFull} - 업데이트 날짜 (YY/MM/DD)', value: '{updateDateFull}' },
  // 헤즈업 날짜 (3형식)
  { label: '{headsUp} - 헤즈업 날짜 (MMDD)', value: '{headsUp}' },
  { label: '{headsUpDay} - 헤즈업 날짜 (MM/DD(요일))', value: '{headsUpDay}' },
  { label: '{headsUpFull} - 헤즈업 날짜 (YY/MM/DD)', value: '{headsUpFull}' },
  // iOS 심사일 (3형식)
  { label: '{iosReviewDate} - iOS 심사일 (MMDD)', value: '{iosReviewDate}' },
  { label: '{iosReviewDateDay} - iOS 심사일 (MM/DD(요일))', value: '{iosReviewDateDay}' },
  { label: '{iosReviewDateFull} - iOS 심사일 (YY/MM/DD)', value: '{iosReviewDateFull}' },
  // 유료화 상품 협의 일정 (3형식)
  { label: '{paidProductDate} - 유료화 상품 (MMDD)', value: '{paidProductDate}' },
  { label: '{paidProductDateDay} - 유료화 상품 (MM/DD(요일))', value: '{paidProductDateDay}' },
  { label: '{paidProductDateFull} - 유료화 상품 (YY/MM/DD)', value: '{paidProductDateFull}' },
  // 레거시
  { label: '{date} - 업데이트 날짜 (YYMMDD, 레거시)', value: '{date}' },
  // 비날짜 변수
  { label: '{table} - 일정 테이블', value: '{table}' },
  { label: '{disclaimer} - Disclaimer', value: '{disclaimer}' },
  { label: '{projectName} - 프로젝트 이름', value: '{projectName}' },
  // 조건부 블록
  {
    label: '{{#if showIosReviewDate}} - iOS 심사일 조건부',
    value: '{{#if showIosReviewDate}}<li>□ iOS 심사일: {iosReviewDate}</li>{{/if}}',
  },
  {
    label: '{{#if showPaidProductDate}} - 유료화 상품 조건부',
    value: '{{#if showPaidProductDate}}<li>□ 유료화 상품 협의: {paidProductDate}</li>{{/if}}',
  },
  {
    label: '{{#if disclaimer}} - Disclaimer 조건부',
    value: '{{#if disclaimer}}<p style="color: #666666; font-size: 12px; margin-top: 16px;">※ Disclaimer: {disclaimer}</p>{{/if}}',
  },
];

// ============================================================
// Props
// ============================================================

interface EmailTemplateEditorProps {
  content: string;
  onChange: (html: string) => void;
  editorKey?: string;
}

// ============================================================
// Component
// ============================================================

export function EmailTemplateEditor({
  content,
  onChange,
  editorKey,
}: EmailTemplateEditorProps) {
  const [showVariableMenu, setShowVariableMenu] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // 이메일에 불필요
        // StarterKit에 포함된 Link, Underline은 여기서 설정
        link: {
          openOnClick: false,
          HTMLAttributes: {
            style: 'color: #0066cc; text-decoration: underline;',
          },
        },
      }),
      Table.configure({
        resizable: false,
        HTMLAttributes: {
          border: '1',
          cellpadding: '8',
          cellspacing: '0',
          style: 'border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px;',
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  }, [editorKey]);

  // 외부 content 변경 시 에디터 동기화
  // 부모의 useEffect에서 bodyTemplate이 비동기로 설정되므로
  // content 변경도 감시해야 초기 로드 시 빈 에디터 방지
  useEffect(() => {
    if (editor && content && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [editor, content, editorKey]);

  // 변수 삽입 핸들러
  const handleInsertVariable = useCallback((variable: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(variable).run();
    setShowVariableMenu(false);
  }, [editor]);

  // 링크 삽입 핸들러
  const handleAddLink = useCallback(() => {
    if (!editor) return;
    const url = prompt('URL을 입력하세요:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  // 테이블 삽입 핸들러
  const handleInsertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="tiptap-editor-wrapper">
      {/* 툴바 */}
      <div className="tiptap-toolbar">
        {/* 서식 */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline"
          >
            <u>U</u>
          </button>
        </div>

        {/* 목록 */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="순서 없는 목록"
          >
            •
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="순서 있는 목록"
          >
            1.
          </button>
        </div>

        {/* 정렬 */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            title="왼쪽 정렬"
          >
            ≡
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            title="가운데 정렬"
          >
            ≡
          </button>
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            title="오른쪽 정렬"
          >
            ≡
          </button>
        </div>

        {/* 색상 */}
        <div className="toolbar-group">
          <input
            type="color"
            className="toolbar-color-picker"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            title="텍스트 색상"
            defaultValue="#333333"
          />
        </div>

        {/* 링크 & 테이블 */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive('link') ? 'active' : ''}`}
            onClick={handleAddLink}
            title="링크 삽입"
          >
            🔗
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={handleInsertTable}
            title="테이블 삽입"
          >
            📊
          </button>
        </div>

        {/* 변수 삽입 */}
        <div className="toolbar-group toolbar-variable-group">
          <button
            type="button"
            className="toolbar-btn toolbar-variable-btn"
            onClick={() => setShowVariableMenu(!showVariableMenu)}
            title="변수 삽입"
          >
            변수 삽입 ▼
          </button>
          {showVariableMenu && (
            <div className="toolbar-variable-dropdown">
              {VARIABLE_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  className="variable-option"
                  onClick={() => handleInsertVariable(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 에디터 본문 */}
      <EditorContent editor={editor} className="tiptap-content" />
    </div>
  );
}
