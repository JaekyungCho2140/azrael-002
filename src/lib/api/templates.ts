/**
 * WorkTemplates & WorkStages API (Supabase)
 * 참조: docs/Supabase-Migration-Plan.md
 */

import { supabase } from '../supabase';
import type { WorkTemplate, WorkStage } from '../../types';

/**
 * Supabase Row → TypeScript WorkStage 타입 매핑
 */
function mapToWorkStage(row: any): WorkStage {
  return {
    id: row.id,
    name: row.name,
    startOffsetDays: row.start_offset_days,
    endOffsetDays: row.end_offset_days,
    startTime: row.start_time,
    endTime: row.end_time,
    order: row.order,
    parentStageId: row.parent_stage_id || undefined,
    depth: row.depth,
    tableTargets: row.table_targets as ('table1' | 'table2' | 'table3')[],
  };
}

/**
 * Supabase Row → TypeScript WorkTemplate 타입 매핑
 */
function mapToWorkTemplate(row: any, stages: WorkStage[]): WorkTemplate {
  return {
    id: row.id,
    projectId: row.project_id,
    stages,
  };
}

/**
 * 모든 템플릿 조회 (stages 포함)
 */
export async function fetchTemplates(): Promise<WorkTemplate[]> {
  // 1. 템플릿 조회
  const { data: templates, error: templateError } = await supabase
    .from('work_templates')
    .select('*');

  if (templateError) {
    console.error('Failed to fetch templates:', templateError);
    throw new Error(`템플릿 조회 실패: ${templateError.message}`);
  }

  // 2. 모든 stages 조회
  const { data: stages, error: stageError } = await supabase
    .from('work_stages')
    .select('*')
    .order('order');

  if (stageError) {
    console.error('Failed to fetch stages:', stageError);
    throw new Error(`업무 단계 조회 실패: ${stageError.message}`);
  }

  // 3. 템플릿별로 stages 그룹화
  return templates.map((template) => {
    const templateStages = stages
      .filter((stage) => stage.template_id === template.id)
      .map(mapToWorkStage);

    return mapToWorkTemplate(template, templateStages);
  });
}

/**
 * 특정 프로젝트의 템플릿 조회
 */
export async function fetchTemplateByProjectId(
  projectId: string
): Promise<WorkTemplate | null> {
  // 1. 템플릿 조회
  const { data: template, error: templateError } = await supabase
    .from('work_templates')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (templateError) {
    if (templateError.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Failed to fetch template:', templateError);
    throw new Error(`템플릿 조회 실패: ${templateError.message}`);
  }

  // 2. stages 조회
  const { data: stages, error: stageError } = await supabase
    .from('work_stages')
    .select('*')
    .eq('template_id', template.id)
    .order('order');

  if (stageError) {
    console.error('Failed to fetch stages:', stageError);
    throw new Error(`업무 단계 조회 실패: ${stageError.message}`);
  }

  return mapToWorkTemplate(template, stages.map(mapToWorkStage));
}

/**
 * 템플릿 생성 (빈 stages)
 */
export async function createTemplate(template: Omit<WorkTemplate, 'stages'>): Promise<void> {
  const { error } = await supabase.from('work_templates').insert({
    id: template.id,
    project_id: template.projectId,
  });

  if (error) {
    console.error('Failed to create template:', error);
    throw new Error(`템플릿 생성 실패: ${error.message}`);
  }
}

/**
 * 템플릿 삭제 (CASCADE로 stages도 자동 삭제)
 */
export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('work_templates').delete().eq('id', id);

  if (error) {
    console.error('Failed to delete template:', error);
    throw new Error(`템플릿 삭제 실패: ${error.message}`);
  }
}

/**
 * WorkStage 생성
 */
export async function createStage(stage: WorkStage): Promise<void> {
  const { error } = await supabase.from('work_stages').insert({
    id: stage.id,
    template_id: stage.id.split('_stage_')[0], // template_id 추출 (예: "template_M4_GL")
    name: stage.name,
    start_offset_days: stage.startOffsetDays,
    end_offset_days: stage.endOffsetDays,
    start_time: stage.startTime,
    end_time: stage.endTime,
    order: stage.order,
    parent_stage_id: stage.parentStageId,
    depth: stage.depth,
    table_targets: stage.tableTargets,
  });

  if (error) {
    console.error('Failed to create stage:', error);
    throw new Error(`업무 단계 생성 실패: ${error.message}`);
  }
}

/**
 * WorkStage 수정
 */
export async function updateStage(id: string, updates: Partial<WorkStage>): Promise<void> {
  const { error } = await supabase
    .from('work_stages')
    .update({
      name: updates.name,
      start_offset_days: updates.startOffsetDays,
      end_offset_days: updates.endOffsetDays,
      start_time: updates.startTime,
      end_time: updates.endTime,
      order: updates.order,
      parent_stage_id: updates.parentStageId,
      depth: updates.depth,
      table_targets: updates.tableTargets,
    })
    .eq('id', id);

  if (error) {
    console.error('Failed to update stage:', error);
    throw new Error(`업무 단계 수정 실패: ${error.message}`);
  }
}

/**
 * WorkStage 삭제 (CASCADE로 하위 stages도 자동 삭제)
 */
export async function deleteStage(id: string): Promise<void> {
  const { error } = await supabase.from('work_stages').delete().eq('id', id);

  if (error) {
    console.error('Failed to delete stage:', error);
    throw new Error(`업무 단계 삭제 실패: ${error.message}`);
  }
}

/**
 * 템플릿 전체 저장 (stages 포함)
 * 기존 stages 모두 삭제 후 새로 생성
 */
export async function saveTemplate(template: WorkTemplate): Promise<void> {
  // 0. work_templates 레코드 생성 (없으면 생성, 있으면 무시)
  const { error: templateError } = await supabase
    .from('work_templates')
    .upsert(
      {
        id: template.id,
        project_id: template.projectId,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

  if (templateError) {
    console.error('Failed to upsert template:', templateError);
    throw new Error(`템플릿 생성 실패: ${templateError.message}`);
  }

  // 1. 기존 stages 삭제
  const { error: deleteError } = await supabase
    .from('work_stages')
    .delete()
    .eq('template_id', template.id);

  if (deleteError) {
    console.error('Failed to delete old stages:', deleteError);
    throw new Error(`기존 업무 단계 삭제 실패: ${deleteError.message}`);
  }

  // 2. 새 stages 삽입
  if (template.stages.length > 0) {
    const { error: insertError } = await supabase.from('work_stages').insert(
      template.stages.map((stage) => ({
        id: stage.id,
        template_id: template.id,
        name: stage.name,
        start_offset_days: stage.startOffsetDays,
        end_offset_days: stage.endOffsetDays,
        start_time: stage.startTime,
        end_time: stage.endTime,
        order: stage.order,
        parent_stage_id: stage.parentStageId,
        depth: stage.depth,
        table_targets: stage.tableTargets,
      }))
    );

    if (insertError) {
      console.error('Failed to insert new stages:', insertError);
      throw new Error(`새 업무 단계 삽입 실패: ${insertError.message}`);
    }
  }
}
