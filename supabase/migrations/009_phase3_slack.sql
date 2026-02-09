-- ============================================================
-- Azrael Supabase Migration 009: Phase 3 Slack 연동
-- 작성일: 2026-02-09
-- 설명: Slack OAuth 토큰, 메시지 템플릿, 채널 매핑 테이블 생성
-- 참조: Azrael-PRD-Phase3.md §6.2~§9
-- ============================================================

-- ============================================================
-- 1. SLACK_USER_TOKENS 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS slack_user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,          -- Supabase auth.users.id (TEXT 타입)
  access_token TEXT NOT NULL,            -- Slack User OAuth Token (평문)
  slack_user_id TEXT NOT NULL,           -- Slack 사용자 ID (예: U0123456)
  team_id TEXT NOT NULL,                 -- Slack Workspace ID (예: T0123456)
  team_name TEXT,                        -- Slack Workspace 이름 (표시용)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_slack_user_tokens_user_id ON slack_user_tokens(user_id);

-- ============================================================
-- 2. SLACK_MESSAGE_TEMPLATES 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS slack_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  body_template TEXT NOT NULL,           -- mrkdwn 본문 템플릿
  is_built_in BOOLEAN NOT NULL DEFAULT false,  -- NOT NULL: 명시적 상태 보장
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,                       -- 생성자 이메일
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign Key: 프로젝트 삭제 시 CASCADE
  CONSTRAINT fk_project FOREIGN KEY (project_id)
    REFERENCES projects(id) ON DELETE CASCADE,

  -- 프로젝트 내 이름 중복 방지
  CONSTRAINT uq_slack_templates_project_name UNIQUE (project_id, name),

  -- 이름 길이 제한 (최대 50자)
  CONSTRAINT chk_name_length CHECK (char_length(name) <= 50)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_slack_templates_project_id ON slack_message_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_slack_templates_name ON slack_message_templates(project_id, name);

-- ============================================================
-- 3. PROJECTS 테이블 확장 (채널 매핑)
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS slack_channel_id TEXT,         -- Slack 기본 채널 ID
  ADD COLUMN IF NOT EXISTS slack_channel_name TEXT;       -- Slack 기본 채널 이름 (표시용)

-- CHECK 제약: 채널 ID와 이름은 둘 다 있거나 둘 다 NULL (일관성 보장)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_slack_channel_consistency'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT chk_slack_channel_consistency
      CHECK (
        (slack_channel_id IS NULL AND slack_channel_name IS NULL) OR
        (slack_channel_id IS NOT NULL AND slack_channel_name IS NOT NULL)
      );
  END IF;
END $$;

-- COMMENT
COMMENT ON COLUMN projects.slack_channel_id IS 'Slack 기본 채널 ID (Phase 3)';
COMMENT ON COLUMN projects.slack_channel_name IS 'Slack 기본 채널 이름 (Phase 3, 표시용)';

-- ============================================================
-- 4. TRIGGERS (updated_at 자동 갱신)
-- ============================================================

-- update_updated_at_column() 함수는 001_initial_schema.sql에서 생성됨
DROP TRIGGER IF EXISTS update_slack_message_templates_updated_at ON slack_message_templates;
CREATE TRIGGER update_slack_message_templates_updated_at
  BEFORE UPDATE ON slack_message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_slack_user_tokens_updated_at ON slack_user_tokens;
CREATE TRIGGER update_slack_user_tokens_updated_at
  BEFORE UPDATE ON slack_user_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. SEED 트리거: 프로젝트 생성 시 기본 슬랙 템플릿 자동 삽입
-- ============================================================

