import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Project, SlackMessageTemplate } from '../../types';
import { Button } from '../Button';
import {
  disconnectSlack,
  fetchSlackChannels,
  saveChannelMapping,
} from '../../lib/api/slack';
import { useSlackTokenStatus } from '../../hooks/useSlackTokenStatus';
import {
  useSlackTemplates,
  useDeleteSlackTemplate,
} from '../../hooks/useSlackTemplates';
import { SlackTemplateEditModal } from '../SlackTemplateEditModal';

interface SettingsSlackTabProps {
  currentUserEmail: string;
  currentUserId: string;
  selectedProjectId: string;
  onSelectedProjectIdChange: (id: string) => void;
  projects: Project[];
}

export function SettingsSlackTab({
  currentUserEmail,
  currentUserId,
  selectedProjectId,
  onSelectedProjectIdChange,
  projects,
}: SettingsSlackTabProps) {
  const [isOAuthPending, setIsOAuthPending] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SlackMessageTemplate | null>(null);

  const queryClient = useQueryClient();

  // Slack 토큰 존재 여부 조회
  const { data: hasToken = false } = useSlackTokenStatus(currentUserId);

  // Slack 채널 목록 조회
  const {
    data: channelData,
    isLoading: channelsLoading,
    error: channelsError,
    refetch: refetchChannels,
  } = useQuery({
    queryKey: ['slack-channels', currentUserId],
    queryFn: async () => {
      const result = await fetchSlackChannels(currentUserId);
      return result;
    },
    enabled: !!currentUserId && hasToken,
    staleTime: 2 * 60 * 1000, // 2분
  });

  // Slack 메시지 템플릿 조회
  const { data: templates } = useSlackTemplates(selectedProjectId);
  const deleteTemplateMutation = useDeleteSlackTemplate();

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  // OAuth 연동 처리
  const handleSlackConnect = () => {
    const SLACK_CLIENT_ID = import.meta.env.VITE_SLACK_CLIENT_ID;
    const REDIRECT_URI = import.meta.env.VITE_SLACK_REDIRECT_URI;

    const csrf = crypto.randomUUID();
    const state = `${csrf}:${currentUserId}`;
    localStorage.setItem('slack_oauth_state', csrf);

    const oauthUrl =
      `https://slack.com/oauth/v2/authorize?` +
      `client_id=${SLACK_CLIENT_ID}` +
      `&user_scope=chat:write,channels:read,groups:read,files:write` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&state=${encodeURIComponent(state)}`;

    const popup = window.open(oauthUrl, 'slack-oauth', 'width=600,height=700');
    if (!popup || popup.closed) {
      alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
      return;
    }

    setIsOAuthPending(true);

    // 팝업 닫기 감지 (수동 닫기 또는 자동 닫기)
    const popupCheckInterval = setInterval(() => {
      if (popup.closed) {
        clearInterval(popupCheckInterval);
        window.removeEventListener('message', handleOAuthMessage);
        setIsOAuthPending(false);
        localStorage.removeItem('slack_oauth_state');
        // Fallback: window.opener가 null이거나 postMessage 미수신 시에도 상태 갱신
        queryClient.invalidateQueries({ queryKey: ['slack-token-status'] });
      }
    }, 500);

    // postMessage 리스너 (same-origin: 콜백 페이지가 메인 앱 도메인에서 로드됨)
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'SLACK_OAUTH_SUCCESS') {
        clearInterval(popupCheckInterval);
        window.removeEventListener('message', handleOAuthMessage);
        setIsOAuthPending(false);
        localStorage.removeItem('slack_oauth_state');
        alert('Slack 연동이 완료되었습니다.');
        queryClient.invalidateQueries({ queryKey: ['slack-token-status'] });
      }
    };
    window.addEventListener('message', handleOAuthMessage);
  };

  // Slack 연동 해제
  const handleSlackDisconnect = async () => {
    if (!confirm('연동 해제 시 메시지 발신이 불가합니다. 해제하시겠습니까?')) {
      return;
    }

    try {
      await disconnectSlack(currentUserId);
      alert('Slack 연동이 해제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['slack-token-status'] });
    } catch (err: any) {
      alert(`연동 해제 실패: ${err.message}`);
    }
  };

  // 채널 매핑 저장 (Optimistic update)
  const channelMappingMutation = useMutation({
    mutationFn: (channel: { id: string; name: string } | null) =>
      saveChannelMapping(selectedProjectId, channel),
    onMutate: async (newChannel) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const prev = queryClient.getQueryData(['projects']);
      queryClient.setQueryData(['projects'], (old: Project[] | undefined) =>
        old?.map(p =>
          p.id === selectedProjectId
            ? {
                ...p,
                slackChannelId: newChannel?.id ?? null,
                slackChannelName: newChannel?.name ?? null,
              }
            : p
        )
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['projects'], context?.prev);
      alert('채널 매핑 저장에 실패했습니다. 다시 시도해주세요.');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  // 채널 선택 변경
  const handleChannelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const channelId = e.target.value;
    if (!channelId) {
      channelMappingMutation.mutate(null);
      return;
    }

    const channel = channelData?.channels.find((ch) => ch.id === channelId);
    if (channel) {
      channelMappingMutation.mutate({ id: channel.id, name: channel.name });
    }
  };

  // 템플릿 추가
  const handleAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateModalOpen(true);
  };

  // 템플릿 편집
  const handleEditTemplate = (tmpl: SlackMessageTemplate) => {
    setEditingTemplate(tmpl);
    setTemplateModalOpen(true);
  };

  // 템플릿 삭제
  const handleDeleteTemplate = (tmpl: SlackMessageTemplate) => {
    if (!confirm(`"${tmpl.name}" 템플릿을 삭제하시겠습니까?`)) return;
    deleteTemplateMutation.mutate(tmpl.id, {
      onError: (err: any) => {
        alert(`삭제 실패: ${err.message}`);
      },
    });
  };

  return (
    <div>
      <h3>Slack 연동</h3>

      {/* 1. 연동 상태 섹션 */}
      <div style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {!hasToken ? (
            <>
              <Button onClick={handleSlackConnect} disabled={isOAuthPending}>
                {isOAuthPending ? '연동 중...' : '🔗 Slack 연동하기'}
              </Button>
              <span style={{ color: 'var(--azrael-gray-500)', fontSize: 'var(--text-sm)' }}>
                연동되지 않음
              </span>
            </>
          ) : (
            <>
              <div
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--azrael-success-light)',
                  border: '1px solid var(--azrael-success)',
                  borderRadius: '8px',
                  color: 'var(--azrael-success-dark)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--weight-semibold)',
                }}
              >
                ✅ Slack 연동됨 ({currentUserEmail})
              </div>
              <Button variant="ghost" onClick={handleSlackDisconnect}>
                연동 해제
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 2. 채널 매핑 섹션 (연동 완료 시만 표시) */}
      {hasToken && (
        <div style={{ marginTop: '2rem' }}>
          <h4 style={{ marginBottom: '1rem' }}>채널 매핑</h4>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ marginRight: '1rem', fontWeight: 500 }}>프로젝트 선택:</label>
            <select
              value={selectedProjectId}
              onChange={(e) => onSelectedProjectIdChange(e.target.value)}
              className="project-dropdown"
            >
              {projects?.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select
              value={selectedProject?.slackChannelId || ''}
              onChange={handleChannelChange}
              disabled={channelsLoading || !!channelsError}
              style={{ flex: 1, maxWidth: '400px' }}
            >
              <option value="">채널 선택 안 함</option>
              {channelData?.channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  #{ch.name} {ch.isPrivate ? '🔒' : ''}
                </option>
              ))}
            </select>

            {channelsLoading && (
              <span style={{ color: 'var(--azrael-gray-500)', fontSize: 'var(--text-sm)' }}>
                채널을 불러오는 중...
              </span>
            )}

            {channelsError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)' }}>
                  채널 목록을 불러오지 못했습니다.
                </span>
                <Button variant="ghost" onClick={() => refetchChannels()}>
                  다시 시도
                </Button>
              </div>
            )}
          </div>

          {channelData?.warning === 'PRIVATE_CHANNELS_UNAVAILABLE' && (
            <div
              style={{
                marginTop: '0.5rem',
                color: 'var(--color-warning)',
                fontSize: '0.85rem',
              }}
            >
              ⚠️ 비공개 채널 일부를 불러올 수 없습니다
            </div>
          )}
        </div>
      )}

      {/* 3. 메시지 템플릿 섹션 (연동 완료 시만 표시) */}
      {hasToken && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>메시지 템플릿</h4>
            <Button onClick={handleAddTemplate}>+ 새 템플릿 추가</Button>
          </div>

          <table className="stages-table" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>이름</th>
                <th>유형</th>
                <th>생성일</th>
                <th>편집</th>
                <th>삭제</th>
              </tr>
            </thead>
            <tbody>
              {templates
                ?.sort((a, b) => {
                  if (a.isBuiltIn !== b.isBuiltIn) return a.isBuiltIn ? -1 : 1;
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map(tmpl => (
                  <tr key={tmpl.id}>
                    <td>{tmpl.name}</td>
                    <td>{tmpl.isBuiltIn ? '기본 제공' : '사용자 정의'}</td>
                    <td>{new Date(tmpl.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td>
                      <button className="btn-icon" onClick={() => handleEditTemplate(tmpl)}>
                        ✎
                      </button>
                    </td>
                    <td>
                      {!tmpl.isBuiltIn && (
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => handleDeleteTemplate(tmpl)}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              {(!templates || templates.length === 0) && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--azrael-gray-500)' }}>
                    템플릿이 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 템플릿 편집 모달 */}
      {selectedProject && (
        <SlackTemplateEditModal
          isOpen={templateModalOpen}
          onClose={() => setTemplateModalOpen(false)}
          projectId={selectedProjectId}
          template={editingTemplate}
        />
      )}
    </div>
  );
}
