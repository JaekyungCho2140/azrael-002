/**
 * Slack Message Templates React Query Hooks
 * 참조: prd/Azrael-PRD-Phase3.md §4.1, §6.5
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSlackTemplates,
  createSlackTemplate,
  updateSlackTemplate,
  deleteSlackTemplate,
} from '../lib/api/slack';

/**
 * 특정 프로젝트의 슬랙 메시지 템플릿 조회
 */
export function useSlackTemplates(projectId: string | undefined) {
  return useQuery({
    queryKey: ['slack-templates', projectId],
    queryFn: () => fetchSlackTemplates(projectId!),
    enabled: !!projectId, // projectId가 있을 때만 쿼리 실행
    staleTime: 5 * 60 * 1000, // 5분 캐시
  });
}

/**
 * 슬랙 메시지 템플릿 생성
 */
export function useCreateSlackTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSlackTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack-templates'] });
    },
  });
}

/**
 * 슬랙 메시지 템플릿 수정
 */
export function useUpdateSlackTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { name?: string; bodyTemplate?: string } }) =>
      updateSlackTemplate(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack-templates'] });
    },
  });
}

/**
 * 슬랙 메시지 템플릿 삭제
 */
export function useDeleteSlackTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSlackTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack-templates'] });
    },
  });
}
