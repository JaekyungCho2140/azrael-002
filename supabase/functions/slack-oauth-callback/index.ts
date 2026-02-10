/**
 * Slack OAuth Callback Edge Function
 * OAuth 인증 완료 후 토큰 저장, 메인 앱의 정적 콜백 페이지로 리다이렉트
 * 참조: prd/Azrael-PRD-Phase3.md §3.2, §6.3
 *
 * Note: Supabase Edge Function 런타임이 HTML 응답의 Content-Type을 정상 전달하지 않아
 * HTML을 직접 반환하는 대신, 메인 앱 도메인의 정적 HTML(/oauth-callback.html)로 302 리다이렉트.
 * 이를 통해 HTML 렌더링, 한글 인코딩, same-origin postMessage 문제를 모두 해결.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const APP_ORIGIN = Deno.env.get('APP_ORIGIN') || 'https://azrael-002.vercel.app';

/** 메인 앱의 정적 콜백 페이지로 리다이렉트 */
function redirectToCallback(status: 'success' | 'error', message?: string): Response {
  const params = new URLSearchParams({ status });
  if (message) params.set('message', message);
  return new Response(null, {
    status: 302,
    headers: { 'Location': `${APP_ORIGIN}/oauth-callback.html?${params}` },
  });
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // OAuth 에러 처리
    if (error) {
      const msg = error === 'access_denied'
        ? 'Slack 연동이 취소되었습니다.'
        : `OAuth 인증 실패: ${error}`;
      return redirectToCallback('error', msg);
    }

    if (!code || !state) {
      return redirectToCallback('error', '잘못된 OAuth 콜백 요청입니다.');
    }

    // state 파싱: "csrf:supabaseUid"
    const [csrf, supabaseUid] = state.split(':', 2);
    if (!csrf || !supabaseUid) {
      return redirectToCallback('error', '보안 검증에 실패했습니다. 다시 시도해주세요.');
    }

    // Slack OAuth token 교환
    const SLACK_CLIENT_ID = Deno.env.get('SLACK_CLIENT_ID');
    const SLACK_CLIENT_SECRET = Deno.env.get('SLACK_CLIENT_SECRET');
    const SLACK_REDIRECT_URI = Deno.env.get('SLACK_REDIRECT_URI');

    if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET || !SLACK_REDIRECT_URI) {
      console.error('Slack OAuth 환경변수 누락');
      return redirectToCallback('error', '서버 설정이 완료되지 않았습니다. 관리자에게 문의하세요.');
    }

    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        code,
        redirect_uri: SLACK_REDIRECT_URI,
      }),
    });

    const tokenResult = await tokenResponse.json();

    if (!tokenResult.ok) {
      console.error('Slack OAuth token 교환 실패:', tokenResult.error);
      const msg = tokenResult.error === 'invalid_code'
        ? 'OAuth 인증 코드가 만료되었습니다. 다시 시도해주세요.'
        : `OAuth 토큰 교환 실패: ${tokenResult.error}`;
      return redirectToCallback('error', msg);
    }

    // authed_user에서 User Token 정보 추출
    const accessToken = tokenResult.authed_user?.access_token;
    const slackUserId = tokenResult.authed_user?.id;
    const teamId = tokenResult.team?.id;
    const teamName = tokenResult.team?.name;

    if (!accessToken || !slackUserId || !teamId) {
      console.error('Slack OAuth 응답 불완전:', tokenResult);
      return redirectToCallback('error', 'Slack 인증 정보를 가져오지 못했습니다.');
    }

    // Supabase 클라이언트 (Service Role: RLS bypass)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 토큰 UPSERT
    const { error: dbError } = await supabase
      .from('slack_user_tokens')
      .upsert({
        user_id: supabaseUid,
        access_token: accessToken,
        slack_user_id: slackUserId,
        team_id: teamId,
        team_name: teamName,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (dbError) {
      console.error('Slack 토큰 저장 실패:', dbError);
      return redirectToCallback('error', '토큰 저장에 실패했습니다. 다시 시도해주세요.');
    }

    // 성공: 메인 앱 콜백 페이지로 리다이렉트
    return redirectToCallback('success');

  } catch (error) {
    console.error('slack-oauth-callback error:', error);
    return redirectToCallback('error', '서버 오류가 발생했습니다.');
  }
});
