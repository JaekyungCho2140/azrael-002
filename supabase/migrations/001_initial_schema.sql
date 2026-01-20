-- Azrael Supabase Migration: Initial Schema
-- 작성일: 2026-01-13
-- 설명: Projects, WorkTemplates, WorkStages, Holidays 테이블 생성 및 RLS 정책

-- ============================================================
-- 1. PROJECTS 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  heads_up_offset INTEGER NOT NULL,
  ios_review_offset INTEGER,
  show_ios_review_date BOOLEAN NOT NULL DEFAULT false,
  template_id TEXT NOT NULL,
  disclaimer TEXT DEFAULT '',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL
);

-- Projects 인덱스
CREATE INDEX IF NOT EXISTS idx_projects_template_id ON projects(template_id);

-- ============================================================
-- 2. WORK_TEMPLATES 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS work_templates (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_project FOREIGN KEY (project_id)
    REFERENCES projects(id) ON DELETE CASCADE
);

-- ============================================================
-- 3. WORK_STAGES 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS work_stages (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_offset_days INTEGER NOT NULL,
  end_offset_days INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  parent_stage_id TEXT,
  depth INTEGER NOT NULL DEFAULT 0,
  table_targets TEXT[] NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_template FOREIGN KEY (template_id)
    REFERENCES work_templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_stage FOREIGN KEY (parent_stage_id)
    REFERENCES work_stages(id) ON DELETE CASCADE,
  CONSTRAINT check_depth CHECK (depth IN (0, 1))
);

-- WorkStages 인덱스
CREATE INDEX IF NOT EXISTS idx_work_stages_template_id ON work_stages(template_id);
CREATE INDEX IF NOT EXISTS idx_work_stages_parent_id ON work_stages(parent_stage_id);
CREATE INDEX IF NOT EXISTS idx_work_stages_order ON work_stages("order");

-- ============================================================
-- 4. HOLIDAYS 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_manual BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- Holidays 인덱스
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

-- ============================================================
-- 5. TRIGGERS (updated_at 자동 갱신)
-- ============================================================

-- 트리거 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Projects 트리거
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- WorkTemplates 트리거
DROP TRIGGER IF EXISTS update_work_templates_updated_at ON work_templates;
CREATE TRIGGER update_work_templates_updated_at
  BEFORE UPDATE ON work_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. RLS (Row Level Security) 정책
-- ============================================================

-- RLS 활성화
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6.1. PROJECTS RLS 정책
-- ============================================================

-- 읽기: 모든 인증된 사용자
DROP POLICY IF EXISTS "Anyone can read projects" ON projects;
CREATE POLICY "Anyone can read projects"
  ON projects FOR SELECT
  USING (auth.role() = 'authenticated');

-- 쓰기: 화이트리스트 사용자만
DROP POLICY IF EXISTS "Whitelisted users can insert projects" ON projects;
CREATE POLICY "Whitelisted users can insert projects"
  ON projects FOR INSERT
  WITH CHECK (
    auth.email() IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com'
    )
  );

DROP POLICY IF EXISTS "Whitelisted users can update projects" ON projects;
CREATE POLICY "Whitelisted users can update projects"
  ON projects FOR UPDATE
  USING (
    auth.email() IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com'
    )
  );

DROP POLICY IF EXISTS "Whitelisted users can delete projects" ON projects;
CREATE POLICY "Whitelisted users can delete projects"
  ON projects FOR DELETE
  USING (
    auth.email() IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com'
    )
  );

-- ============================================================
-- 6.2. WORK_TEMPLATES RLS 정책
-- ============================================================

-- 읽기: 모든 인증된 사용자
DROP POLICY IF EXISTS "Anyone can read templates" ON work_templates;
CREATE POLICY "Anyone can read templates"
  ON work_templates FOR SELECT
  USING (auth.role() = 'authenticated');

-- 쓰기: 화이트리스트 사용자만
DROP POLICY IF EXISTS "Whitelisted users can insert templates" ON work_templates;
CREATE POLICY "Whitelisted users can insert templates"
  ON work_templates FOR INSERT
  WITH CHECK (
    auth.email() IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com'
    )
  );

DROP POLICY IF EXISTS "Whitelisted users can update templates" ON work_templates;
CREATE POLICY "Whitelisted users can update templates"
  ON work_templates FOR UPDATE
  USING (
    auth.email() IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com'
    )
  );

DROP POLICY IF EXISTS "Whitelisted users can delete templates" ON work_templates;
CREATE POLICY "Whitelisted users can delete templates"
  ON work_templates FOR DELETE
  USING (
    auth.email() IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com'
    )
  );

-- ============================================================
-- 6.3. WORK_STAGES RLS 정책
-- ============================================================

-- 읽기: 모든 인증된 사용자
DROP POLICY IF EXISTS "Anyone can read stages" ON work_stages;
CREATE POLICY "Anyone can read stages"
  ON work_stages FOR SELECT
  USING (auth.role() = 'authenticated');

-- 쓰기: 화이트리스트 사용자만
DROP POLICY IF EXISTS "Whitelisted users can insert stages" ON work_stages;
CREATE POLICY "Whitelisted users can insert stages"
  ON work_stages FOR INSERT
  WITH CHECK (
    auth.email() IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com'
    )
  );

DROP POLICY IF EXISTS "Whitelisted users can update stages" ON work_stages;
CREATE POLICY "Whitelisted users can update stages"
  ON work_stages FOR UPDATE
  USING (
    auth.email() IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com'
    )
  );

DROP POLICY IF EXISTS "Whitelisted users can delete stages" ON work_stages;
CREATE POLICY "Whitelisted users can delete stages"
  ON work_stages FOR DELETE
  USING (
    auth.email() IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com'
    )
  );

-- ============================================================
-- 6.4. HOLIDAYS RLS 정책
-- ============================================================

-- 읽기: 모든 인증된 사용자
DROP POLICY IF EXISTS "Anyone can read holidays" ON holidays;
CREATE POLICY "Anyone can read holidays"
  ON holidays FOR SELECT
  USING (auth.role() = 'authenticated');

-- 쓰기: 화이트리스트 사용자만
DROP POLICY IF EXISTS "Whitelisted users can insert holidays" ON holidays;
CREATE POLICY "Whitelisted users can insert holidays"
  ON holidays FOR INSERT
  WITH CHECK (
    auth.email() IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com'
    )
  );

DROP POLICY IF EXISTS "Whitelisted users can update holidays" ON holidays;
CREATE POLICY "Whitelisted users can update holidays"
  ON holidays FOR UPDATE
  USING (
    auth.email() IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com'
    )
  );

DROP POLICY IF EXISTS "Whitelisted users can delete holidays" ON holidays;
CREATE POLICY "Whitelisted users can delete holidays"
  ON holidays FOR DELETE
  USING (
    auth.email() IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com'
    )
  );

-- ============================================================
-- 마이그레이션 완료
-- ============================================================

-- 확인 쿼리
SELECT
  'Projects' as table_name,
  COUNT(*) as row_count
FROM projects
UNION ALL
SELECT
  'WorkTemplates' as table_name,
  COUNT(*) as row_count
FROM work_templates
UNION ALL
SELECT
  'WorkStages' as table_name,
  COUNT(*) as row_count
FROM work_stages
UNION ALL
SELECT
  'Holidays' as table_name,
  COUNT(*) as row_count
FROM holidays;
