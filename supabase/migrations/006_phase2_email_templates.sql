-- Azrael Supabase Migration: Phase 2 Email Templates
-- 작성일: 2026-01-30
-- 설명: 이메일 템플릿 테이블 생성, RLS 정책, seed 트리거, 기존 프로젝트 마이그레이션
-- 참조: Azrael-PRD-Phase2.md §4.2, §6

-- ============================================================
-- 1. EMAIL_TEMPLATES 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  is_built_in BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign Key: 프로젝트 삭제 시 CASCADE
  CONSTRAINT fk_project FOREIGN KEY (project_id)
    REFERENCES projects(id) ON DELETE CASCADE
);

-- 프로젝트 내 이름 중복 방지 (v2.4)
ALTER TABLE email_templates
  ADD CONSTRAINT uq_email_templates_project_name UNIQUE (project_id, name);

-- 이름 길이 제한 (v2.2: 최대 50자)
ALTER TABLE email_templates
  ADD CONSTRAINT chk_name_length CHECK (char_length(name) <= 50);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_email_templates_project_id ON email_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_built_in ON email_templates(is_built_in);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON email_templates(created_by);

-- ============================================================
-- 2. TRIGGERS (updated_at 자동 갱신)
-- ============================================================

-- update_updated_at_column() 함수는 001_initial_schema.sql에서 생성됨
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. SEED 트리거: 프로젝트 생성 시 기본 제공 템플릿(2종) 자동 삽입
-- ============================================================

-- SECURITY DEFINER: RLS INSERT policy를 bypass하여 시스템이 자동 삽입 가능
-- 트리거 실패 시 프로젝트 INSERT도 롤백됨 (동일 트랜잭션, 의도된 동작)
CREATE OR REPLACE FUNCTION seed_email_templates_for_project()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO email_templates (project_id, name, subject_template, body_template, is_built_in, created_by)
  VALUES
    -- "기본" 템플릿
    (NEW.id, '기본',
     '[L10n] {updateDateShort} 업데이트 일정 안내',
     $body$<p style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
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
</p>$body$,
     true, 'SYSTEM'),

    -- "상세" 템플릿
    (NEW.id, '상세',
     '[L10n] {updateDateShort} 업데이트 일정 안내 (상세)',
     $body$<p style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
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
</p>$body$,
     true, 'SYSTEM');

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '기본 이메일 템플릿 생성 실패 (project_id: %). 원인: % — 프로젝트 생성이 롤백됩니다. 재시도하거나 DB 로그를 확인하세요.',
      NEW.id, SQLERRM
      USING ERRCODE = SQLSTATE;
END;
$$ LANGUAGE plpgsql;

-- 프로젝트 INSERT 시 자동 실행
DROP TRIGGER IF EXISTS trg_seed_email_templates ON projects;
CREATE TRIGGER trg_seed_email_templates
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION seed_email_templates_for_project();

-- ============================================================
-- 4. 기존 프로젝트 마이그레이션 (배포 시 1회 실행)
-- ============================================================

-- "기본" 템플릿: 기존 프로젝트 중 아직 없는 경우만 삽입
INSERT INTO email_templates (project_id, name, subject_template, body_template, is_built_in, created_by)
SELECT p.id, '기본',
  '[L10n] {updateDateShort} 업데이트 일정 안내',
  $body$<p style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
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
</p>$body$,
  true, 'SYSTEM'
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates et WHERE et.project_id = p.id AND et.name = '기본'
);

-- "상세" 템플릿: 기존 프로젝트 중 아직 없는 경우만 삽입
INSERT INTO email_templates (project_id, name, subject_template, body_template, is_built_in, created_by)
SELECT p.id, '상세',
  '[L10n] {updateDateShort} 업데이트 일정 안내 (상세)',
  $body$<p style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
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
</p>$body$,
  true, 'SYSTEM'
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates et WHERE et.project_id = p.id AND et.name = '상세'
);

-- ============================================================
-- 5. RLS (Row Level Security) 정책
-- ============================================================

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- 읽기: 모든 인증된 사용자
DROP POLICY IF EXISTS "Authenticated users can read email_templates" ON email_templates;
CREATE POLICY "Authenticated users can read email_templates"
  ON email_templates FOR SELECT
  USING (auth.role() = 'authenticated');

-- 쓰기 (INSERT): 화이트리스트
DROP POLICY IF EXISTS "Whitelisted users can insert email_templates" ON email_templates;
CREATE POLICY "Whitelisted users can insert email_templates"
  ON email_templates FOR INSERT
  WITH CHECK (
    auth.email() IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com'
    )
  );

-- 수정 (UPDATE): 화이트리스트 (기본 템플릿 포함)
DROP POLICY IF EXISTS "Whitelisted users can update email_templates" ON email_templates;
CREATE POLICY "Whitelisted users can update email_templates"
  ON email_templates FOR UPDATE
  USING (
    auth.email() IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com'
    )
  );

-- 삭제 (DELETE): 화이트리스트 + 기본 제공 템플릿 삭제 불가
DROP POLICY IF EXISTS "Whitelisted users can delete custom email_templates" ON email_templates;
CREATE POLICY "Whitelisted users can delete custom email_templates"
  ON email_templates FOR DELETE
  USING (
    auth.email() IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com'
    )
    AND is_built_in = false
  );

-- ============================================================
-- 6. COMMENTS
-- ============================================================

COMMENT ON TABLE email_templates IS '이메일 템플릿 - 프로젝트별 관리, 기본 제공(2종) + 사용자 정의';
COMMENT ON COLUMN email_templates.project_id IS '소속 프로젝트 ID (CASCADE DELETE)';
COMMENT ON COLUMN email_templates.name IS '템플릿 이름 (프로젝트 내 UNIQUE, 최대 50자)';
COMMENT ON COLUMN email_templates.subject_template IS '이메일 제목 템플릿 (변수 치환 지원)';
COMMENT ON COLUMN email_templates.body_template IS '이메일 본문 템플릿 (HTML, 변수/조건부 블록 지원)';
COMMENT ON COLUMN email_templates.is_built_in IS '기본 제공 템플릿 여부 (true=삭제 불가)';
COMMENT ON COLUMN email_templates.created_by IS '생성자 (SYSTEM=seed 트리거, 그 외=사용자 이메일)';

-- ============================================================
-- 7. 검증 쿼리
-- ============================================================

SELECT
  'email_templates' AS table_name,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE is_built_in = true) AS built_in,
  COUNT(*) FILTER (WHERE is_built_in = false) AS custom
FROM email_templates;
