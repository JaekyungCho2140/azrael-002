-- ============================================================
-- Migration 008: 화이트리스트에 uzilay@gmail.com 추가
-- 모든 테이블의 쓰기 권한 RLS 정책을 재생성합니다.
-- ============================================================

-- ============================================================
-- 1. projects 테이블
-- ============================================================
DROP POLICY IF EXISTS "Whitelisted users can insert projects" ON projects;
DROP POLICY IF EXISTS "Whitelisted users can update projects" ON projects;
DROP POLICY IF EXISTS "Whitelisted users can delete projects" ON projects;

CREATE POLICY "Whitelisted users can insert projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

CREATE POLICY "Whitelisted users can update projects"
ON projects FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

CREATE POLICY "Whitelisted users can delete projects"
ON projects FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

-- ============================================================
-- 2. work_templates 테이블
-- ============================================================
DROP POLICY IF EXISTS "Whitelisted users can insert templates" ON work_templates;
DROP POLICY IF EXISTS "Whitelisted users can update templates" ON work_templates;
DROP POLICY IF EXISTS "Whitelisted users can delete templates" ON work_templates;

CREATE POLICY "Whitelisted users can insert templates"
ON work_templates FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

CREATE POLICY "Whitelisted users can update templates"
ON work_templates FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

CREATE POLICY "Whitelisted users can delete templates"
ON work_templates FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

-- ============================================================
-- 3. work_stages 테이블
-- ============================================================
DROP POLICY IF EXISTS "Whitelisted users can insert stages" ON work_stages;
DROP POLICY IF EXISTS "Whitelisted users can update stages" ON work_stages;
DROP POLICY IF EXISTS "Whitelisted users can delete stages" ON work_stages;

CREATE POLICY "Whitelisted users can insert stages"
ON work_stages FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

CREATE POLICY "Whitelisted users can update stages"
ON work_stages FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

CREATE POLICY "Whitelisted users can delete stages"
ON work_stages FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

-- ============================================================
-- 4. holidays 테이블
-- ============================================================
DROP POLICY IF EXISTS "Whitelisted users can insert holidays" ON holidays;
DROP POLICY IF EXISTS "Whitelisted users can update holidays" ON holidays;
DROP POLICY IF EXISTS "Whitelisted users can delete holidays" ON holidays;

CREATE POLICY "Whitelisted users can insert holidays"
ON holidays FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

CREATE POLICY "Whitelisted users can update holidays"
ON holidays FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

CREATE POLICY "Whitelisted users can delete holidays"
ON holidays FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

-- ============================================================
-- 5. jira_epic_mappings 테이블
-- ============================================================
DROP POLICY IF EXISTS "Whitelisted users can insert jira_epic_mappings" ON jira_epic_mappings;
DROP POLICY IF EXISTS "Whitelisted users can update jira_epic_mappings" ON jira_epic_mappings;
DROP POLICY IF EXISTS "Whitelisted users can delete jira_epic_mappings" ON jira_epic_mappings;

CREATE POLICY "Whitelisted users can insert jira_epic_mappings"
ON jira_epic_mappings FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

CREATE POLICY "Whitelisted users can update jira_epic_mappings"
ON jira_epic_mappings FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

CREATE POLICY "Whitelisted users can delete jira_epic_mappings"
ON jira_epic_mappings FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

-- ============================================================
-- 6. jira_task_mappings 테이블
-- ============================================================
DROP POLICY IF EXISTS "Whitelisted users can insert jira_task_mappings" ON jira_task_mappings;
DROP POLICY IF EXISTS "Whitelisted users can update jira_task_mappings" ON jira_task_mappings;
DROP POLICY IF EXISTS "Whitelisted users can delete jira_task_mappings" ON jira_task_mappings;

CREATE POLICY "Whitelisted users can insert jira_task_mappings"
ON jira_task_mappings FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

CREATE POLICY "Whitelisted users can update jira_task_mappings"
ON jira_task_mappings FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

CREATE POLICY "Whitelisted users can delete jira_task_mappings"
ON jira_task_mappings FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

-- ============================================================
-- 7. jira_assignees 테이블
-- ============================================================
DROP POLICY IF EXISTS "Allow write for whitelist users" ON jira_assignees;

CREATE POLICY "Allow write for whitelist users"
ON jira_assignees FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
)
WITH CHECK (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

-- ============================================================
-- 8. email_templates 테이블
-- ============================================================
DROP POLICY IF EXISTS "Whitelisted users can insert email_templates" ON email_templates;
DROP POLICY IF EXISTS "Whitelisted users can update email_templates" ON email_templates;
DROP POLICY IF EXISTS "Whitelisted users can delete custom email_templates" ON email_templates;

CREATE POLICY "Whitelisted users can insert email_templates"
ON email_templates FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

CREATE POLICY "Whitelisted users can update email_templates"
ON email_templates FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
);

CREATE POLICY "Whitelisted users can delete custom email_templates"
ON email_templates FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'jkcho@wemade.com',
    'mine@wemade.com',
    'srpark@wemade.com',
    'garden0130@wemade.com',
    'hkkim@wemade.com',
    'uzilay@gmail.com'
  )
  AND is_built_in = false
);
