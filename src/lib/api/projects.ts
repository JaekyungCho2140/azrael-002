/**
 * Projects API (Supabase)
 * 참조: docs/Supabase-Migration-Plan.md
 */

import { supabase, getCurrentUserEmail } from '../supabase';
import type { Project } from '../../types';

/**
 * Supabase Row → TypeScript Project 타입 매핑
 */
function mapToProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    headsUpOffset: row.heads_up_offset,
    iosReviewOffset: row.ios_review_offset || undefined,
    showIosReviewDate: row.show_ios_review_date,
    paidProductOffset: row.paid_product_offset || undefined,
    showPaidProductDate: row.show_paid_product_date ?? false,
    templateId: row.template_id,
    disclaimer: row.disclaimer || '',
    jiraProjectKey: row.jira_project_key || undefined,
    jiraEpicTemplate: row.jira_epic_template || undefined,
    jiraHeadsupTemplate: row.jira_headsup_template || undefined,
    jiraHeadsupDescription: row.jira_headsup_description || undefined,
    jiraTaskIssueType: row.jira_task_issue_type || undefined,
  };
}

/**
 * 모든 프로젝트 조회
 */
export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('name');

  if (error) {
    console.error('Failed to fetch projects:', error);
    throw new Error(`프로젝트 조회 실패: ${error.message}`);
  }

  return data.map(mapToProject);
}

/**
 * 프로젝트 생성
 */
export async function createProject(project: Omit<Project, 'id'>): Promise<Project> {
  const userEmail = await getCurrentUserEmail();
  if (!userEmail) {
    throw new Error('로그인이 필요합니다.');
  }

  // 고유 ID 생성 (name 기반)
  const id = project.name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();

  const { data, error } = await supabase
    .from('projects')
    .insert({
      id,
      name: project.name,
      heads_up_offset: project.headsUpOffset,
      ios_review_offset: project.iosReviewOffset,
      show_ios_review_date: project.showIosReviewDate,
      paid_product_offset: project.paidProductOffset || null,
      show_paid_product_date: project.showPaidProductDate,
      template_id: project.templateId,
      disclaimer: project.disclaimer,
      jira_project_key: project.jiraProjectKey || null,
      jira_epic_template: project.jiraEpicTemplate || null,
      jira_headsup_template: project.jiraHeadsupTemplate || null,
      jira_headsup_description: project.jiraHeadsupDescription || null,
      jira_task_issue_type: project.jiraTaskIssueType || null,
      created_by: userEmail,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create project:', error);
    throw new Error(`프로젝트 생성 실패: ${error.message}`);
  }

  return mapToProject(data);
}

/**
 * 프로젝트 수정
 */
export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, 'id'>>
): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({
      name: updates.name,
      heads_up_offset: updates.headsUpOffset,
      ios_review_offset: updates.iosReviewOffset,
      show_ios_review_date: updates.showIosReviewDate,
      paid_product_offset: updates.paidProductOffset,
      show_paid_product_date: updates.showPaidProductDate,
      template_id: updates.templateId,
      disclaimer: updates.disclaimer,
      jira_project_key: updates.jiraProjectKey !== undefined ? updates.jiraProjectKey : undefined,
      jira_epic_template: updates.jiraEpicTemplate !== undefined ? updates.jiraEpicTemplate : undefined,
      jira_headsup_template: updates.jiraHeadsupTemplate !== undefined ? updates.jiraHeadsupTemplate : undefined,
      jira_headsup_description: updates.jiraHeadsupDescription !== undefined ? updates.jiraHeadsupDescription : undefined,
      jira_task_issue_type: updates.jiraTaskIssueType !== undefined ? updates.jiraTaskIssueType : undefined,
    })
    .eq('id', id);

  if (error) {
    console.error('Failed to update project:', error);
    throw new Error(`프로젝트 수정 실패: ${error.message}`);
  }
}

/**
 * 프로젝트 삭제
 * CASCADE로 인해 연결된 work_templates, work_stages도 자동 삭제
 */
export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);

  if (error) {
    console.error('Failed to delete project:', error);
    throw new Error(`프로젝트 삭제 실패: ${error.message}`);
  }
}
