/**
 * Supabase React Query Hooks
 * 참조: docs/Supabase-Migration-Plan.md
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Project } from '../types';
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  duplicateProject,
} from '../lib/api/projects';
import {
  fetchTemplates,
  fetchTemplateByProjectId,
  createTemplate,
  deleteTemplate,
  saveTemplate,
} from '../lib/api/templates';
import {
  fetchHolidays,
  createHoliday,
  createHolidays,
  deleteHoliday,
  syncApiHolidays,
} from '../lib/api/holidays';
import {
  fetchCalculationResult,
  saveCalculationResult,
} from '../lib/api/calculations';
import { fetchJiraAssignees } from '../lib/api/jira';
import { formatDateLocal } from '../lib/businessDays';

// ============================================================
// Projects Hooks
// ============================================================

/**
 * 모든 프로젝트 조회
 * @param enabled - 쿼리 실행 여부 (기본값: true)
 */
export function useProjects(enabled = true) {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    staleTime: 5 * 60 * 1000, // 5분 캐시
    enabled, // 세션이 있을 때만 실행
  });
}

/**
 * 프로젝트 생성
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/**
 * 프로젝트 수정
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<Project, 'id'>> }) =>
      updateProject(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/**
 * 프로젝트 삭제
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

/**
 * 프로젝트 복제
 */
export function useDuplicateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: duplicateProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

// ============================================================
// Templates Hooks
// ============================================================

/**
 * 모든 템플릿 조회
 */
export function useTemplates(enabled = true) {
  return useQuery({
    queryKey: ['templates'],
    queryFn: fetchTemplates,
    staleTime: 5 * 60 * 1000, // 5분 캐시
    enabled,
  });
}

/**
 * 특정 프로젝트의 템플릿 조회
 */
export function useTemplateByProjectId(projectId: string) {
  return useQuery({
    queryKey: ['templates', projectId],
    queryFn: () => fetchTemplateByProjectId(projectId),
    staleTime: 5 * 60 * 1000,
    enabled: !!projectId, // projectId가 있을 때만 쿼리 실행
  });
}

/**
 * 템플릿 생성
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

/**
 * 템플릿 삭제
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

/**
 * 템플릿 전체 저장 (stages 포함)
 */
export function useSaveTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveTemplate,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['templates', variables.projectId] });
    },
  });
}

// ============================================================
// Holidays Hooks
// ============================================================

/**
 * 모든 공휴일 조회
 */
export function useHolidays(enabled = true) {
  return useQuery({
    queryKey: ['holidays'],
    queryFn: fetchHolidays,
    staleTime: 10 * 60 * 1000, // 10분 캐시
    enabled,
  });
}

/**
 * 공휴일 추가 (단일)
 */
export function useCreateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });
}

/**
 * 공휴일 일괄 추가
 */
export function useCreateHolidays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createHolidays,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });
}

/**
 * 공휴일 삭제
 */
export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });
}

/**
 * API 공휴일 동기화
 */
export function useSyncApiHolidays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncApiHolidays,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });
}

// ============================================================
// Calculation Results Hooks (Phase 1.7)
// ============================================================

/**
 * 계산 결과 조회
 * @param projectId 프로젝트 ID
 * @param updateDate 업데이트일
 * @param enabled 쿼리 실행 여부
 */
export function useCalculationResult(
  projectId: string,
  updateDate: Date | null,
  enabled = true
) {
  return useQuery({
    queryKey: ['calculation', projectId, updateDate ? formatDateLocal(updateDate) : null],
    queryFn: () => {
      if (!updateDate) return null;
      return fetchCalculationResult(projectId, updateDate);
    },
    staleTime: 1 * 60 * 1000, // 1분 캐시 (자주 변경될 수 있으므로)
    enabled: enabled && !!updateDate,
  });
}

/**
 * 계산 결과 저장
 */
export function useSaveCalculationResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ result, userEmail }: { result: any; userEmail: string }) =>
      saveCalculationResult(result, userEmail),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['calculation', variables.result.projectId],
      });
    },
  });
}

// ============================================================
// JIRA Assignees Hooks (Phase 1.7)
// ============================================================

/**
 * JIRA 담당자 목록 조회
 */
export function useJiraAssignees(enabled = true) {
  return useQuery({
    queryKey: ['jiraAssignees'],
    queryFn: fetchJiraAssignees,
    staleTime: 10 * 60 * 1000, // 10분 캐시 (자주 변경 안 됨)
    enabled,
  });
}
