-- Fix: jira_epic_mappings FK를 ON DELETE CASCADE로 변경
-- 다른 테이블과 동일하게 프로젝트 삭제 시 관련 매핑도 자동 삭제
ALTER TABLE jira_epic_mappings
  DROP CONSTRAINT jira_epic_mappings_project_id_fkey,
  ADD CONSTRAINT jira_epic_mappings_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
