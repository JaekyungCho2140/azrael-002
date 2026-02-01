/**
 * EmailTemplateSelector
 * 이메일 템플릿 선택 UI (라디오 3개 + 사용자 정의 드롭다운)
 *
 * 라디오: ● 기본  ○ 상세  ○ 사용자 정의
 * "사용자 정의" 선택 시 드롭다운 확장.
 * 사용자 정의 템플릿이 없으면 라디오 비활성화 + 툴팁 표시.
 *
 * 참조: prd/Azrael-PRD-Phase2.md §3.3, §4.3
 */

import { useState, useEffect } from 'react';
import type { EmailTemplate, TemplateCategory } from '../types';
import { BUILT_IN_TEMPLATE_NAMES } from '../lib/email/templates';

// ============================================================
// Props
// ============================================================

interface EmailTemplateSelectorProps {
  templates: EmailTemplate[];
  selectedTemplateId: string | null;
  onSelect: (templateId: string) => void;
  isLoading: boolean;
  hasCustomTemplates: boolean;
}

// ============================================================
// Component
// ============================================================

export function EmailTemplateSelector({
  templates,
  selectedTemplateId,
  onSelect,
  isLoading,
  hasCustomTemplates,
}: EmailTemplateSelectorProps) {
  // 현재 선택된 카테고리 계산
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const currentCategory: TemplateCategory = selectedTemplate
    ? selectedTemplate.isBuiltIn && selectedTemplate.name === BUILT_IN_TEMPLATE_NAMES.BASIC
      ? 'basic'
      : selectedTemplate.isBuiltIn && selectedTemplate.name === BUILT_IN_TEMPLATE_NAMES.DETAILED
        ? 'detailed'
        : 'custom'
    : 'basic';

  // 사용자 정의 드롭다운 선택값 (카테고리가 custom일 때만 사용)
  const customTemplates = templates.filter((t) => !t.isBuiltIn);
  const [customDropdownId, setCustomDropdownId] = useState<string | null>(
    customTemplates[0]?.id ?? null,
  );

  // 사용자 정의 목록 변경 시 드롭다운 초기값 갱신
  useEffect(() => {
    if (customTemplates.length > 0 && !customTemplates.find((t) => t.id === customDropdownId)) {
      setCustomDropdownId(customTemplates[0].id);
    }
  }, [customTemplates.length]);

  // 카테고리 변경 핸들러
  const handleCategoryChange = (category: TemplateCategory) => {
    if (category === 'basic') {
      const basic = templates.find(
        (t) => t.isBuiltIn && t.name === BUILT_IN_TEMPLATE_NAMES.BASIC,
      );
      if (basic) onSelect(basic.id);
    } else if (category === 'detailed') {
      const detailed = templates.find(
        (t) => t.isBuiltIn && t.name === BUILT_IN_TEMPLATE_NAMES.DETAILED,
      );
      if (detailed) onSelect(detailed.id);
    } else if (category === 'custom') {
      const firstCustom = customDropdownId ?? customTemplates[0]?.id;
      if (firstCustom) onSelect(firstCustom);
    }
  };

  // 사용자 정의 드롭다운 변경 핸들러
  const handleCustomDropdownChange = (templateId: string) => {
    setCustomDropdownId(templateId);
    onSelect(templateId);
  };

  if (isLoading) {
    return (
      <div className="email-template-selector">
        <div className="selector-label">템플릿 선택</div>
        <div className="selector-loading">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="email-template-selector">
      <div className="selector-label">템플릿 선택</div>
      <div className="selector-radios">
        <label className="selector-radio">
          <input
            type="radio"
            name="templateCategory"
            value="basic"
            checked={currentCategory === 'basic'}
            onChange={() => handleCategoryChange('basic')}
          />
          <span>기본</span>
        </label>
        <label className="selector-radio">
          <input
            type="radio"
            name="templateCategory"
            value="detailed"
            checked={currentCategory === 'detailed'}
            onChange={() => handleCategoryChange('detailed')}
          />
          <span>상세</span>
        </label>
        <label
          className="selector-radio"
          title={
            !hasCustomTemplates
              ? '사용자 정의 템플릿이 없습니다. 설정에서 추가할 수 있습니다.'
              : undefined
          }
        >
          <input
            type="radio"
            name="templateCategory"
            value="custom"
            checked={currentCategory === 'custom'}
            onChange={() => handleCategoryChange('custom')}
            disabled={!hasCustomTemplates}
          />
          <span>사용자 정의</span>
        </label>
      </div>

      {/* 사용자 정의 선택 시 드롭다운 */}
      {currentCategory === 'custom' && hasCustomTemplates && (
        <div className="selector-custom-dropdown">
          <select
            value={customDropdownId ?? ''}
            onChange={(e) => handleCustomDropdownChange(e.target.value)}
            className="form-input"
          >
            {customTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
