/**
 * Slack OAuth Callback Edge Function
 * OAuth 인증 완료 후 토큰 저장 및 팝업 닫기 HTML 응답
 * 참조: prd/Azrael-PRD-Phase3.md §3.2, §6.3
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// HTML 응답 헬퍼
// Note: BOM(Uint8Array) 대신 string body 사용 — Supabase 런타임이 Uint8Array body의
// Content-Type을 text/html로 전달하지 않아 브라우저가 소스코드를 그대로 출력하는 문제 수정.
// charset=utf-8은 헤더 + <meta> 이중 선언으로 한글 인코딩 보장.
function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
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
      const userMessage = error === 'access_denied'
        ? 'Slack 연동이 취소되었습니다.'
        : `OAuth 인증 실패: ${error}`;
      return htmlResponse(`<!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Slack 연동 실패</title>
        </head>
        <body>
          <p>${userMessage}</p>
          <p>이 창을 닫고 다시 시도해주세요.</p>
          <script>
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
        </html>`);
    }

    if (!code || !state) {
      return htmlResponse(`<!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>잘못된 요청</title>
        </head>
        <body>
          <p>잘못된 OAuth 콜백 요청입니다.</p>
        </body>
        </html>`, 400);
    }

    // state 파싱: "csrf:supabaseUid"
    const [csrf, supabaseUid] = state.split(':', 2);
    if (!csrf || !supabaseUid) {
      return htmlResponse(`<!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>보안 검증 실패</title>
        </head>
        <body>
          <p>보안 검증에 실패했습니다. 다시 시도해주세요.</p>
        </body>
        </html>`, 400);
    }

    // Slack OAuth token 교환
    const SLACK_CLIENT_ID = Deno.env.get('SLACK_CLIENT_ID');
    const SLACK_CLIENT_SECRET = Deno.env.get('SLACK_CLIENT_SECRET');
    const SLACK_REDIRECT_URI = Deno.env.get('SLACK_REDIRECT_URI');

    if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET || !SLACK_REDIRECT_URI) {
      console.error('Slack OAuth 환경변수 누락');
      return htmlResponse(`<!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>서버 설정 오류</title>
        </head>
        <body>
          <p>서버 설정이 완료되지 않았습니다. 관리자에게 문의하세요.</p>
        </body>
        </html>`, 500);
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
      const userMessage = tokenResult.error === 'invalid_code'
        ? 'OAuth 인증 코드가 만료되었습니다. 다시 시도해주세요.'
        : `OAuth 토큰 교환 실패: ${tokenResult.error}`;
      return htmlResponse(`<!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>인증 실패</title>
        </head>
        <body>
          <p>${userMessage}</p>
          <p>이 창을 닫고 다시 시도해주세요.</p>
        </body>
        </html>`, 400);
    }

    // authed_user에서 User Token 정보 추출
    const accessToken = tokenResult.authed_user?.access_token;
    const slackUserId = tokenResult.authed_user?.id;
    const teamId = tokenResult.team?.id;
    const teamName = tokenResult.team?.name;

    if (!accessToken || !slackUserId || !teamId) {
      console.error('Slack OAuth 응답 불완전:', tokenResult);
      return htmlResponse(`<!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>인증 정보 오류</title>
        </head>
        <body>
          <p>Slack 인증 정보를 가져오지 못했습니다.</p>
        </body>
        </html>`, 500);
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
      return htmlResponse(`<!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>저장 실패</title>
        </head>
        <body>
          <p>토큰 저장에 실패했습니다. 다시 시도해주세요.</p>
        </body>
        </html>`, 500);
    }

    // 성공: 팝업 닫기 HTML (postMessage 포함)
    // Note: 클라이언트 CSRF 검증 제거 — 콜백 페이지(supabase.co)와 메인 앱(vercel.app)이
    // 다른 origin이므로 localStorage 공유 불가. OAuth state 파라미터 라운드트립이 CSRF 보호 담당.
    const appOrigin = Deno.env.get('APP_ORIGIN') || 'https://azrael-002.vercel.app';
    return htmlResponse(`<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Slack 연동 완료</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 2rem; }
          .success { color: #2e7d32; font-size: 1.2rem; margin-bottom: 1rem; }
          .close-btn { margin-top: 1rem; padding: 0.5rem 1.5rem; border: 1px solid #ccc; border-radius: 6px; background: #f5f5f5; cursor: pointer; font-size: 0.9rem; }
          .close-btn:hover { background: #e0e0e0; }
        </style>
      </head>
      <body>
        <p class="success">Slack 연동이 완료되었습니다.</p>
        <p>잠시 후 창이 자동으로 닫힙니다...</p>
        <button class="close-btn" onclick="window.close()">닫기</button>
        <script>
          (function() {
            try {
              if (window.opener) {
                window.opener.postMessage(
                  { type: 'SLACK_OAUTH_SUCCESS' },
                  '${appOrigin}'
                );
              }
              setTimeout(function() { window.close(); }, 2000);
            } catch (err) {
              console.error('OAuth 콜백 처리 실패:', err);
            }
          })();
        </script>
      </body>
      </html>`);

  } catch (error) {
    console.error('slack-oauth-callback error:', error);
    return htmlResponse(`<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>서버 오류</title>
      </head>
      <body>
        <p>서버 오류가 발생했습니다.</p>
      </body>
      </html>`, 500);
  }
});
