-- Azrael Supabase Migration: Work Stages Extension
-- 작성일: 2026-01-20
-- 설명: WorkStage 템플릿에 부가 정보 필드 추가

-- ============================================================
-- 1. WORK_STAGES 컬럼 추가
-- ============================================================

-- 모든 테이블 공통: 설명
ALTER TABLE work_stages
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- T1 전용: 담당자
ALTER TABLE work_stages
ADD COLUMN IF NOT EXISTS assignee TEXT DEFAULT '';

-- T2/T3 전용: JIRA 설명, JIRA 담당자
ALTER TABLE work_stages
ADD COLUMN IF NOT EXISTS jira_description TEXT DEFAULT '';

ALTER TABLE work_stages
ADD COLUMN IF NOT EXISTS jira_assignee_id TEXT DEFAULT NULL;

-- ============================================================
-- 2. COMMENTS
-- ============================================================

COMMENT ON COLUMN work_stages.description IS '모든 테이블 공통 - 설명 컬럼';
COMMENT ON COLUMN work_stages.assignee IS 'T1 전용 - 담당자 컬럼';
COMMENT ON COLUMN work_stages.jira_description IS 'T2/T3 전용 - JIRA 설명 컬럼';
COMMENT ON COLUMN work_stages.jira_assignee_id IS 'T2/T3 전용 - JIRA 담당자 Account ID (jira_assignees 테이블 참조)';
