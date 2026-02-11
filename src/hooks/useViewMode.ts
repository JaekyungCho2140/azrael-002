/**
 * ViewMode 상태 관리 훅 (프로젝트별)
 * 참조: prd/Azrael-PRD-Phase4.md §4.4
 */

import { useState, useEffect } from 'react';
import { ViewMode } from '../types';
import { getUserState, saveUserState } from '../lib/storage';

export function useViewMode(projectId: string) {
  // LocalStorage에서 프로젝트별 ViewMode 복원
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const userState = getUserState();
    const viewModeByProject = userState?.viewModeByProject ?? {};
    return viewModeByProject[projectId] ?? { type: 'single' };
  });

  // projectId 변경 시 항상 single 모드로 리셋
  // 이유: 새 프로젝트에 계산 결과가 없을 수 있어 빈 4분할 화면 방지
  useEffect(() => {
    setViewModeState({ type: 'single' });
  }, [projectId]);

  // ViewMode 변경 (프로젝트별 저장)
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);

    const userState = getUserState();
    if (userState) {
      const viewModeByProject = userState.viewModeByProject ?? {};
      saveUserState({
        ...userState,
        viewModeByProject: {
          ...viewModeByProject,
          [projectId]: mode,
        },
      });
    }
  };

  return { viewMode, setViewMode };
}
