/**
 * Slack Token Status React Query Hook
 * 참조: prd/Azrael-PRD-Phase3.md §4.1
 */

import { useQuery } from '@tanstack/react-query';
import { checkSlackTokenStatus } from '../lib/api/slack';

/**
 * Slack 토큰 존재 여부 조회
 * @param userId Supabase user ID
 * @returns boolean (토큰 존재 여부)
 */
export function useSlackTokenStatus(userId: string | undefined) {
  return useQuery({
    queryKey: ['slack-token-status', userId],
    queryFn: () => checkSlackTokenStatus(userId!),
    enabled: !!userId, // userId가 undefined/빈문자열이면 쿼리 비활성화
    staleTime: 5 * 60 * 1000, // 5분 캐시
  });
}
