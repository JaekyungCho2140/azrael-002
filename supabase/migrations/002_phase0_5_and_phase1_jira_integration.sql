-- Phase 0.5 + Phase 1 통합 마이그레이션
-- JIRA 연동 기능을 위한 스키마 변경
-- 작성일: 2026-01-16

-- =========================================
-- Phase 0.5: Phase 1 전제조건
-- =========================================

-- 1. projects 테이블: JIRA 관련 컬럼 추가
ALTER TABLE projects
ADD COLUMN jira_project_key TEXT,       -- Phase 1: JIRA 프로젝트 키
ADD COLUMN jira_epic_template TEXT,     -- Phase 0.5: Epic Summary 템플릿
ADD COLUMN jira_headsup_template TEXT;  -- Phase 0.5: 헤즈업 Task Summary 템플릿

COMMENT ON COLUMN projects.jira_project_key
IS 'JIRA 프로젝트 키 (예: M4L10N, NCL10N)';

COMMENT ON COLUMN projects.jira_epic_template
IS 'JIRA Epic Summary 템플릿 (예: {date} 업데이트)';

COMMENT ON COLUMN projects.jira_headsup_template
IS 'JIRA 헤즈업 Task Summary 템플릿 (예: {date} 업데이트 일정 헤즈업)';

-- 2. work_stages 테이블: order 타입 변경 (INTEGER → DECIMAL 5,1)
-- Zero-downtime 마이그레이션 전략

-- 기존 인덱스 삭제
DROP INDEX IF EXISTS idx_work_stages_order;

-- 새 컬럼 생성
ALTER TABLE work_stages ADD COLUMN order_decimal DECIMAL(5,1);

-- 데이터 복사 (INTEGER → DECIMAL 변환)
UPDATE work_stages SET order_decimal = "order"::DECIMAL(5,1);

-- NOT NULL 제약 추가
ALTER TABLE work_stages ALTER COLUMN order_decimal SET NOT NULL;

-- 기존 컬럼 삭제
ALTER TABLE work_stages DROP COLUMN "order";

-- 컬럼명 변경
ALTER TABLE work_stages RENAME COLUMN order_decimal TO "order";

-- 인덱스 재생성
CREATE INDEX idx_work_stages_order ON work_stages("order");

-- 3. work_stages 테이블: JIRA Summary 템플릿 컬럼 추가
ALTER TABLE work_stages
ADD COLUMN jira_summary_template TEXT;

COMMENT ON COLUMN work_stages.jira_summary_template
IS 'JIRA Task/Subtask Summary 템플릿 (예: {date} 업데이트 {taskName})';

-- =========================================
-- Phase 1: JIRA 연동
-- =========================================

-- 4. jira_epic_mappings 테이블 생성
CREATE TABLE jira_epic_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  update_date DATE NOT NULL,
  epic_id TEXT NOT NULL,
  epic_key TEXT NOT NULL,
  epic_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL,
  UNIQUE(project_id, update_date),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT
);

ALTER TABLE jira_epic_mappings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_jira_epic_mappings_project_date
  ON jira_epic_mappings(project_id, update_date);

COMMENT ON TABLE jira_epic_mappings
IS 'JIRA Epic ID 추적 (프로젝트 + 업데이트일별)';

COMMENT ON COLUMN jira_epic_mappings.epic_id
IS 'JIRA Epic 내부 ID';

COMMENT ON COLUMN jira_epic_mappings.epic_key
IS 'JIRA Epic Key (예: L10N-45)';