-- SECURITY DEFINER: RLS INSERT policy를 bypass하여 시스템이 자동 삽입 가능
-- 트리거 실패 시 프로젝트 INSERT도 롤백됨 (동일 트랜잭션, 의도된 동작)
CREATE OR REPLACE FUNCTION seed_slack_templates_for_project()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO slack_message_templates (project_id, name, body_template, is_built_in, created_by)
  VALUES
    -- "기본 템플릿" (1종)
    (NEW.id, '기본 템플릿',
     $body$*[{updateDateShort} 업데이트 일정]*

*헤즈업:* {headsUp}
{{#if showIosReviewDate}}*iOS 심사일:* {iosReviewDate}
{{/if}}{{#if showPaidProductDate}}*유료화 상품 협의:* {paidProductDate}
{{/if}}
---

{table}

{{#if disclaimer}}---
_{disclaimer}_
{{/if}}
<https://azrael-002.vercel.app|Azrael에서 자세히 보기>$body$,
     true, 'SYSTEM');

  RETURN NEW;

EXCEPTION
  WHEN others THEN
    -- 한글 에러 메시지 + ERRCODE: 트리거 실패 시 프로젝트 INSERT도 롤백
    RAISE EXCEPTION '슬랙 기본 템플릿 생성 실패 (프로젝트 ID: %): %', NEW.id, SQLERRM
      USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

-- 기존 트리거가 있다면 삭제 후 재생성
DROP TRIGGER IF EXISTS trg_seed_slack_templates ON projects;
CREATE TRIGGER trg_seed_slack_templates
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION seed_slack_templates_for_project();

-- ============================================================
-- 6. RLS 정책: SLACK_USER_TOKENS
-- ============================================================

ALTER TABLE slack_user_tokens ENABLE ROW LEVEL SECURITY;

-- SELECT: 본인 토큰만 조회
DROP POLICY IF EXISTS "Users can read own slack_user_tokens" ON slack_user_tokens;
CREATE POLICY "Users can read own slack_user_tokens"
  ON slack_user_tokens FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

-- INSERT: 화이트리스트 사용자만 + 본인 레코드만
DROP POLICY IF EXISTS "Whitelisted users can insert slack_user_tokens" ON slack_user_tokens;
CREATE POLICY "Whitelisted users can insert slack_user_tokens"
  ON slack_user_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email' IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com',
      'uzilay@gmail.com'
    )
    AND auth.uid()::text = user_id
  );

-- UPDATE: 화이트리스트 + 본인 레코드만
DROP POLICY IF EXISTS "Whitelisted users can update slack_user_tokens" ON slack_user_tokens;
CREATE POLICY "Whitelisted users can update slack_user_tokens"
  ON slack_user_tokens FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com',
      'uzilay@gmail.com'
    )
    AND auth.uid()::text = user_id
  );

-- DELETE: 화이트리스트 + 본인 레코드만
DROP POLICY IF EXISTS "Whitelisted users can delete slack_user_tokens" ON slack_user_tokens;
CREATE POLICY "Whitelisted users can delete slack_user_tokens"
  ON slack_user_tokens FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com',
      'uzilay@gmail.com'
    )
    AND auth.uid()::text = user_id
  );

-- ============================================================
-- 7. RLS 정책: SLACK_MESSAGE_TEMPLATES
-- ============================================================

ALTER TABLE slack_message_templates ENABLE ROW LEVEL SECURITY;

-- SELECT: 모든 인증된 사용자 조회 가능
DROP POLICY IF EXISTS "Anyone can read slack_message_templates" ON slack_message_templates;
CREATE POLICY "Anyone can read slack_message_templates"
  ON slack_message_templates FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: 화이트리스트 사용자만
DROP POLICY IF EXISTS "Whitelisted users can insert slack_message_templates" ON slack_message_templates;
CREATE POLICY "Whitelisted users can insert slack_message_templates"
  ON slack_message_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email' IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com',
      'uzilay@gmail.com'
    )
    AND is_built_in = false  -- INSERT 시 built-in 템플릿 생성 방지 (시드 트리거만 허용)
  );

-- UPDATE: 화이트리스트 사용자만
DROP POLICY IF EXISTS "Whitelisted users can update slack_message_templates" ON slack_message_templates;
CREATE POLICY "Whitelisted users can update slack_message_templates"
  ON slack_message_templates FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com',
      'uzilay@gmail.com'
    )
  );

-- DELETE: 화이트리스트 사용자만 + 커스텀 템플릿만 삭제 가능
DROP POLICY IF EXISTS "Whitelisted users can delete custom slack_message_templates" ON slack_message_templates;
CREATE POLICY "Whitelisted users can delete custom slack_message_templates"
  ON slack_message_templates FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com',
      'uzilay@gmail.com'
    )
    AND is_built_in = false
  );

-- ============================================================
-- 8. 기존 프로젝트에 기본 슬랙 템플릿 자동 생성
-- ============================================================

-- 이미 존재하는 프로젝트들에 대해 기본 슬랙 템플릿 1개를 추가
-- (신규 프로젝트는 트리거가 자동 생성)
INSERT INTO slack_message_templates (project_id, name, body_template, is_built_in, created_by)
SELECT
  id,
  '기본 템플릿',
  $body$*[{updateDateShort} 업데이트 일정]*

*헤즈업:* {headsUp}
{{#if showIosReviewDate}}*iOS 심사일:* {iosReviewDate}
{{/if}}{{#if showPaidProductDate}}*유료화 상품 협의:* {paidProductDate}
{{/if}}
---

{table}

{{#if disclaimer}}---
_{disclaimer}_
{{/if}}
<https://azrael-002.vercel.app|Azrael에서 자세히 보기>$body$,
  true,
  'SYSTEM'
FROM projects
WHERE NOT EXISTS (
  SELECT 1 FROM slack_message_templates
  WHERE slack_message_templates.project_id = projects.id
    AND slack_message_templates.name = '기본 템플릿'
);

-- ============================================================
-- Migration 009 완료
-- ============================================================
