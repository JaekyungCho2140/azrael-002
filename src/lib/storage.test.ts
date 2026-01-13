/**
 * LocalStorage Tests
 * 참조: prd/Azrael-PRD-Shared.md §5.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveCalculationResult,
  loadCalculationResult,
  saveHolidays,
  loadHolidays
} from './storage';
import { CalculationResult, Holiday, ScheduleEntry } from '../types';

beforeEach(() => {
  localStorage.clear();
});

describe('CalculationResult 저장 및 로드', () => {
  it('Date 필드가 올바르게 직렬화/역직렬화됨', () => {
    const entry: ScheduleEntry = {
      id: 'entry1',
      index: 1,
      stageId: 'stage1',
      stageName: '정기',
      startDateTime: new Date(2026, 0, 28, 9, 0),
      endDateTime: new Date(2026, 1, 1, 18, 0),
      description: '테스트 설명',
      assignee: '담당자',
      isManualEdit: false
    };

    const result: CalculationResult = {
      projectId: 'M4_GL',
      updateDate: new Date(2026, 1, 10),
      headsUpDate: new Date(2026, 0, 27),
      table1Entries: [entry],
      table2Entries: [],
      table3Entries: [],
      calculatedAt: new Date()
    };

    // 저장
    saveCalculationResult(result);

    // 로드
    const loaded = loadCalculationResult('M4_GL');

    expect(loaded).not.toBeNull();
    expect(loaded!.updateDate).toBeInstanceOf(Date);
    expect(loaded!.headsUpDate).toBeInstanceOf(Date);
    expect(loaded!.table1Entries[0].startDateTime).toBeInstanceOf(Date);
    expect(loaded!.table1Entries[0].endDateTime).toBeInstanceOf(Date);

    // 값 검증
    expect(loaded!.updateDate.getTime()).toBe(result.updateDate.getTime());
    expect(loaded!.table1Entries[0].stageName).toBe('정기');
  });

  it('하위 일감 포함 ScheduleEntry 저장 및 로드', () => {
    const child: ScheduleEntry = {
      id: 'child1',
      index: 1.1,
      stageId: 'stage_child',
      stageName: '번역',
      startDateTime: new Date(2026, 0, 28, 9, 0),
      endDateTime: new Date(2026, 0, 28, 12, 0),
      description: '번역 작업',
      parentId: 'parent1',
      isManualEdit: false
    };

    const parent: ScheduleEntry = {
      id: 'parent1',
      index: 1,
      stageId: 'stage1',
      stageName: 'REGULAR',
      startDateTime: new Date(2026, 0, 28, 9, 0),
      endDateTime: new Date(2026, 1, 1, 18, 0),
      description: '부모 작업',
      children: [child],
      isManualEdit: false
    };

    const result: CalculationResult = {
      projectId: 'TEST',
      updateDate: new Date(2026, 1, 10),
      headsUpDate: new Date(2026, 0, 27),
      table1Entries: [],
      table2Entries: [parent],
      table3Entries: [],
      calculatedAt: new Date()
    };

    saveCalculationResult(result);
    const loaded = loadCalculationResult('TEST');

    expect(loaded).not.toBeNull();
    expect(loaded!.table2Entries[0].children).toBeDefined();
    expect(loaded!.table2Entries[0].children!.length).toBe(1);
    expect(loaded!.table2Entries[0].children![0].stageName).toBe('번역');
    expect(loaded!.table2Entries[0].children![0].startDateTime).toBeInstanceOf(Date);
  });
});

describe('Holiday 저장 및 로드', () => {
  it('Holiday 배열 Date 필드가 올바르게 직렬화/역직렬화됨', () => {
    const holidays: Holiday[] = [
      { date: new Date(2026, 0, 1), name: '신정', isManual: false },
      { date: new Date(2026, 0, 28), name: '설날', isManual: false },
      { date: new Date(2026, 4, 1), name: '근로자의 날', isManual: true }
    ];

    saveHolidays(holidays);
    const loaded = loadHolidays();

    expect(loaded.length).toBe(3);
    expect(loaded[0].date).toBeInstanceOf(Date);
    expect(loaded[0].name).toBe('신정');
    expect(loaded[0].isManual).toBe(false);
    expect(loaded[2].isManual).toBe(true);
  });
});
