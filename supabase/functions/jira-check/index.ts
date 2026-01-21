/**
 * JIRA Check Edge Function
 * JIRA Issue 존재 여부 확인
 * 참조: prd/Azrael-PRD-Phase1.md
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface CheckJiraRequest {
  issueKey: string;
  jiraAuth: {
    email: string;
    apiToken: string;
  };
}

interface CheckJiraResponse {
  exists: boolean;
  issueKey: string;
  issueId?: string;
  errorCode?: 'NOT_FOUND' | 'UNAUTHORIZED' | 'NETWORK_ERROR';
  errorMessage?: string;
}

const JIRA_URL = Deno.env.get('JIRA_URL') || 'https://wemade.atlassian.net';

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
    const { issueKey, jiraAuth }: CheckJiraRequest = await req.json();

    console.log('=== JIRA 존재 확인 요청 ===');
    console.log('Issue Key:', issueKey);

    // Basic Auth 헤더 생성
    const auth = btoa(`${jiraAuth.email}:${jiraAuth.apiToken}`);
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
    };

    // JIRA API 호출 (summary 필드만 요청하여 최소화)
    const response = await fetch(
      `${JIRA_URL}/rest/api/3/issue/${issueKey}?fields=summary`,
      {
        method: 'GET',
        headers,
      }
    );

    console.log('JIRA API 응답 상태:', response.status);

    // 응답 처리
    if (response.ok) {
      const data = await response.json();
      const result: CheckJiraResponse = {
        exists: true,
        issueKey: issueKey,
        issueId: data.id,
      };

      console.log('Issue 존재 확인:', result);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 404 Not Found - 이슈가 존재하지 않음
    if (response.status === 404) {
      const result: CheckJiraResponse = {
        exists: false,
        issueKey: issueKey,
        errorCode: 'NOT_FOUND',
        errorMessage: 'JIRA에서 해당 일감을 찾을 수 없습니다.',
      };

      console.log('Issue 미존재 (404):', result);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // 정상 응답으로 처리 (exists: false로 구분)
      });
    }

    // 401/403 인증 오류
    if (response.status === 401 || response.status === 403) {
      const result: CheckJiraResponse = {
        exists: false,
        issueKey: issueKey,
        errorCode: 'UNAUTHORIZED',
        errorMessage: 'JIRA 인증에 실패했습니다. API Token을 확인해주세요.',
      };

      console.log('인증 오류:', result);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // 정상 응답으로 처리
      });
    }

    // 기타 오류
    const errorText = await response.text();
    const result: CheckJiraResponse = {
      exists: false,
      issueKey: issueKey,
      errorCode: 'NETWORK_ERROR',
      errorMessage: `JIRA API 오류 (${response.status}): ${errorText}`,
    };

    console.log('기타 오류:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // 정상 응답으로 처리
    });

  } catch (error: any) {
    console.error('=== JIRA Check Error ===');
    console.error('Error:', error.message);

    const result: CheckJiraResponse = {
      exists: false,
      issueKey: '',
      errorCode: 'NETWORK_ERROR',
      errorMessage: `네트워크 오류: ${error.message}`,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
