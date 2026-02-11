-- Phase 4: 프리셋 슬롯 테이블
-- 참조: Azrael-PRD-Phase4.md §8

-- 프리셋 슬롯 테이블
CREATE TABLE IF NOT EXISTS preset_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL CHECK (slot_index >= 0 AND slot_index < 4),
  name TEXT NOT NULL CHECK (char_length(name) <= 20 AND char_length(name) >= 1),
  calculation_id UUID NOT NULL REFERENCES calculation_results(id) ON DELETE CASCADE,
  visible_table TEXT NOT NULL CHECK (visible_table IN ('table1', 'table2', 'table3')) DEFAULT 'table1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT NOT NULL,
  UNIQUE(project_id, slot_index, created_by),      -- 슬롯 중복 방지
  UNIQUE(project_id, calculation_id, created_by)   -- 날짜 중복 저장 방지
);

-- RLS 정책
ALTER TABLE preset_slots ENABLE ROW LEVEL SECURITY;

-- 기존 정책 제거 (멱등성)
DROP POLICY IF EXISTS "Users can read own preset_slots" ON preset_slots;
DROP POLICY IF EXISTS "Users can manage own preset_slots" ON preset_slots;
DROP POLICY IF EXISTS "Users can insert own preset_slots" ON preset_slots;
DROP POLICY IF EXISTS "Users can update own preset_slots" ON preset_slots;
DROP POLICY IF EXISTS "Users can delete own preset_slots" ON preset_slots;

-- SELECT: 화이트리스트 + 본인 프리셋만
CREATE POLICY "Users can read own preset_slots"
  ON preset_slots FOR SELECT
  USING (
    auth.jwt() ->> 'email' IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com',
      'uzilay@gmail.com'
    )
    AND auth.uid()::text = created_by
  );

-- INSERT: 화이트리스트 + 본인만
CREATE POLICY "Users can insert own preset_slots"
  ON preset_slots FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com',
      'uzilay@gmail.com'
    )
    AND auth.uid()::text = created_by
  );

-- UPDATE: 화이트리스트 + 본인만
CREATE POLICY "Users can update own preset_slots"
  ON preset_slots FOR UPDATE
  USING (
    auth.jwt() ->> 'email' IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com',
      'uzilay@gmail.com'
    )
    AND auth.uid()::text = created_by
  );

-- DELETE: 화이트리스트 + 본인만
CREATE POLICY "Users can delete own preset_slots"
  ON preset_slots FOR DELETE
  USING (
    auth.jwt() ->> 'email' IN (
      'jkcho@wemade.com',
      'mine@wemade.com',
      'srpark@wemade.com',
      'garden0130@wemade.com',
      'hkkim@wemade.com',
      'uzilay@gmail.com'
    )
    AND auth.uid()::text = created_by
  );

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_preset_slots_updated_at
  BEFORE UPDATE ON preset_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 인덱스
CREATE INDEX idx_preset_slots_project_user
  ON preset_slots(project_id, created_by);

-- 코멘트
COMMENT ON TABLE preset_slots IS 'Phase 4: 프로젝트별 + 사용자별 프리셋 슬롯 (4분할 화면)';
COMMENT ON COLUMN preset_slots.visible_table IS '슬롯에 표시할 테이블 (table1/table2/table3)';
COMMENT ON CONSTRAINT preset_slots_project_id_calculation_id_created_by_key
  ON preset_slots IS '동일 프로젝트+날짜 중복 저장 방지';
