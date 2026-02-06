/**
 * JIRA Update Edge Function
 * JIRA Epic/Task/Subtask 날짜 업데이트 및 신규 Task 생성
 * 참조: prd/Azrael-PRD-Phase1.md §8.2
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { textToADF } from '../_shared/adf.ts';
import { JIRA_RATE_LIMIT_DELAY_MS } from '../_shared/constants.ts';

interface UpdateJiraRequest {
  epicId: string;
  epicUpdate: {
    startDate: string;
    endDate: string;
  };
  updates: {
    issueId?: string;
    stageId: string;
    summary: string;
    description?: string;  // 테이블 마크업 포함 가능
    startDate: string;
    endDate: string;
    assignee?: string;
    issueType: 'Task' | 'Sub-task';
    parentTaskId?: string;
  }[];
  jiraAuth: {
    email: string;
    apiToken: string;
  };
}

interface UpdateJiraResponse {
  success: boolean;
  updatedCount: number;
  createdCount: number;
  createdIssues?: {
    id: string;
    key: string;
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
    const { epicId, epicUpdate, updates, jiraAuth }: UpdateJiraRequest = await req.json();

    // Basic Auth 헤더 생성
    const auth = btoa(`${jiraAuth.email}:${jiraAuth.apiToken}`);
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    let updatedCount = 0;
    let createdCount = 0;
    const createdIssues: UpdateJiraResponse['createdIssues'] = [];

    // 1. Epic 날짜 업데이트
    const epicUpdatePayload = {
      fields: {
        [CUSTOM_FIELD_START]: epicUpdate.startDate,
        [CUSTOM_FIELD_END]: epicUpdate.endDate,
      },
    };

    const epicResponse = await fetch(`${JIRA_URL}/rest/api/3/issue/${epicId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(epicUpdatePayload),
    });

    if (!epicResponse.ok) {
      const errorText = await epicResponse.text();
      throw new Error(`Epic 업데이트 실패: ${errorText}`);
    }

    await new Promise((resolve) => setTimeout(resolve, JIRA_RATE_LIMIT_DELAY_MS));

    // 2. Tasks 업데이트 또는 생성
    for (const update of updates) {
      if (update.issueId) {
        // 기존 Task 업데이트
        const updatePayload: any = {
          fields: {
            summary: update.summary,
            [CUSTOM_FIELD_START]: update.startDate,
            [CUSTOM_FIELD_END]: update.endDate,
            assignee: update.assignee ? { accountId: update.assignee } : null,
          },
        };

        // description 추가 (ADF 변환)
        const descriptionADF = textToADF(update.description);
        if (descriptionADF) {
          updatePayload.fields.description = descriptionADF;
        }

        const taskResponse = await fetch(`${JIRA_URL}/rest/api/3/issue/${update.issueId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(updatePayload),
        });

        if (!taskResponse.ok) {
          const errorText = await taskResponse.text();
          console.error(`Task 업데이트 실패 (${update.issueId}): ${errorText}`);
        } else {
          updatedCount++;
        }
      } else {
        // 새 Task 생성
        const createPayload: any = {
          fields: {
            project: { key: await getProjectKeyFromEpic(epicId, headers) },
            summary: update.summary,
            issuetype: { name: update.issueType },
            parent: { id: update.issueType === 'Sub-task' && update.parentTaskId ? update.parentTaskId : epicId },
            [CUSTOM_FIELD_START]: update.startDate,
            [CUSTOM_FIELD_END]: update.endDate,
            assignee: update.assignee ? { accountId: update.assignee } : undefined,
          },
        };

        // description이 있으면 ADF로 변환하여 추가 (테이블 마크업 지원)
        const descriptionADF = textToADF(update.description);
        if (descriptionADF) {
          createPayload.fields.description = descriptionADF;
        }

        const taskResponse = await fetch(`${JIRA_URL}/rest/api/3/issue`, {
          method: 'POST',
          headers,
          body: JSON.stringify(createPayload),
        });

        if (!taskResponse.ok) {
          const errorText = await taskResponse.text();
          console.error(`Task 생성 실패: ${errorText}`);
        } else {
          const taskData = await taskResponse.json();
          createdCount++;
          createdIssues!.push({
            id: taskData.id,
            key: taskData.key,
            stageId: update.stageId,
          });
        }
      }

      // Rate Limit 회피
      await new Promise((resolve) => setTimeout(resolve, JIRA_RATE_LIMIT_DELAY_MS));
    }

    // 성공 응답
    const response: UpdateJiraResponse = {
      success: true,
      updatedCount,
      createdCount,
      createdIssues: createdCount > 0 ? createdIssues : undefined,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('JIRA Update Error:', error);

    const response: UpdateJiraResponse = {
      success: false,
      updatedCount: 0,
      createdCount: 0,
      error: error.message || 'Unknown error',
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

/**
 * Epic ID로부터 프로젝트 키 조회
 */
async function getProjectKeyFromEpic(
  epicId: string,
  headers: Record<string, string>
): Promise<string> {
  const response = await fetch(`${JIRA_URL}/rest/api/3/issue/${epicId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error('Epic 조회 실패');
  }

  const data = await response.json();
  return data.fields.project.key;
}
