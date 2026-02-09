/**
 * Slack Send Edge Function
 * Slack 채널에 메시지 발신
 * 참조: prd/Azrael-PRD-Phase3.md §6.3, §7
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlackSendRequest {
  channelId: string;
  message: string;
  userId: string;
  threadTs?: string;
  imageBase64?: string;
}

interface SlackSendResponse {
  success: boolean;
  messageTs?: string;
  error?: string;
  errorCode?: string;
  retryAfter?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { channelId, message, userId, threadTs, imageBase64 }: SlackSendRequest = await req.json();

    // Supabase 클라이언트 (Service Role: RLS bypass)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. 사용자 토큰 조회
    const { data: tokenData, error: tokenError } = await supabase
      .from('slack_user_tokens')
      .select('access_token')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Slack 연동이 필요합니다. 설정 > Slack에서 연동해주세요.',
          errorCode: 'TOKEN_NOT_FOUND',
        } as SlackSendResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // 2. Slack API 호출
    // 이미지 첨부 여부에 따라 분기:
    //   - 이미지 없음: chat.postMessage (텍스트만)
    //   - 이미지 있음: files.uploadV2 (이미지 + initial_comment)

    let slackResult: Record<string, unknown>;
    let slackResponse: Response;

    if (imageBase64) {
      // ─── 이미지 첨부 발신: files.uploadV2 (3단계 프로세스) ───
      console.log('[이미지 첨부] base64 length:', imageBase64.length);

      // base64 디코딩
      const binaryString = atob(imageBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const imageBlob = new Blob([bytes], { type: 'image/png' });
      console.log('[이미지 첨부] Blob size:', imageBlob.size, 'bytes');

      // Step 1: 업로드 URL 획득
      const filename = 'schedule-table.png';
      const filesize = imageBlob.size;
      console.log('[Step 1] 요청 - filename:', filename, ', length:', filesize);

      // FormData 사용 (Slack API는 JSON이 아닌 form-data 기대)
      const uploadUrlFormData = new FormData();
      uploadUrlFormData.append('filename', filename);
      uploadUrlFormData.append('length', filesize.toString());

      const uploadUrlResponse = await fetch('https://slack.com/api/files.getUploadURLExternal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
        body: uploadUrlFormData,
      });

      const uploadUrlResult = await uploadUrlResponse.json();
      console.log('[Step 1] getUploadURLExternal 응답:', JSON.stringify(uploadUrlResult));

      if (!uploadUrlResult.ok) {
        slackResult = uploadUrlResult;
      } else {
        // Step 2: 파일 업로드
        const uploadResponse = await fetch(uploadUrlResult.upload_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          body: imageBlob,
        });

        if (!uploadResponse.ok) {
          console.error('[Step 2] 파일 업로드 실패:', uploadResponse.status);
          slackResult = { ok: false, error: 'file_upload_failed' };
        } else {
          console.log('[Step 2] 파일 업로드 성공');

          // Step 3: 업로드 완료 및 메시지 발신
          const completeResponse = await fetch('https://slack.com/api/files.completeUploadExternal', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              files: [
                {
                  id: uploadUrlResult.file_id,
                  title: 'schedule-table.png',
                },
              ],
              channel_id: channelId,
              initial_comment: message,
              thread_ts: threadTs,
            }),
          });

          slackResult = await completeResponse.json();
          console.log('[Step 3] completeUploadExternal 응답:', JSON.stringify(slackResult));
        }
      }

      slackResponse = new Response('', { status: slackResult.ok ? 200 : 400 });
    } else {
      // ─── 텍스트 전용 발신: chat.postMessage ───
      const slackBody: Record<string, unknown> = {
        channel: channelId,
        text: message,
      };
      if (threadTs) {
        slackBody.thread_ts = threadTs;
      }

      slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackBody),
      });

      slackResult = await slackResponse.json();
    }

    // 3. 토큰 무효화 에러 시 자동 삭제
    if (slackResult.error === 'token_revoked' || slackResult.error === 'invalid_auth') {
      await supabase
        .from('slack_user_tokens')
        .delete()
        .eq('user_id', userId);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Slack 연동이 해제되었습니다. 설정에서 다시 연동해주세요.',
          errorCode: 'TOKEN_INVALID',
        } as SlackSendResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // 4. Rate limit 에러
    if (slackResult.error === 'ratelimited') {
      const retryAfter = parseInt(slackResponse.headers.get('Retry-After') || '60', 10);
      return new Response(
        JSON.stringify({
          success: false,
          error: `요청이 너무 많습니다. ${retryAfter}초 후 다시 시도해주세요.`,
          errorCode: 'RATE_LIMITED',
          retryAfter,
        } as SlackSendResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // 5. 기타 Slack API 에러
    if (!slackResult.ok) {
      // not_in_channel 에러 특별 처리
      if (slackResult.error === 'not_in_channel') {
        return new Response(
          JSON.stringify({
            success: false,
            error: '해당 채널에 참여하고 있지 않습니다. Slack에서 채널에 먼저 참여해주세요.',
            errorCode: 'NOT_IN_CHANNEL',
          } as SlackSendResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      // channel_not_found 에러 특별 처리
      if (slackResult.error === 'channel_not_found') {
        return new Response(
          JSON.stringify({
            success: false,
            error: '채널을 찾을 수 없습니다. 채널을 다시 선택해주세요.',
            errorCode: 'CHANNEL_NOT_FOUND',
          } as SlackSendResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `슬랙 발신 실패: ${slackResult.error}`,
          errorCode: slackResult.error,
        } as SlackSendResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 6. 성공
    // files.upload의 경우 messageTs 추출 경로가 다름
    let messageTs: string | undefined;
    if (imageBase64) {
      // files.upload 응답: { ok: true, file: { id, shares: { public: { C123: [{ ts }] } } } }
      const file = slackResult.file as Record<string, unknown> | undefined;
      if (file) {
        const shares = file.shares as Record<string, Record<string, Array<Record<string, string>>>> | undefined;
        if (shares?.public?.[channelId]?.[0]?.ts) {
          messageTs = shares.public[channelId][0].ts;
        }
      }
    } else {
      messageTs = slackResult.ts as string | undefined;
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageTs,
      } as SlackSendResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('slack-send error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: '서버 오류가 발생했습니다.',
        errorCode: 'INTERNAL_ERROR',
      } as SlackSendResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
