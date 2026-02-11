/**
 * 몰아보기 슬롯 React Query 훅
 * 참조: prd/Azrael-PRD-Phase4.md §4.5
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPresetSlots,
  savePresetSlot,
  updatePresetSlot,
  deletePresetSlot,
} from '../lib/api/presets';
import { fetchCalculationResultById } from '../lib/api/calculations';
import type { PresetSlotWithData } from '../types';

/** 캐시 무효화용 공통 쿼리 키 */
const PRESETS_QUERY_KEY = 'presetSlotsWithData';

/**
 * 몰아보기 슬롯 + 계산 결과 전체 조회
 * fetchPresetSlots → fetchCalculationResultById 를 단일 쿼리로 실행하여
 * 클로저 의존성 race condition 제거
 */
export function usePresetSlotsWithData(projectId: string) {
  return useQuery({
    queryKey: [PRESETS_QUERY_KEY, projectId],
    queryFn: async (): Promise<PresetSlotWithData[]> => {
      const presets = await fetchPresetSlots(projectId);
      if (!presets.length) return [];

      const results = await Promise.all(
        presets.map(async (preset) => ({
          ...preset,
          calculationResult: await fetchCalculationResultById(preset.calculationId),
        }))
      );

      return results;
    },
    staleTime: 30_000, // 30초 캐시
  });
}

/**
 * 몰아보기 저장 mutation
 */
export function useSavePresetSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: savePresetSlot,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PRESETS_QUERY_KEY, variables.projectId] });
    },
  });
}

/**
 * 몰아보기 업데이트 mutation (이름, visible_table)
 */
export function useUpdatePresetSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePresetSlot,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PRESETS_QUERY_KEY, variables.projectId] });
    },
  });
}

/**
 * 몰아보기 삭제 mutation
 */
export function useDeletePresetSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePresetSlot,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PRESETS_QUERY_KEY, variables.projectId] });
    },
  });
}