-- 5. jira_task_mappings 테이블 생성
CREATE TABLE jira_task_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_mapping_id UUID NOT NULL,
  stage_id TEXT NOT NULL,
  is_headsup BOOLEAN NOT NULL DEFAULT FALSE,
  task_id TEXT NOT NULL,
  task_key TEXT NOT NULL,
  task_url TEXT,
  issue_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(epic_mapping_id, stage_id),
  FOREIGN KEY (epic_mapping_id) REFERENCES jira_epic_mappings(id) ON DELETE CASCADE,
  CONSTRAINT check_issue_type CHECK (issue_type IN ('Task', 'Sub-task')),
  CONSTRAINT check_headsup_consistency CHECK (
    (is_headsup = TRUE AND stage_id = 'HEADSUP') OR
    (is_headsup = FALSE AND stage_id != 'HEADSUP')
  )
);

ALTER TABLE jira_task_mappings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_jira_task_mappings_epic
  ON jira_task_mappings(epic_mapping_id);

CREATE INDEX idx_jira_task_mappings_stage
  ON jira_task_mappings(stage_id);

COMMENT ON TABLE jira_task_mappings
IS 'JIRA Task/Subtask stageId 매핑 (템플릿 변경 시에도 정확한 업데이트 매칭)';

COMMENT ON COLUMN jira_task_mappings.stage_id
IS 'WorkStage ID 또는 "HEADSUP" (헤즈업 Task 고정값)';

COMMENT ON COLUMN jira_task_mappings.is_headsup
IS '헤즈업 Task 플래그';

-- 6. updated_at 자동 갱신 트리거 함수 (존재하지 않으면 생성)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. jira_epic_mappings updated_at 트리거
CREATE TRIGGER update_jira_epic_mappings_updated_at
  BEFORE UPDATE ON jira_epic_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. jira_task_mappings updated_at 트리거
CREATE TRIGGER update_jira_task_mappings_updated_at
  BEFORE UPDATE ON jira_task_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- RLS 정책 (jira_epic_mappings)
-- =========================================

CREATE POLICY "Anyone can read jira_epic_mappings"
  ON jira_epic_mappings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Whitelisted users can insert jira_epic_mappings"
  ON jira_epic_mappings FOR INSERT
  WITH CHECK (auth.email() IN (
    'jkcho@wemade.com', 'mine@wemade.com',
    'srpark@wemade.com', 'garden0130@wemade.com',
    'hkkim@wemade.com'
  ));

CREATE POLICY "Whitelisted users can update jira_epic_mappings"
  ON jira_epic_mappings FOR UPDATE
  USING (auth.email() IN (
    'jkcho@wemade.com', 'mine@wemade.com',
    'srpark@wemade.com', 'garden0130@wemade.com',
    'hkkim@wemade.com'
  ));

CREATE POLICY "Whitelisted users can delete jira_epic_mappings"
  ON jira_epic_mappings FOR DELETE
  USING (auth.email() IN (
    'jkcho@wemade.com', 'mine@wemade.com',
    'srpark@wemade.com', 'garden0130@wemade.com',
    'hkkim@wemade.com'
  ));

-- =========================================
-- RLS 정책 (jira_task_mappings)
-- =========================================

CREATE POLICY "Anyone can read jira_task_mappings"
  ON jira_task_mappings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Whitelisted users can insert jira_task_mappings"
  ON jira_task_mappings FOR INSERT
  WITH CHECK (auth.email() IN (
    'jkcho@wemade.com', 'mine@wemade.com',
    'srpark@wemade.com', 'garden0130@wemade.com',
    'hkkim@wemade.com'
  ));

CREATE POLICY "Whitelisted users can update jira_task_mappings"
  ON jira_task_mappings FOR UPDATE
  USING (auth.email() IN (
    'jkcho@wemade.com', 'mine@wemade.com',
    'srpark@wemade.com', 'garden0130@wemade.com',
    'hkkim@wemade.com'
  ));

CREATE POLICY "Whitelisted users can delete jira_task_mappings"
  ON jira_task_mappings FOR DELETE
  USING (auth.email() IN (
    'jkcho@wemade.com', 'mine@wemade.com',
    'srpark@wemade.com', 'garden0130@wemade.com',
    'hkkim@wemade.com'
  ));
