-- Azrael Supabase Migration: Phase 2 Schedule Entries Extension
-- 작성일: 2026-01-30
-- 설명: schedule_entries에 description, assignee 컬럼 추가 (이메일 테이블 렌더링용)
-- 참조: Azrael-PRD-Phase2.md §6 (006b)
-- 의존: 002_calculation_results.sql (schedule_entries 테이블)

-- ============================================================
-- 1. SCHEDULE_ENTRIES 컬럼 추가
-- ============================================================

-- 이메일 테이블에 표시할 부가 정보 컬럼
-- WorkStage.description → schedule_entries.description (모든 테이블 공통 - "설명" 컬럼)
-- WorkStage.assignee → schedule_entries.assignee (T1 전용 - "담당자" 컬럼)
ALTER TABLE schedule_entries ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE schedule_entries ADD COLUMN IF NOT EXISTS assignee TEXT DEFAULT '';

-- ============================================================
-- 2. COMMENTS
-- ============================================================

COMMENT ON COLUMN schedule_entries.description IS 'Phase 2: 이메일 테이블 설명 컬럼 (WorkStage.description에서 복사)';
COMMENT ON COLUMN schedule_entries.assignee IS 'Phase 2: 이메일 테이블 담당자 컬럼 (WorkStage.assignee에서 복사, T1 전용)';

-- ============================================================
-- 3. 검증 쿼리
-- ============================================================

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'schedule_entries'
  AND column_name IN ('description', 'assignee')
ORDER BY column_name;
