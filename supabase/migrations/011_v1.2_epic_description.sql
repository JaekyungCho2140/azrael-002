-- 011_v1.2_epic_description.sql
-- v1.2: Epic Description 템플릿 + 표 자동 삽입 설정

ALTER TABLE projects ADD COLUMN IF NOT EXISTS jira_epic_description TEXT DEFAULT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS jira_epic_table_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS jira_epic_table_type TEXT DEFAULT 'table1';
