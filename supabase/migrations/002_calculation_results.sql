-- Azrael Supabase Migration: Calculation Results
-- 작성일: 2026-01-20
-- 설명: 계산 결과 서버 저장 (팀 공유)

-- ============================================================
-- 1. CALCULATION_RESULTS 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS calculation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  update_date DATE NOT NULL,
  heads_up_date DATE NOT NULL,
  ios_review_date DATE,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calculated_by TEXT NOT NULL,  -- 계산한 사용자 이메일

  -- Foreign Key
  CONSTRAINT fk_project FOREIGN KEY (project_id)
    REFERENCES projects(id) ON DELETE CASCADE,

  -- 복합 유니크: 프로젝트 + 업데이트일
  CONSTRAINT unique_project_update_date UNIQUE (project_id, update_date)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_calculation_results_project ON calculation_results(project_id);
CREATE INDEX IF NOT EXISTS idx_calculation_results_update_date ON calculation_results(update_date);
CREATE INDEX IF NOT EXISTS idx_calculation_results_calculated_at ON calculation_results(calculated_at);

-- ============================================================
-- 2. SCHEDULE_ENTRIES 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_id UUID NOT NULL,
  table_type TEXT NOT NULL CHECK (table_type IN ('table1', 'table2', 'table3')),
  entry_index INTEGER NOT NULL,
  stage_id TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  parent_id UUID,  -- 하위 일감의 부모 entry ID

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign Keys
  CONSTRAINT fk_calculation FOREIGN KEY (calculation_id)
    REFERENCES calculation_results(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_entry FOREIGN KEY (parent_id)
    REFERENCES schedule_entries(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_schedule_entries_calculation ON schedule_entries(calculation_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_table_type ON schedule_entries(table_type);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_parent ON schedule_entries(parent_id);

-- ============================================================
-- 3. RLS (Row Level Security) 정책
-- ============================================================

-- RLS 활성화
ALTER TABLE calculation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;

-- 읽기: 모든 인증된 사용자
CREATE POLICY "Allow read for authenticated users"
ON calculation_results FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read for authenticated users"
ON schedule_entries FOR SELECT
TO authenticated
USING (true);

-- 쓰기: 모든 인증된 사용자 (계산 결과는 팀 공유이므로 누구나 덮어쓰기 가능)
CREATE POLICY "Allow insert/update/delete for authenticated users"
ON calculation_results FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow insert/update/delete for authenticated users"
ON schedule_entries FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================
-- 4. COMMENTS
-- ============================================================

COMMENT ON TABLE calculation_results IS '계산 결과 메타데이터 - 프로젝트 + 업데이트일별 팀 공유';
COMMENT ON TABLE schedule_entries IS '테이블 엔트리 데이터 - 각 테이블별 스케줄 항목';
COMMENT ON COLUMN calculation_results.calculated_by IS '마지막으로 계산한 사용자 이메일';
COMMENT ON COLUMN schedule_entries.parent_id IS '하위 일감의 부모 entry UUID';
