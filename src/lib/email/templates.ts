/**
 * 기본 제공 이메일 템플릿 2종 HTML 정의
 * - BASIC_TEMPLATE: "기본" — 일반 일정 공유용
 * - DETAILED_TEMPLATE: "상세" — 공식 발신용 (배경설명 + 주의사항 포함)
 *
 * DB seed 트리거(006_phase2_email_templates.sql)에서 동일한 HTML을 삽입하며,
 * 프론트엔드에서는 참조/비교 용도로 사용.
 *
 * 참조: prd/Azrael-PRD-Phase2.md §2.6
 */

// ============================================================
// "기본" 템플릿
// ============================================================

/** "기본" 템플릿 제목 (PRD §2.6) */
export const BASIC_SUBJECT_TEMPLATE =
  '[L10n] {updateDate} 업데이트 일정 안내';

/**
 * "기본" 템플릿 본문 HTML (PRD §2.6)
 *
 * 구성: 인사말 → 상단 날짜 → 테이블 → Disclaimer(조건부) → 서명
 * 변수: {updateDate}, {headsUp}, {iosReviewDate}, {table}, {disclaimer}, {projectName}
 * 조건부: {{#if showIosReviewDate}}, {{#if disclaimer}}
 */
export const BASIC_BODY_TEMPLATE = `<p style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
  안녕하세요,
</p>

<p style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
  다음과 같이 {updateDate} 업데이트 현지화 일정을 안내드립니다.
</p>

<ul style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
  <li>□ 헤즈업: {headsUp}</li>
  {{#if showIosReviewDate}}<li>□ iOS 심사일: {iosReviewDate}</li>{{/if}}
</ul>

<p style="font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #000000;">
  [일정표]
</p>

{table}

{{#if disclaimer}}
<p style="color: #666666; font-size: 12px; margin-top: 16px;">
  ※ Disclaimer: {disclaimer}
</p>
{{/if}}

<p style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
  문의사항은 회신 주시기 바랍니다.
</p>

<p style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
  감사합니다.<br>
  L10n팀 드림
</p>`;

// ============================================================
// "상세" 템플릿
// ============================================================

/** "상세" 템플릿 제목 (PRD §2.6) */
export const DETAILED_SUBJECT_TEMPLATE =
  '[L10n] {updateDate} 업데이트 일정 안내 (상세)';

/**
 * "상세" 템플릿 본문 HTML (PRD §2.6)
 *
 * 구성: 인사말 → 배경설명(하드코딩) → 상단 날짜 → 테이블 → Disclaimer(조건부) → 주의사항 → 서명
 * 변수: {updateDate}, {headsUp}, {iosReviewDate}, {table}, {disclaimer}, {projectName}
 * 조건부: {{#if showIosReviewDate}}, {{#if disclaimer}}
 */
export const DETAILED_BODY_TEMPLATE = `<p style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
  안녕하세요,
</p>

<p style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
  {projectName} 프로젝트의 {updateDate} 업데이트 현지화 일정을 안내드립니다.
</p>

<p style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6; background-color: #f9f9f9; padding: 12px; border-left: 4px solid #0066cc;">
  <strong>[배경설명]</strong><br>
  금번 업데이트는 정기 콘텐츠 업데이트입니다. 현지화 일정에 맞춰 번역 및 검수를 진행해주시기 바랍니다.
</p>

<ul style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
  <li>□ 헤즈업: {headsUp}</li>
  {{#if showIosReviewDate}}<li>□ iOS 심사일: {iosReviewDate}</li>{{/if}}
</ul>

<p style="font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #000000;">
  [일정표]
</p>

{table}

{{#if disclaimer}}
<p style="color: #666666; font-size: 12px; margin-top: 16px;">
  ※ Disclaimer: {disclaimer}
</p>
{{/if}}

<p style="font-family: Arial, sans-serif; font-size: 14px; color: #cc0000; line-height: 1.6; background-color: #fff5f5; padding: 12px; border-left: 4px solid #cc0000;">
  <strong>[주의사항]</strong><br>
  • 일정은 내부 사정에 따라 변경될 수 있습니다.<br>
  • 변경 시 별도 안내드리겠습니다.<br>
  • 문의사항은 L10n팀으로 연락 바랍니다.
</p>

<p style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
  감사합니다.<br>
  L10n팀 드림
</p>`;

// ============================================================
// 기본 템플릿 메타데이터
// ============================================================

/** 기본 제공 템플릿 이름 상수 (DB seed/비교에 사용) */
export const BUILT_IN_TEMPLATE_NAMES = {
  BASIC: '기본',
  DETAILED: '상세',
} as const;

