/**
 * JIRA Mappings API (Supabase)
 * Phase 1: Epic/Task 매핑 관리
 * 참조: prd/Azrael-PRD-Phase1.md §7
 */

import { supabase, getCurrentUserEmail } from '../supabase';

/**
 * Epic 매핑 인터페이스
 */
export interface EpicMapping {
  id?: string;
  projectId: string;
  updateDate: Date;
  epicId: string;
  epicKey: string;
  epicUrl?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Task 매핑 인터페이스
 */
export interface TaskMapping {
  id?: string;
  epicMappingId: string;
  stageId: string;
  isHeadsup: boolean;
  taskId: string;
  taskKey: string;
  taskUrl?: string;
  issueType: 'Task' | 'Sub-task';
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Epic 매핑 조회 (프로젝트 + 업데이트일)
 */
export async function fetchEpicMapping(
  projectId: string,
  updateDate: Date
): Promise<EpicMapping | null> {
  const dateStr = updateDate.toISOString().split('T')[0]; // YYYY-MM-DD

  const { data, error } = await (supabase as any)
    .from('jira_epic_mappings')
    .select('*')
    .eq('project_id', projectId)
    .eq('update_date', dateStr)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch epic mapping:', error);
    throw new Error(`Epic 매핑 조회 실패: ${error.message}`);
  }

  if (!data) return null;

  return {
    id: data.id,
    projectId: data.project_id,
    updateDate: new Date(data.update_date),
    epicId: data.epic_id,
    epicKey: data.epic_key,
    epicUrl: data.epic_url || undefined,
    createdBy: data.created_by,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Epic 매핑 생성 (Supabase 선삽입, 동시 생성 방지)
 */
export async function createEpicMappingPending(
  projectId: string,
  updateDate: Date
): Promise<{ id: string }> {
  const userEmail = await getCurrentUserEmail();
  if (!userEmail) {
    throw new Error('로그인이 필요합니다.');
  }

  const dateStr = updateDate.toISOString().split('T')[0];

  const { data, error } = await (supabase as any)
    .from('jira_epic_mappings')
    .insert({
      project_id: projectId,
      update_date: dateStr,
      epic_id: 'PENDING',
      epic_key: 'PENDING',
      created_by: userEmail,
    })
    .select('id')
    .single();

  if (error) {
    // UNIQUE 제약 위반 시 다른 사용자가 생성 중
    if (error.code === '23505') {
      throw new Error('다른 사용자가 이미 JIRA 일감을 생성 중입니다. 잠시 후 다시 시도해주세요.');
    }
    console.error('Failed to create pending epic mapping:', error);
    throw new Error(`Epic 매핑 생성 실패: ${error.message}`);
  }

  return { id: data.id };
}

/**
 * Epic 매핑 업데이트 (Epic 생성 성공 후)
 */
export async function updateEpicMapping(
  id: string,
  epicId: string,
  epicKey: string,
  epicUrl?: string
): Promise<void> {
  const { error } = await (supabase as any)
    .from('jira_epic_mappings')
    .update({
      epic_id: epicId,
      epic_key: epicKey,
      epic_url: epicUrl,
    })
    .eq('id', id);

  if (error) {
    console.error('Failed to update epic mapping:', error);
    throw new Error(`Epic 매핑 업데이트 실패: ${error.message}`);
  }
}

/**
 * Epic 매핑 삭제 (롤백 시)
 */
export async function deleteEpicMapping(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('jira_epic_mappings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete epic mapping:', error);
    throw new Error(`Epic 매핑 삭제 실패: ${error.message}`);
  }
}

/**
 * Task 매핑 조회 (Epic ID로)
 */
export async function fetchTaskMappings(epicMappingId: string): Promise<TaskMapping[]> {
  const { data, error } = await (supabase as any)
    .from('jira_task_mappings')
    .select('*')
    .eq('epic_mapping_id', epicMappingId)
    .order('created_at');

  if (error) {
    console.error('Failed to fetch task mappings:', error);
    throw new Error(`Task 매핑 조회 실패: ${error.message}`);
  }

  return data.map((row: any) => ({
    id: row.id,
    epicMappingId: row.epic_mapping_id,
    stageId: row.stage_id,
    isHeadsup: row.is_headsup,
    taskId: row.task_id,
    taskKey: row.task_key,
    taskUrl: row.task_url || undefined,
    issueType: row.issue_type as 'Task' | 'Sub-task',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}

/**
 * Task 매핑 일괄 생성
 */
export async function createTaskMappings(mappings: Omit<TaskMapping, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
  const { error } = await (supabase as any)
    .from('jira_task_mappings')
    .insert(
      mappings.map((m) => ({
        epic_mapping_id: m.epicMappingId,
        stage_id: m.stageId,
        is_headsup: m.isHeadsup,
        task_id: m.taskId,
        task_key: m.taskKey,
        task_url: m.taskUrl || null,
        issue_type: m.issueType,
      }))
    );

  if (error) {
    console.error('Failed to create task mappings:', error);
    throw new Error(`Task 매핑 생성 실패: ${error.message}`);
  }
}

/**
 * Task 매핑 업데이트 (신규 Task 추가 시)
 */
export async function updateTaskMapping(
  epicMappingId: string,
  stageId: string,
  taskId: string,
  taskKey: string
): Promise<void> {
  const { error } = await (supabase as any)
    .from('jira_task_mappings')
    .upsert({
      epic_mapping_id: epicMappingId,
      stage_id: stageId,
      task_id: taskId,
      task_key: taskKey,
      is_headsup: stageId === 'HEADSUP',
      issue_type: 'Task', // 일단 Task로 (Subtask는 별도 처리)
    });

  if (error) {
    console.error('Failed to update task mapping:', error);
    throw new Error(`Task 매핑 업데이트 실패: ${error.message}`);
  }
}

/**
 * Exponential Backoff 재시도
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.log(`재시도 ${i + 1}/${maxRetries}, ${delay}ms 후 재시도...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('재시도 실패');
}

/**
 * JIRA 담당자 목록 조회
 * Phase 1.7: jira_assignees 테이블에서 활성화된 담당자 조회
 */
export async function fetchJiraAssignees() {
  const { data, error } = await (supabase as any)
    .from('jira_assignees')
    .select('*')
    .eq('is_active', true)
    .order('order_index');

  if (error) {
    console.error('Failed to fetch jira assignees:', error);
    throw new Error(`JIRA 담당자 조회 실패: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    jiraAccountId: row.jira_account_id,
    orderIndex: row.order_index,
    isActive: row.is_active,
  }));
}
