/**
 * Email Templates API (Supabase)
 * 프로젝트별 이메일 템플릿 CRUD
 *
 * ⚠️ Supabase Row(snake_case) → 프론트엔드(camelCase) 변환은
 *    기존 프로젝트 패턴(src/lib/api/projects.ts)과 동일하게 적용.
 *
 * 참조: prd/Azrael-PRD-Phase2.md §4.4
 */

import { supabase, getCurrentUserEmail } from '../supabase';
import type { EmailTemplate } from '../../types';

// ============================================================
// 매핑
// ============================================================

/**
 * Supabase Row → TypeScript EmailTemplate 타입 매핑
 */
function mapToEmailTemplate(row: any): EmailTemplate {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    subjectTemplate: row.subject_template,
    bodyTemplate: row.body_template,
    isBuiltIn: row.is_built_in,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
  };
}

// ============================================================
// 조회
// ============================================================

/**
 * 프로젝트별 템플릿 목록 조회
 *
 * 정렬 순서 (PRD §4.4, v2.7):
 *   1차: is_built_in DESC (built-in 먼저)
 *   2차: created_at DESC (최신 먼저)
 *   3차: name ASC (v2.8: 동일 조건일 때 이름순)
 */
export async function fetchEmailTemplates(
  projectId: string,
): Promise<EmailTemplate[]> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('project_id', projectId)
    .order('is_built_in', { ascending: false })
    .order('created_at', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    console.error('Failed to fetch email templates:', error);
    throw new Error(`이메일 템플릿 조회 실패: ${error.message}`);
  }

  return data.map(mapToEmailTemplate);
}

/**
 * 템플릿 단건 조회
 */
export async function fetchEmailTemplate(
  templateId: string,
): Promise<EmailTemplate> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('Failed to fetch email template:', error);
    throw new Error(`이메일 템플릿 조회 실패: ${error.message}`);
  }

  return mapToEmailTemplate(data);
}

// ============================================================
// 생성
// ============================================================

/**
 * 템플릿 생성 (프로젝트 귀속)
 *
 * ⚠️ is_built_in은 DB seed 트리거 전용. 프론트엔드에서 true 설정 금지.
 */
export async function createEmailTemplate(
  projectId: string,
  data: { name: string; subjectTemplate: string; bodyTemplate: string },
): Promise<EmailTemplate> {
  const userEmail = await getCurrentUserEmail();

  const { data: created, error } = await supabase
    .from('email_templates')
    .insert({
      project_id: projectId,
      name: data.name,
      subject_template: data.subjectTemplate,
      body_template: data.bodyTemplate,
      created_by: userEmail,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create email template:', error);
    throw new Error(`이메일 템플릿 생성 실패: ${error.message}`);
  }

  return mapToEmailTemplate(created);
}

// ============================================================
// 수정
// ============================================================

/**
 * 템플릿 수정
 */
export async function updateEmailTemplate(
  templateId: string,
  data: { name?: string; subjectTemplate?: string; bodyTemplate?: string },
): Promise<EmailTemplate> {
  const updatePayload: Record<string, string | undefined> = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.subjectTemplate !== undefined)
    updatePayload.subject_template = data.subjectTemplate;
  if (data.bodyTemplate !== undefined)
    updatePayload.body_template = data.bodyTemplate;

  const { data: updated, error } = await supabase
    .from('email_templates')
    .update(updatePayload)
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update email template:', error);
    throw new Error(`이메일 템플릿 수정 실패: ${error.message}`);
  }

  return mapToEmailTemplate(updated);
}

// ============================================================
// 삭제
// ============================================================

/**
 * 템플릿 삭제 (사용자 정의만 가능)
 * RLS에서 is_built_in=false 조건을 강제함.
 */
export async function deleteEmailTemplate(
  templateId: string,
): Promise<void> {
  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    console.error('Failed to delete email template:', error);
    throw new Error(`이메일 템플릿 삭제 실패: ${error.message}`);
  }
}
