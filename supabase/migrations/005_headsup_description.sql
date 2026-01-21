-- Migration: 005_headsup_description
-- 헤즈업 Task JIRA 설명 필드 추가
-- 참조: ADF 테이블 마크업 지원

-- projects 테이블에 jira_headsup_description 컬럼 추가
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS jira_headsup_description TEXT DEFAULT NULL;

-- 컬럼 설명 추가
COMMENT ON COLUMN projects.jira_headsup_description IS 'JIRA 헤즈업 Task 설명 (ADF 테이블 마크업 지원)';
