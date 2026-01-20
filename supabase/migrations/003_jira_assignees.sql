-- Azrael Supabase Migration: JIRA Assignees
-- 작성일: 2026-01-20
-- 설명: JIRA 담당자 매핑 테이블 (5명 L10n팀)

-- ============================================================
-- 1. JIRA_ASSIGNEES 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS jira_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,  -- 한글 이름
  jira_account_id TEXT NOT NULL UNIQUE,  -- JIRA Account ID
  order_index INTEGER NOT NULL,  -- 드롭다운 표시 순서
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_jira_assignees_active ON jira_assignees(is_active);
CREATE INDEX IF NOT EXISTS idx_jira_assignees_order ON jira_assignees(order_index);

-- ============================================================
-- 2. 초기 데이터 (L10n팀 5명)
-- ============================================================

INSERT INTO jira_assignees (name, jira_account_id, order_index) VALUES
('조재경', '617f7523f485cd0068077192', 1),
('김민혜', '62b57632f38b4dcf73daedb2', 2),
('임정원', '712020:1a1a9943-9787-44e1-b2da-d4f558df471e', 3),
('박선률', '6209c939bba9ca0070c94b16', 4),
('김홍균', '0b7fa452-0cf3-494f-9a37-2f0ef3e9c934', 5)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 3. AUTO UPDATE TRIGGER (updated_at)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_jira_assignees_updated_at
  BEFORE UPDATE ON jira_assignees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. RLS (Row Level Security) 정책
-- ============================================================

ALTER TABLE jira_assignees ENABLE ROW LEVEL SECURITY;

-- 읽기: 모든 인증된 사용자
CREATE POLICY "Allow read for authenticated users"
ON jira_assignees FOR SELECT
TO authenticated
USING (true);

-- 쓰기: 화이트리스트만 (기존 패턴 재사용)
CREATE POLICY "Allow write for whitelist users"
ON jira_assignees FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com'
  )
)
WITH CHECK (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com'
  )
);

-- ============================================================
-- 5. COMMENTS
-- ============================================================

COMMENT ON TABLE jira_assignees IS 'JIRA 담당자 매핑 테이블 (L10n팀 5명)';
COMMENT ON COLUMN jira_assignees.name IS '한글 이름 (드롭다운 표시용)';
COMMENT ON COLUMN jira_assignees.jira_account_id IS 'JIRA Account ID (API 호출용)';
COMMENT ON COLUMN jira_assignees.order_index IS '드롭다운 정렬 순서';
