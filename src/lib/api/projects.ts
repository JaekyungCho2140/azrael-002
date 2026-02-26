/**
 * Projects API (Supabase)
 * 참조: docs/Supabase-Migration-Plan.md
 */

import { supabase, getCurrentUserEmail } from '../supabase';
import type { Project } from '../../types';
import { fetchTemplateByProjectId, saveTemplate } from './templates';
import { fetchEmailTemplates, createEmailTemplate } from './emailTemplates';
import { fetchSlackTemplates, createSlackTemplate } from './slack';

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
    jiraEpicDescription: row.jira_epic_description || undefined,
    jiraEpicTableEnabled: row.jira_epic_table_enabled ?? false,
    jiraEpicTableType: row.jira_epic_table_type || 'table1',
    jiraTaskIssueType: row.jira_task_issue_type || undefined,
    slackChannelId: row.slack_channel_id || undefined,
    slackChannelName: row.slack_channel_name || undefined,
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
      jira_epic_description: project.jiraEpicDescription || null,
      jira_epic_table_enabled: project.jiraEpicTableEnabled ?? false,
      jira_epic_table_type: project.jiraEpicTableType || 'table1',
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
      jira_epic_description: updates.jiraEpicDescription !== undefined ? updates.jiraEpicDescription : undefined,
      jira_epic_table_enabled: updates.jiraEpicTableEnabled !== undefined ? updates.jiraEpicTableEnabled : undefined,
      jira_epic_table_type: updates.jiraEpicTableType !== undefined ? updates.jiraEpicTableType : undefined,
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

/**
 * 프로젝트 복제
 * 프로젝트 설정 + WorkStages + 이메일 템플릿 + Slack 템플릿을 복사한다.
 * 프리셋/계산결과는 제외.
 */
export async function duplicateProject(sourceProjectId: string): Promise<Project> {
  const userEmail = await getCurrentUserEmail();
  if (!userEmail) {
    throw new Error('로그인이 필요합니다.');
  }

  // 1. 소스 프로젝트 조회
  const { data: sourceRow, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', sourceProjectId)
    .single();

  if (fetchError || !sourceRow) {
    throw new Error(`원본 프로젝트 조회 실패: ${fetchError?.message}`);
  }

  // 2. 새 프로젝트 생성
  const timestamp = Date.now();
  const newId = `${sourceProjectId}_COPY_${timestamp}`;
  const newTemplateId = `template_${newId}`;
  const newName = `${sourceRow.name} (복사본)`;

  const { data: newProjectRow, error: createError } = await supabase
    .from('projects')
    .insert({
      id: newId,
      name: newName,
      heads_up_offset: sourceRow.heads_up_offset,
      ios_review_offset: sourceRow.ios_review_offset,
      show_ios_review_date: sourceRow.show_ios_review_date,
      paid_product_offset: sourceRow.paid_product_offset,
      show_paid_product_date: sourceRow.show_paid_product_date,
      template_id: newTemplateId,
      disclaimer: sourceRow.disclaimer,
      jira_project_key: sourceRow.jira_project_key,
      jira_epic_template: sourceRow.jira_epic_template,
      jira_headsup_template: sourceRow.jira_headsup_template,
      jira_headsup_description: sourceRow.jira_headsup_description,
      jira_epic_description: sourceRow.jira_epic_description,
      jira_epic_table_enabled: sourceRow.jira_epic_table_enabled,
      jira_epic_table_type: sourceRow.jira_epic_table_type,
      jira_task_issue_type: sourceRow.jira_task_issue_type,
      slack_channel_id: sourceRow.slack_channel_id,
      slack_channel_name: sourceRow.slack_channel_name,
      created_by: userEmail,
    })
    .select()
    .single();

  if (createError || !newProjectRow) {
    throw new Error(`프로젝트 복제 실패: ${createError?.message}`);
  }

  // 3. WorkStages 복사 (템플릿 + stages)
  const sourceTemplate = await fetchTemplateByProjectId(sourceProjectId);
  if (sourceTemplate && sourceTemplate.stages.length > 0) {
    // stage ID 매핑 (parentStageId 참조 유지를 위해)
    const stageIdMap = new Map<string, string>();
    const newStages = sourceTemplate.stages.map((stage) => {
      const newStageId = `${newTemplateId}_stage_${stage.order}`;
      stageIdMap.set(stage.id, newStageId);
      return { ...stage, id: newStageId };
    });

    // parentStageId 재매핑
    const remappedStages = newStages.map((stage) => ({
      ...stage,
      parentStageId: stage.parentStageId
        ? stageIdMap.get(stage.parentStageId) || stage.parentStageId
        : undefined,
    }));

    await saveTemplate({
      id: newTemplateId,
      projectId: newId,
      stages: remappedStages,
    });
  } else {
    // stages가 없더라도 빈 템플릿 레코드 생성
    await saveTemplate({
      id: newTemplateId,
      projectId: newId,
      stages: [],
    });
  }

  // 4. 이메일 템플릿 복사 (사용자 정의만 — DB 트리거가 built-in 자동 생성)
  const emailTemplates = await fetchEmailTemplates(sourceProjectId);
  for (const et of emailTemplates) {
    if (et.isBuiltIn) continue;
    await createEmailTemplate(newId, {
      name: et.name,
      subjectTemplate: et.subjectTemplate,
      bodyTemplate: et.bodyTemplate,
    });
  }

  // 5. Slack 메시지 템플릿 복사 (사용자 정의만 — DB 트리거가 built-in 자동 생성)
  const slackTemplates = await fetchSlackTemplates(sourceProjectId);
  for (const st of slackTemplates) {
    if (st.isBuiltIn) continue;
    await createSlackTemplate({
      projectId: newId,
      name: st.name,
      bodyTemplate: st.bodyTemplate,
    });
  }

  return mapToProject(newProjectRow);
}
