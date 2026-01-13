/**
 * LocalStorage Utility Functions
 * 참조: prd/Azrael-PRD-Shared.md §5 LocalStorage 스키마
 */

import {
  Project,
  WorkTemplate,
  Holiday,
  UserState,
  CalculationResult,
  ScheduleEntry,
  STORAGE_KEYS,
  DEFAULT_PROJECTS
} from '../types';

/**
 * Date 필드 복원 함수
 * 참조: Azrael-PRD-Shared.md §5.1
 */
function reviveEntries(entries: ScheduleEntry[]): void {
  entries.forEach(entry => {
    entry.startDateTime = new Date(entry.startDateTime);
    entry.endDateTime = new Date(entry.endDateTime);
    if (entry.children) {
      reviveEntries(entry.children);
    }
  });
}

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
    const defaultTemplates: WorkTemplate[] = [
      {
        id: 'template_M4_GL',
        projectId: 'M4_GL',
        stages: [
          { id: 'stage_m4_1', name: '정기', startOffsetDays: 13, endOffsetDays: 10, startTime: '09:00', endTime: '18:00', order: 0, depth: 0, tableTargets: ['table1', 'table2', 'table3'] },
          { id: 'stage_m4_2', name: '1차', startOffsetDays: 7, endOffsetDays: 5, startTime: '09:00', endTime: '18:00', order: 1, depth: 0, tableTargets: ['table1', 'table2', 'table3'] },
          { id: 'stage_m4_3', name: '2차', startOffsetDays: 4, endOffsetDays: 2, startTime: '09:00', endTime: '18:00', order: 2, depth: 0, tableTargets: ['table1', 'table2', 'table3'] }
        ]
      },
      {
        id: 'template_MONTHLY',
        projectId: 'MONTHLY',
        stages: [
          { id: 'stage_monthly_1', name: '마감', startOffsetDays: 7, endOffsetDays: 5, startTime: '09:00', endTime: '18:00', order: 0, depth: 0, tableTargets: ['table1', 'table2', 'table3'] },
          { id: 'stage_monthly_2', name: '검토', startOffsetDays: 5, endOffsetDays: 3, startTime: '09:00', endTime: '18:00', order: 1, depth: 0, tableTargets: ['table1', 'table2', 'table3'] },
          { id: 'stage_monthly_3', name: '정산', startOffsetDays: 3, endOffsetDays: 1, startTime: '09:00', endTime: '18:00', order: 2, depth: 0, tableTargets: ['table1', 'table2', 'table3'] }
        ]
      }
    ];

    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(defaultTemplates));
    localStorage.setItem(STORAGE_KEYS.HOLIDAYS, JSON.stringify([]));
  }
}

/**
 * Projects
 */
export function getProjects(): Project[] {
  const json = localStorage.getItem(STORAGE_KEYS.PROJECTS);
  if (!json) return [];
  return JSON.parse(json);
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
}

/**
 * WorkTemplates
 */
export function getTemplates(): WorkTemplate[] {
  const json = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
  if (!json) return [];
  return JSON.parse(json);
}

export function saveTemplates(templates: WorkTemplate[]): void {
  localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
}

/**
 * Holidays
 */
export function loadHolidays(): Holiday[] {
  const json = localStorage.getItem(STORAGE_KEYS.HOLIDAYS);
  if (!json) return [];

  const holidays = JSON.parse(json);
  holidays.forEach((h: Holiday) => h.date = new Date(h.date));
  return holidays;
}

export function saveHolidays(holidays: Holiday[]): void {
  localStorage.setItem(STORAGE_KEYS.HOLIDAYS, JSON.stringify(holidays));
}

/**
 * CalculationResult
 */
export function loadCalculationResult(projectId: string): CalculationResult | null {
  const json = localStorage.getItem(STORAGE_KEYS.CALCULATION(projectId));
  if (!json) return null;

  const result = JSON.parse(json);

  // Date 필드 복원
  result.updateDate = new Date(result.updateDate);
  result.headsUpDate = new Date(result.headsUpDate);
  if (result.iosReviewDate) result.iosReviewDate = new Date(result.iosReviewDate);
  result.calculatedAt = new Date(result.calculatedAt);

  // ScheduleEntry의 Date 필드 복원
  reviveEntries(result.table1Entries);
  reviveEntries(result.table2Entries);
  reviveEntries(result.table3Entries);

  return result;
}

export function saveCalculationResult(result: CalculationResult): void {
  localStorage.setItem(
    STORAGE_KEYS.CALCULATION(result.projectId),
    JSON.stringify(result)
  );
}

/**
 * UserState
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
 * 프로젝트 삭제
 * 참조: Azrael-PRD-Shared.md §7.5
 */
export function deleteProject(projectId: string): void {
  // 1. Projects 배열에서 제거
  const projects = getProjects();
  const filtered = projects.filter(p => p.id !== projectId);
  saveProjects(filtered);

  // 2. Templates 배열에서 제거
  const templates = getTemplates();
  const filteredTemplates = templates.filter(t => t.projectId !== projectId);
  saveTemplates(filteredTemplates);

  // 3. CalculationResult 키 삭제
  localStorage.removeItem(STORAGE_KEYS.CALCULATION(projectId));

  // 4. UserState.lastProjectId 업데이트
  const userState = getUserState();
  if (userState && userState.lastProjectId === projectId) {
    if (filtered.length > 0) {
      userState.lastProjectId = filtered[0].id;
      saveUserState(userState);
    }
  }
}
