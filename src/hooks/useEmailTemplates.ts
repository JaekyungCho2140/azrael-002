/**
 * Email Templates React Query Hooks
 * 프로젝트별 이메일 템플릿 CRUD 훅
 *
 * 참조: prd/Azrael-PRD-Phase2.md §4.4
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
} from '../lib/api/emailTemplates';

// ============================================================
// 조회
// ============================================================

/**
 * 프로젝트별 이메일 템플릿 목록 조회
 *
 * 정렬: built-in 먼저 → created_at DESC → name ASC (PRD §4.4, v2.7)
 *
 * @param projectId - 프로젝트 ID (undefined이면 쿼리 비활성화)
 */
export function useEmailTemplates(projectId: string | undefined) {
  return useQuery({
    queryKey: ['emailTemplates', projectId],
    queryFn: () => fetchEmailTemplates(projectId!),
    staleTime: 5 * 60 * 1000, // 5분 캐시
    enabled: !!projectId,
  });
}

// ============================================================
// 생성
// ============================================================

/**
 * 이메일 템플릿 생성
 *
 * 성공 시 해당 프로젝트의 템플릿 목록 캐시 무효화.
 */
export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: { name: string; subjectTemplate: string; bodyTemplate: string };
    }) => createEmailTemplate(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates', projectId] });
    },
  });
}

// ============================================================
// 수정
// ============================================================

/**
 * 이메일 템플릿 수정
 *
 * projectId는 캐시 무효화용으로만 사용 (API 호출에는 templateId만 필요).
 */
export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: string;
      data: { name?: string; subjectTemplate?: string; bodyTemplate?: string };
      projectId: string;
    }) => updateEmailTemplate(templateId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates', projectId] });
    },
  });
}

// ============================================================
// 삭제
// ============================================================

/**
 * 이메일 템플릿 삭제 (사용자 정의만 가능)
 *
 * projectId는 캐시 무효화용으로만 사용 (PRD v2.5).
 */
export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId }: { templateId: string; projectId: string }) =>
      deleteEmailTemplate(templateId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates', projectId] });
    },
  });
}
