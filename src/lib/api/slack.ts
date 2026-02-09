/**
 * Slack API (Supabase)
 * 참조: prd/Azrael-PRD-Phase3.md §6.4
 */

import { supabase } from '../supabase';
import type { Database } from '../../types/supabase';
import type {
  SlackSendRequest,
  SlackSendResponse,
  SlackChannel,
  SlackMessageTemplate,
} from '../../types';

/**
 * Supabase Row → TypeScript SlackMessageTemplate 타입 매핑
 */
function mapToSlackMessageTemplate(
  row: Database['public']['Tables']['slack_message_templates']['Row']
): SlackMessageTemplate {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    bodyTemplate: row.body_template,
    isBuiltIn: row.is_built_in,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
  };
}

/**
 * Slack 토큰 존재 여부 확인
 */
export async function checkSlackTokenStatus(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('slack_user_tokens')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  return !error && data !== null;
}

/**
 * Slack 연동 해제
 */
export async function disconnectSlack(userId: string): Promise<void> {
  const { error } = await supabase
    .from('slack_user_tokens')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to disconnect Slack:', error);
    throw new Error(`Slack 연동 해제 실패: ${error.message}`);
  }
}

/**
 * Slack 채널 목록 조회 응답
 */
export interface SlackChannelsResponse {
  channels: SlackChannel[];
  warning?: 'PRIVATE_CHANNELS_UNAVAILABLE';
}

/**
 * Slack 채널 목록 조회
 */
export async function fetchSlackChannels(
  userId: string
): Promise<SlackChannelsResponse> {
  const { data, error } = await supabase.functions.invoke('slack-channels', {
    body: { userId },
  });

  if (error) {
    console.error('Failed to fetch Slack channels:', error);
    throw new Error(`Slack 채널 조회 실패: ${error.message}`);
  }

  if (!data.success) {
    throw new Error(data.error || 'Slack 채널 조회 실패');
  }

  return {
    channels: data.channels || [],
    warning: data.warning,
  };
}

/**
 * Slack 메시지 발신
 */
export async function sendSlackMessage(
  request: SlackSendRequest
): Promise<SlackSendResponse> {
  const { data, error } = await supabase.functions.invoke('slack-send', {
    body: {
      channelId: request.channelId,
      message: request.message,
      userId: request.userId,
      threadTs: request.threadTs,
    },
  });

  if (error) {
    console.error('Failed to send Slack message:', error);
    return {
      success: false,
      error: `메시지 발신 실패: ${error.message}`,
    };
  }

  return data as SlackSendResponse;
}

/**
 * Slack 메시지 템플릿 조회
 */
export async function fetchSlackTemplates(
  projectId: string
): Promise<SlackMessageTemplate[]> {
  const { data, error } = await supabase
    .from('slack_message_templates')
    .select('*')
    .eq('project_id', projectId)
    .order('name');

  if (error) {
    console.error('Failed to fetch Slack templates:', error);
    throw new Error(`Slack 템플릿 조회 실패: ${error.message}`);
  }

  return data.map(mapToSlackMessageTemplate);
}

/**
 * Slack 메시지 템플릿 생성
 */
export async function createSlackTemplate(
  template: Omit<
    SlackMessageTemplate,
    'id' | 'createdAt' | 'updatedAt' | 'isBuiltIn' | 'createdBy'
  >
): Promise<SlackMessageTemplate> {
  const { data, error } = await supabase
    .from('slack_message_templates')
    .insert({
      project_id: template.projectId,
      name: template.name,
      body_template: template.bodyTemplate,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create Slack template:', error);
    throw new Error(`Slack 템플릿 생성 실패: ${error.message}`);
  }

  return mapToSlackMessageTemplate(data);
}

/**
 * Slack 메시지 템플릿 수정
 */
export async function updateSlackTemplate(
  id: string,
  updates: { name?: string; bodyTemplate?: string }
): Promise<void> {
  const { error } = await supabase
    .from('slack_message_templates')
    .update({
      name: updates.name,
      body_template: updates.bodyTemplate,
    })
    .eq('id', id);

  if (error) {
    console.error('Failed to update Slack template:', error);
    throw new Error(`Slack 템플릿 수정 실패: ${error.message}`);
  }
}

/**
 * Slack 메시지 템플릿 삭제
 * RLS가 is_built_in=false만 허용
 */
export async function deleteSlackTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('slack_message_templates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete Slack template:', error);
    throw new Error(`Slack 템플릿 삭제 실패: ${error.message}`);
  }
}

/**
 * 프로젝트 Slack 채널 매핑 저장
 */
export async function saveChannelMapping(
  projectId: string,
  channel: { id: string; name: string } | null
): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({
      slack_channel_id: channel?.id ?? null,
      slack_channel_name: channel?.name ?? null,
    })
    .eq('id', projectId);

  if (error) {
    console.error('Failed to save channel mapping:', error);
    throw new Error(`채널 매핑 저장 실패: ${error.message}`);
  }
}
