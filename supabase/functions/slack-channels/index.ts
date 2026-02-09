/**
 * Slack Channels Edge Function
 * 사용자의 Slack 채널 목록 조회 (공개 + 비공개)
 * 참조: prd/Azrael-PRD-Phase3.md §6.3
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SlackChannelsRequest {
  userId: string;
}

interface SlackChannelsResponse {
  success: boolean;
  channels?: {
    id: string;
    name: string;
    isPrivate: boolean;
  }[];
  warning?: 'PRIVATE_CHANNELS_UNAVAILABLE';
  error?: string;
  errorCode?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId }: SlackChannelsRequest = await req.json();

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
          error: 'Slack 연동이 필요합니다.',
          errorCode: 'TOKEN_NOT_FOUND',
        } as SlackChannelsResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // 2. 공개 채널 + 비공개 채널 조회 (Promise.allSettled)
    const [publicSettled, privateSettled] = await Promise.allSettled([
      fetch(
        'https://slack.com/api/conversations.list?types=public_channel&limit=200&exclude_archived=true',
        { headers: { 'Authorization': `Bearer ${tokenData.access_token}` } }
      ),
      fetch(
        'https://slack.com/api/conversations.list?types=private_channel&limit=200&exclude_archived=true',
        { headers: { 'Authorization': `Bearer ${tokenData.access_token}` } }
      ),
    ]);

    // 공개 채널 결과 처리
    let publicChannels: { id: string; name: string }[] = [];
    if (publicSettled.status === 'fulfilled') {
      const publicResult = await publicSettled.value.json();
      if (publicResult.ok && publicResult.channels) {
        publicChannels = publicResult.channels.map((ch: { id: string; name: string }) => ({
          id: ch.id,
          name: ch.name,
        }));
      } else if (!publicResult.ok) {
        console.error('공개 채널 조회 실패:', publicResult.error);
      }
    } else {
      console.error('공개 채널 네트워크 에러:', publicSettled.reason);
    }

    // 비공개 채널 결과 처리
    let privateChannels: { id: string; name: string }[] = [];
    let hasPrivateWarning = false;
    if (privateSettled.status === 'fulfilled') {
      const privateResult = await privateSettled.value.json();
      if (privateResult.ok && privateResult.channels) {
        privateChannels = privateResult.channels.map((ch: { id: string; name: string }) => ({
          id: ch.id,
          name: ch.name,
        }));
      } else if (!privateResult.ok) {
        console.warn('비공개 채널 조회 실패 (graceful degradation):', privateResult.error);
        hasPrivateWarning = true;
      }
    } else {
      console.warn('비공개 채널 네트워크 에러 (graceful degradation):', privateSettled.reason);
      hasPrivateWarning = true;
    }

    // 3. 채널 합치기 및 정렬
    const allChannels = [
      ...publicChannels.map(ch => ({ ...ch, isPrivate: false })),
      ...privateChannels.map(ch => ({ ...ch, isPrivate: true })),
    ].sort((a, b) => a.name.localeCompare(b.name));

    // 4. 응답
    const response: SlackChannelsResponse = {
      success: true,
      channels: allChannels,
    };

    if (hasPrivateWarning && privateChannels.length === 0) {
      response.warning = 'PRIVATE_CHANNELS_UNAVAILABLE';
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('slack-channels error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: '서버 오류가 발생했습니다.',
        errorCode: 'INTERNAL_ERROR',
      } as SlackChannelsResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
