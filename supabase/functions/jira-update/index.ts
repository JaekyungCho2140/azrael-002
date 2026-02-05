/**
 * JIRA Update Edge Function
 * JIRA Epic/Task/Subtask 날짜 업데이트 및 신규 Task 생성
 * 참조: prd/Azrael-PRD-Phase1.md §8.2
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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

// ========================================
// ADF (Atlassian Document Format) 변환 유틸리티
// 참조: https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
// ========================================

interface ADFNode {
  type: string;
  attrs?: Record<string, any>;
  content?: ADFNode[];
  text?: string;
  marks?: { type: string }[];
}

/**
 * 테이블 마크업 행들을 ADF table 노드로 변환
 * 형식:
 *   ||헤더1|헤더2|헤더3||  (헤더 행: 파이프 2개로 시작/끝)
 *   |내용1|내용2|내용3|    (데이터 행: 파이프 1개로 시작/끝)
 */
function parseTableMarkup(tableLines: string[]): ADFNode | null {
  if (tableLines.length === 0) return null;

  const tableRows: ADFNode[] = [];

  for (const line of tableLines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const isHeader = trimmedLine.startsWith('||') && trimmedLine.endsWith('||');

    let cells: string[];
    if (isHeader) {
      const inner = trimmedLine.slice(2, -2);
      cells = inner.split('|').map(c => c.trim());
    } else if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      const inner = trimmedLine.slice(1, -1);
      cells = inner.split('|').map(c => c.trim());
    } else {
      continue;
    }

    if (cells.length === 0 || (cells.length === 1 && cells[0] === '')) continue;

    const cellNodes: ADFNode[] = cells.map(cellText => ({
      type: isHeader ? 'tableHeader' : 'tableCell',
      attrs: {},
      content: [
        {
          type: 'paragraph',
          content: cellText ? [
            {
              type: 'text',
              text: cellText,
              ...(isHeader ? { marks: [{ type: 'strong' }] } : {}),
            },
          ] : [],
        },
      ],
    }));

    tableRows.push({
      type: 'tableRow',
      content: cellNodes,
    });
  }

  if (tableRows.length === 0) return null;

  return {
    type: 'table',
    attrs: {
      isNumberColumnEnabled: false,
      layout: 'default',
    },
    content: tableRows,
  };
}

function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  return (trimmed.startsWith('||') && trimmed.endsWith('||')) ||
         (trimmed.startsWith('|') && trimmed.endsWith('|') && !trimmed.startsWith('||'));
}

/**
 * 체크박스 행인지 확인
 * 형식: [ ] 미완료 항목  또는  [x] 완료 항목
 */
function isCheckboxLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('[ ] ') || trimmed.startsWith('[x] ') || trimmed.startsWith('[X] ');
}

/**
 * 체크박스 행들을 ADF taskList 노드로 변환
 */
function parseCheckboxLines(lines: string[]): ADFNode {
  let idCounter = 0;
  const items: ADFNode[] = lines.map(line => {
    const trimmed = line.trim();
    const isDone = trimmed.startsWith('[x] ') || trimmed.startsWith('[X] ');
    const text = trimmed.slice(4);
    idCounter++;
    return {
      type: 'taskItem',
      attrs: {
        localId: `task-${Date.now()}-${idCounter}`,
        state: isDone ? 'DONE' : 'TODO',
      },
      content: text ? [{ type: 'text', text }] : [],
    };
  });

  return {
    type: 'taskList',
    attrs: { localId: `tasklist-${Date.now()}` },
    content: items,
  };
}

/**
 * 평문 텍스트를 ADF (Atlassian Document Format)로 변환
 * 테이블 마크업 지원
 */
function textToADF(text: string): ADFNode | null {
  if (!text || text.trim() === '') {
    return null;
  }

  const lines = text.split('\n');
  const content: ADFNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (isCheckboxLine(trimmedLine)) {
      const checkboxLines: string[] = [];
      while (i < lines.length) {
        const currentLine = lines[i].trim();
        if (isCheckboxLine(currentLine)) {
          checkboxLines.push(currentLine);
          i++;
        } else if (currentLine === '') {
          i++;
          break;
        } else {
          break;
        }
      }
      content.push(parseCheckboxLines(checkboxLines));
    } else if (isTableLine(trimmedLine)) {
      const tableLines: string[] = [];
      while (i < lines.length) {
        const currentLine = lines[i].trim();
        if (isTableLine(currentLine)) {
          tableLines.push(currentLine);
          i++;
        } else if (currentLine === '') {
          i++;
          break;
        } else {
          break;
        }
      }

      const tableNode = parseTableMarkup(tableLines);
      if (tableNode) {
        content.push(tableNode);
      }
    } else {
      content.push({
        type: 'paragraph',
        content: trimmedLine ? [{ type: 'text', text: line }] : [],
      });
      i++;
    }
  }

  if (content.length === 0) {
    return null;
  }

  return {
    type: 'doc',
    version: 1,
    content,
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

    await new Promise((resolve) => setTimeout(resolve, 100));

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
      await new Promise((resolve) => setTimeout(resolve, 100));
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
