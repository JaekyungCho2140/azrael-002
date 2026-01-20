/**
 * JIRA Create Edge Function
 * JIRA Epic/Task/Subtask 자동 생성
 * 참조: prd/Azrael-PRD-Phase1.md §8.1
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface CreateJiraRequest {
  projectKey: string;
  epic: {
    summary: string;
    startDate: string;
    endDate: string;
  };
  tasks: {
    stageId: string;
    type: 'Task' | 'Sub-task';
    issueTypeName: string;  // 실제 JIRA 이슈 타입 이름 (예: "PM(표준)", "업무")
    summary: string;
    description?: string;
    startDate: string;
    endDate: string;
    assignee?: string;
    parentStageId?: string;
  }[];
  jiraAuth: {
    email: string;
    apiToken: string;
  };
}

interface CreateJiraResponse {
  success: boolean;
  createdIssues: {
    id: string;
    key: string;
    type: string;
    stageId: string;
  }[];
  error?: string;
}

const JIRA_URL = Deno.env.get('JIRA_URL') || 'https://wemade.atlassian.net';
const CUSTOM_FIELD_START = Deno.env.get('JIRA_CUSTOM_FIELD_START') || 'customfield_10569';
const CUSTOM_FIELD_END = Deno.env.get('JIRA_CUSTOM_FIELD_END') || 'customfield_10570';

serve(async (req) => {
  // CORS 헤더
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { projectKey, epic, tasks, jiraAuth }: CreateJiraRequest = await req.json();

    console.log('=== JIRA 생성 요청 수신 ===');
    console.log('프로젝트 키:', projectKey);
    console.log('Epic:', epic.summary);
    console.log('전체 tasks 배열:', tasks.length, '개');
    console.log('Tasks 상세:', JSON.stringify(tasks.map(t => ({ type: t.type, issueTypeName: t.issueTypeName, summary: t.summary })), null, 2));

    // Basic Auth 헤더 생성
    const auth = btoa(`${jiraAuth.email}:${jiraAuth.apiToken}`);
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const createdIssues: CreateJiraResponse['createdIssues'] = [];

    // ========================================
    // 1단계: Epic 생성
    // ========================================
    console.log('[1/3] Epic 생성 시작');
    const epicPayload = {
      fields: {
        project: { key: projectKey },
        summary: epic.summary,
        description: '',
        issuetype: { name: 'Epic' },
      },
    };

    const epicResponse = await fetch(`${JIRA_URL}/rest/api/3/issue`, {
      method: 'POST',
      headers,
      body: JSON.stringify(epicPayload),
    });

    if (!epicResponse.ok) {
      const errorText = await epicResponse.text();
      console.error('Epic 생성 실패:', errorText);
      throw new Error(`Epic 생성 실패: ${errorText}`);
    }

    const epicData = await epicResponse.json();
    const epicId = epicData.id;
    const epicKey = epicData.key;

    createdIssues.push({
      id: epicId,
      key: epicKey,
      type: 'Epic',
      stageId: 'EPIC',
    });
    console.log(`Epic 생성 성공: ${epicKey} (key: ${epicKey}, id: ${epicId})`);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // ========================================
    // 2단계: Task만 생성 (부모: Epic)
    // ========================================
    const taskItems = tasks.filter((t) => t.type === 'Task');
    console.log(`[2/3] Task 생성 시작 (총 ${taskItems.length}개)`);

    for (const task of taskItems) {
      const taskPayload = {
        fields: {
          project: { key: projectKey },
          summary: task.summary,
          description: task.description || '',
          issuetype: { name: task.issueTypeName },
          parent: { key: epicKey },
          [CUSTOM_FIELD_START]: task.startDate,
          [CUSTOM_FIELD_END]: task.endDate,
          assignee: task.assignee ? { accountId: task.assignee } : undefined,
        },
      };

      console.log(`Task 생성 중: ${task.summary} (stageId: ${task.stageId})`);

      const taskResponse = await fetch(`${JIRA_URL}/rest/api/3/issue`, {
        method: 'POST',
        headers,
        body: JSON.stringify(taskPayload),
      });

      if (!taskResponse.ok) {
        const errorText = await taskResponse.text();
        console.error(`Task 생성 실패:`, {
          summary: task.summary,
          stageId: task.stageId,
          error: errorText,
        });
        await rollbackCreatedIssues(createdIssues, headers);
        throw new Error(`Task 생성 실패 (${task.summary}): ${errorText}`);
      }

      const taskData = await taskResponse.json();
      createdIssues.push({
        id: taskData.id,
        key: taskData.key,
        type: 'Task',
        stageId: task.stageId,
      });
      console.log(`Task 생성 성공: ${taskData.key} (stageId: ${task.stageId})`);

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // ========================================
    // 3단계: Subtask만 생성 (부모: Task)
    // ========================================
    const subtaskItems = tasks.filter((t) => t.type === 'Sub-task');
    console.log(`[3/3] Subtask 생성 시작 (총 ${subtaskItems.length}개)`);

    for (const subtask of subtaskItems) {
      // 부모 Task 찾기 (이제 100% 존재 보장)
      const parentTask = createdIssues.find(
        (issue) => issue.stageId === subtask.parentStageId && issue.type === 'Task'
      );

      if (!parentTask) {
        console.error(`Subtask의 부모 Task를 찾을 수 없음:`, {
          subtaskSummary: subtask.summary,
          subtaskStageId: subtask.stageId,
          parentStageId: subtask.parentStageId,
          availableTasks: createdIssues.filter((i) => i.type === 'Task'),
        });
        await rollbackCreatedIssues(createdIssues, headers);
        throw new Error(
          `Subtask의 부모 Task를 찾을 수 없습니다 (부모 stageId: ${subtask.parentStageId})`
        );
      }

      const subtaskPayload = {
        fields: {
          project: { key: projectKey },
          summary: subtask.summary,
          description: subtask.description || '',
          issuetype: { name: subtask.issueTypeName },
          parent: { key: parentTask.key },
          [CUSTOM_FIELD_START]: subtask.startDate,
          [CUSTOM_FIELD_END]: subtask.endDate,
          assignee: subtask.assignee ? { accountId: subtask.assignee } : undefined,
        },
      };

      console.log(`Subtask 생성 중: ${subtask.summary} (부모: ${parentTask.key})`);

      const subtaskResponse = await fetch(`${JIRA_URL}/rest/api/3/issue`, {
        method: 'POST',
        headers,
        body: JSON.stringify(subtaskPayload),
      });

      if (!subtaskResponse.ok) {
        const errorText = await subtaskResponse.text();
        console.error(`Subtask 생성 실패:`, {
          summary: subtask.summary,
          stageId: subtask.stageId,
          parentTaskKey: parentTask.key,
          error: errorText,
          payload: JSON.stringify(subtaskPayload, null, 2),
        });
        await rollbackCreatedIssues(createdIssues, headers);
        throw new Error(`Subtask 생성 실패 (${subtask.summary}): ${errorText}`);
      }

      const subtaskData = await subtaskResponse.json();
      createdIssues.push({
        id: subtaskData.id,
        key: subtaskData.key,
        type: 'Sub-task',
        stageId: subtask.stageId,
      });
      console.log(`Subtask 생성 성공: ${subtaskData.key} (부모: ${parentTask.key})`);

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`전체 생성 완료: Epic(1) + Task(${taskItems.length}) + Subtask(${subtaskItems.length})`);

    // 성공 응답
    const response: CreateJiraResponse = {
      success: true,
      createdIssues,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('=== JIRA Create Error ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

    const response: CreateJiraResponse = {
      success: false,
      createdIssues: [],
      error: `${error.name || 'Error'}: ${error.message || 'Unknown error'}\n\nStack: ${error.stack || 'No stack trace'}`,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

/**
 * 롤백: 생성된 일감들을 역순으로 삭제
 */
async function rollbackCreatedIssues(
  issues: { id: string; key: string }[],
  headers: Record<string, string>
): Promise<void> {
  console.log('롤백 시작: 생성된 일감 삭제');

  // 역순으로 삭제 (Subtask → Task → Epic)
  for (let i = issues.length - 1; i >= 0; i--) {
    const issue = issues[i];
    try {
      const deleteResponse = await fetch(`${JIRA_URL}/rest/api/3/issue/${issue.id}`, {
        method: 'DELETE',
        headers,
      });

      if (!deleteResponse.ok) {
        console.error(`롤백 실패 (${issue.key}): ${await deleteResponse.text()}`);
      } else {
        console.log(`롤백 성공: ${issue.key} 삭제`);
      }

      // Rate Limit 회피
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (err) {
      console.error(`롤백 중 에러 (${issue.key}):`, err);
    }
  }
}
