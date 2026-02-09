/**
 * SlackSendModal
 * 슬랙 메시지 발신 모달 (600px)
 *
 * 구조:
 *   1. 테이블 선택 라디오 (T1/T2/T3, 기본 T2)
 *   2. 템플릿 선택 드롭다운
 *   3. 채널 선택 드롭다운 (프로젝트 기본 채널 자동 선택)
 *   4. 스레드 옵션 (체크박스 + thread_ts 입력)
 *   5. 미리보기 영역 (mrkdwn → HTML 렌더링)
 *   6. 하단 버튼: [취소] [슬랙에 발신]
 *
 * 참조: prd/Azrael-PRD-Phase3.md §4.2, §4.3
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from './Modal';
import { Button } from './Button';
import { useSlackTemplates } from '../hooks/useSlackTemplates';
import { fetchSlackChannels, sendSlackMessage } from '../lib/api/slack';
import { generateSlackMessage } from '../lib/slack/slackGenerator';
import { renderMrkdwnPreview, parseThreadTs } from '../lib/slack/formatter';
import type { SlackSendModalProps, TableType } from '../types';
import { TOAST_DURATION_MS } from '../constants';
import './SlackSendModal.css';

// ============================================================
// 상수
// ============================================================

const TABLE_OPTIONS: { value: TableType; label: string }[] = [
  { value: 'table1', label: '테이블 1 (내부 일정표)' },
  { value: 'table2', label: '테이블 2 (Ext. 외부용)' },
  { value: 'table3', label: '테이블 3 (Int. 내부용)' },
];

// ============================================================
// Component
// ============================================================

export function SlackSendModal({
  isOpen,
  onClose,
  project,
  calculationResult,
  currentUserId,
}: SlackSendModalProps) {
  // ─── 상태 ───
  const [selectedTable, setSelectedTable] = useState<TableType>('table2');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [isThreadReply, setIsThreadReply] = useState(false);
  const [threadTsInput, setThreadTsInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachImage, setAttachImage] = useState(false);
  const [sendingStatus, setSendingStatus] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const queryClient = useQueryClient();

  // ─── 데이터 조회 ───
  const { data: templates = [] } = useSlackTemplates(project.id);

  const {
    data: channelsData,
    isLoading: channelsLoading,
    error: channelsError,
    refetch: refetchChannels,
  } = useQuery({
    queryKey: ['slack-channels', currentUserId],
    queryFn: () => fetchSlackChannels(currentUserId),
    enabled: !!currentUserId && isOpen,
    staleTime: 2 * 60 * 1000, // 2분
  });

  // ─── 모달 열릴 때 초기화 ───
  useEffect(() => {
    if (!isOpen) return;

    setSelectedTable('table2');
    setSelectedTemplateId('');
    setSelectedChannelId('');
    setIsThreadReply(false);
    setThreadTsInput('');
    setAttachImage(false);
    setIsSending(false);
    setSendingStatus('');
    setToast(null);
  }, [isOpen]);

  // ─── 템플릿 초기화: 첫 번째 템플릿 자동 선택 ───
  useEffect(() => {
    if (!isOpen) return;

    if (templates && templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [isOpen, templates, selectedTemplateId]);

  // ─── 채널 초기화: 프로젝트 기본 채널 자동 선택 ───
  useEffect(() => {
    if (!isOpen) return;

    if (project.slackChannelId && !selectedChannelId) {
      setSelectedChannelId(project.slackChannelId);
    }
  }, [isOpen, project.slackChannelId, selectedChannelId]);

  // ─── 메시지 생성 (실시간 미리보기) ───
  const previewMessage = useMemo(() => {
    if (!selectedTemplateId) return '';
    const template = templates?.find((t) => t.id === selectedTemplateId);
    if (!template) return '';

    try {
      return generateSlackMessage(selectedTable, {
        calcResult: calculationResult,
        project,
        template,
      });
    } catch {
      return '미리보기 생성 실패';
    }
  }, [selectedTable, selectedTemplateId, templates, calculationResult, project]);

  const previewHtml = useMemo(() => {
    return renderMrkdwnPreview(previewMessage);
  }, [previewMessage]);

  // ─── 발신 핸들러 ───
  const handleSend = async () => {
    if (!selectedChannelId) {
      alert('채널을 선택해주세요.');
      return;
    }

    if (isThreadReply && !threadTsInput.trim()) {
      alert('메시지 링크 또는 thread_ts를 입력해주세요.');
      return;
    }

    setIsSending(true);

    let imageBlob: Blob | undefined;

    // 이미지 첨부 체크 시 캡처
    if (attachImage) {
      try {
        setSendingStatus('이미지 캡처 중...');

        // useImageCopy 패턴 참조: html2canvas 동적 import
        const html2canvas = (await import('html2canvas')).default;

        // 선택된 테이블 요소 찾기 (ScheduleTable.tsx: id={`table-${type}`})
        const tableElementId = `table-${selectedTable}`;
        const tableElement = document.getElementById(tableElementId);
        if (!tableElement) {
          alert('테이블을 찾을 수 없습니다.');
          setIsSending(false);
          setSendingStatus('');
          return;
        }

        // 스크롤 처리 - overflow를 visible로 임시 전환
        const originalOverflow = tableElement.style.overflow;
        tableElement.style.overflow = 'visible';

        // 캔버스 생성
        const canvas = await html2canvas(tableElement, {
          backgroundColor: '#ffffff',
          scale: 2, // 고해상도
          useCORS: true,
          logging: false,
        });

        // 원래 overflow 복원
        tableElement.style.overflow = originalOverflow;

        // Blob 변환
        imageBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('이미지 생성 실패'));
          }, 'image/png');
        });
      } catch (err) {
        console.error('이미지 캡처 실패:', err);
        alert('이미지 캡처에 실패했습니다.');
        setIsSending(false);
        setSendingStatus('');
        return;
      }
    }

    // API 호출 (기존 로직 + imageBlob 전달)
    try {
      setSendingStatus(attachImage ? '발신 중 (이미지 포함)...' : '발신 중...');
      const threadTs = isThreadReply ? parseThreadTs(threadTsInput) : undefined;

      const response = await sendSlackMessage({
        channelId: selectedChannelId,
        message: previewMessage,
        userId: currentUserId,
        threadTs: threadTs || undefined,
        imageBlob,
      });

      if (response.success) {
        const channelName =
          channelsData?.channels?.find((ch) => ch.id === selectedChannelId)?.name || '채널';
        setToast({ message: `#${channelName}에 발신되었습니다`, type: 'success' });
        // 성공 후 2초 뒤 모달 자동 닫기
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        // 에러 처리 (§7.1)
        if (response.errorCode === 'TOKEN_INVALID') {
          alert(response.error || 'Slack 연동이 해제되었습니다.');
          queryClient.invalidateQueries({ queryKey: ['slack-token-status'] });
          onClose(); // 모달 닫고 설정으로 리다이렉트 (사용자가 수동으로)
        } else if (response.errorCode === 'CHANNEL_NOT_FOUND') {
          alert(response.error || '채널을 찾을 수 없습니다.');
          queryClient.invalidateQueries({ queryKey: ['slack-channels', currentUserId] });
        } else {
          alert(response.error || '슬랙 발신에 실패했습니다.');
        }
      }
    } catch (error) {
      alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSending(false);
      setSendingStatus('');
    }
  };

  // ─── 토스트 자동 해제 ───
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ─── 렌더링 ───
  const canSend =
    selectedChannelId && selectedTemplateId && (!isThreadReply || threadTsInput.trim());

  const footer = (
    <div className="slack-modal-footer">
      <Button variant="secondary" onClick={onClose} disabled={isSending}>
        취소
      </Button>
      <Button onClick={handleSend} disabled={!canSend || isSending}>
        {isSending ? (sendingStatus || '발신 중...') : '슬랙에 발신'}
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="슬랙 발신" maxWidth="600px" footer={footer}>
      <div className="slack-send-content">
        {/* 테이블 선택 */}
        <div className="slack-section">
          <div className="slack-section-label">테이블 선택</div>
          <div className="slack-table-radios">
            {TABLE_OPTIONS.map((opt) => (
              <label key={opt.value} className="slack-table-radio">
                <input
                  type="radio"
                  name="tableType"
                  value={opt.value}
                  checked={selectedTable === opt.value}
                  onChange={() => setSelectedTable(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 템플릿 선택 */}
        <div className="slack-section">
          <div className="slack-section-label">템플릿 선택</div>
          <select
            className="slack-dropdown"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
          >
            {templates.length === 0 && <option value="">템플릿이 없습니다</option>}
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* 채널 선택 */}
        <div className="slack-section">
          <div className="slack-section-label">채널 선택</div>
          {channelsLoading && <div className="slack-loading">채널을 불러오는 중...</div>}
          {channelsError && (
            <div className="slack-error">
              채널 목록을 불러오지 못했습니다.{' '}
              <button
                type="button"
                className="slack-retry-btn"
                onClick={() => refetchChannels()}
              >
                다시 시도
              </button>
            </div>
          )}
          {!channelsLoading && !channelsError && channelsData && (
            <>
              <select
                className="slack-dropdown"
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
              >
                <option value="">
                  {channelsData.channels.length === 0
                    ? '설정에서 기본 채널을 선택해주세요'
                    : '채널을 선택해주세요'}
                </option>
                {channelsData.channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    #{ch.name}
                    {ch.isPrivate ? ' 🔒' : ''}
                  </option>
                ))}
              </select>
              {channelsData.warning === 'PRIVATE_CHANNELS_UNAVAILABLE' && (
                <div className="slack-warning">⚠️ 비공개 채널 일부를 불러올 수 없습니다</div>
              )}
            </>
          )}
        </div>

        {/* 스레드 옵션 */}
        <div className="slack-section">
          <label className="slack-thread-checkbox">
            <input
              type="checkbox"
              checked={isThreadReply}
              onChange={(e) => setIsThreadReply(e.target.checked)}
            />
            <span>스레드 리플라이로 발신</span>
          </label>
          {isThreadReply && (
            <input
              type="text"
              className="slack-thread-input"
              placeholder="메시지 링크 또는 thread_ts 입력"
              value={threadTsInput}
              onChange={(e) => setThreadTsInput(e.target.value)}
            />
          )}

          {/* 테이블 이미지 첨부 */}
          <div style={{ marginTop: '0.5rem' }}>
            <label className="slack-thread-checkbox">
              <input
                type="checkbox"
                checked={attachImage}
                onChange={(e) => setAttachImage(e.target.checked)}
              />
              <span>테이블 이미지 첨부</span>
            </label>
            <div style={{ color: 'var(--azrael-gray-500)', fontSize: '0.85rem', marginLeft: '1.5rem' }}>
              선택한 테이블을 이미지로 캡처하여 함께 전송합니다
            </div>
          </div>
        </div>

        {/* 미리보기 */}
        <div className="slack-section">
          <div className="slack-section-label">미리보기</div>
          <div
            className="slack-preview"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>

        {/* 인라인 토스트 */}
        {toast && (
          <div className={`slack-toast slack-toast-${toast.type}`}>
            {toast.type === 'success' ? '✓' : '✕'} {toast.message}
          </div>
        )}
      </div>
    </Modal>
  );
}

// Default export for lazy loading
export default SlackSendModal;
