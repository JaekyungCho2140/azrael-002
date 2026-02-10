/**
 * LocalStorage Utility Functions
 * 참조: prd/Azrael-PRD-Shared.md §5 LocalStorage 스키마
 *
 * Note: Supabase 마이그레이션 후 대부분의 데이터는 Supabase에서 관리됩니다.
 * 이 파일은 UserState(개인 설정)와 초기화 로직만 담당합니다.
 */

import {
  Holiday,
  UserState,
  STORAGE_KEYS,
  DEFAULT_PROJECTS
} from '../types';

/**
 * 초기 데이터 생성
 * 참조: Azrael-PRD-Shared.md §5.3
 *
 * 테스트용 기본 템플릿 추가 (실제로는 사용자가 설정에서 추가)
 */
export function initializeDefaultData(): void {
  if (!localStorage.getItem(STORAGE_KEYS.PROJECTS)) {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(DEFAULT_PROJECTS));

    // 테스트용 기본 템플릿 (M4/GL 예시)
    const defaultTemplates = [
      {
        id: 'template_M4_GL',
        projectId: 'M4_GL',
        stages: [
          { id: 'stage_m4_1', name: '정기', startOffsetDays: 13, endOffsetDays: 10, startTime: '09:00', endTime: '18:00', order: 0, depth: 0, tableTargets: ['table1', 'table2', 'table3'], description: '', assignee: '', jiraDescription: '', jiraAssigneeId: null },
          { id: 'stage_m4_2', name: '1차', startOffsetDays: 7, endOffsetDays: 5, startTime: '09:00', endTime: '18:00', order: 1, depth: 0, tableTargets: ['table1', 'table2', 'table3'], description: '', assignee: '', jiraDescription: '', jiraAssigneeId: null },
          { id: 'stage_m4_3', name: '2차', startOffsetDays: 4, endOffsetDays: 2, startTime: '09:00', endTime: '18:00', order: 2, depth: 0, tableTargets: ['table1', 'table2', 'table3'], description: '', assignee: '', jiraDescription: '', jiraAssigneeId: null }
        ]
      },
      {
        id: 'template_MONTHLY',
        projectId: 'MONTHLY',
        stages: [
          { id: 'stage_monthly_1', name: '마감', startOffsetDays: 7, endOffsetDays: 5, startTime: '09:00', endTime: '18:00', order: 0, depth: 0, tableTargets: ['table1', 'table2', 'table3'], description: '', assignee: '', jiraDescription: '', jiraAssigneeId: null },
          { id: 'stage_monthly_2', name: '검토', startOffsetDays: 5, endOffsetDays: 3, startTime: '09:00', endTime: '18:00', order: 1, depth: 0, tableTargets: ['table1', 'table2', 'table3'], description: '', assignee: '', jiraDescription: '', jiraAssigneeId: null },
          { id: 'stage_monthly_3', name: '정산', startOffsetDays: 3, endOffsetDays: 1, startTime: '09:00', endTime: '18:00', order: 2, depth: 0, tableTargets: ['table1', 'table2', 'table3'], description: '', assignee: '', jiraDescription: '', jiraAssigneeId: null }
        ]
      }
    ];

    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(defaultTemplates));
    localStorage.setItem(STORAGE_KEYS.HOLIDAYS, JSON.stringify([]));
  }
}

/**
 * Holidays (공휴일)
 * MainScreen에서 계산 시 사용
 */
export function loadHolidays(): Holiday[] {
  const json = localStorage.getItem(STORAGE_KEYS.HOLIDAYS);
  if (!json) return [];

  const holidays = JSON.parse(json);
  holidays.forEach((h: Holiday) => h.date = new Date(h.date));
  return holidays;
}

/**
 * UserState (사용자 상태)
 * LocalStorage에 저장되는 개인 설정
 */
export function getUserState(): UserState | null {
  const json = localStorage.getItem(STORAGE_KEYS.USER_STATE);
  if (!json) return null;
  return JSON.parse(json);
}

export function saveUserState(state: UserState): void {
  localStorage.setItem(STORAGE_KEYS.USER_STATE, JSON.stringify(state));
}

/**
 * 프로젝트별 마지막 계산 날짜 저장 (자동 복원용)
 * @param projectId 프로젝트 ID
 * @param updateDate ISO 날짜 문자열 "YYYY-MM-DD"
 */
export function saveLastCalculationDate(projectId: string, updateDate: string): void {
  const state = getUserState();
  if (!state) return;
  saveUserState({
    ...state,
    lastCalculationDates: {
      ...(state.lastCalculationDates || {}),
      [projectId]: updateDate,
    },
  });
}

/**
 * 프로젝트별 마지막 계산 날짜 조회
 * @param projectId 프로젝트 ID
 * @returns ISO 날짜 문자열 "YYYY-MM-DD" 또는 null
 */
export function getLastCalculationDate(projectId: string): string | null {
  const state = getUserState();
  return state?.lastCalculationDates?.[projectId] || null;
}
