/**
 * Business Days Calculation Tests
 * 참조: prd/Azrael-PRD-Shared.md §3.1
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBusinessDate,
  calculateDateTimeFromStage,
  formatTableDate,
  formatUpdateDate,
  formatTime
} from './businessDays';
import { Holiday, WorkStage } from '../types';

describe('calculateBusinessDate', () => {
  const holidays: Holiday[] = [
    { date: new Date(2026, 0, 1), name: '신정', isManual: false }, // 2026-01-01 (목)
    { date: new Date(2026, 0, 28), name: '설날', isManual: false }, // 2026-01-28 (수)
    { date: new Date(2026, 0, 29), name: '설날', isManual: false }, // 2026-01-29 (목)
    { date: new Date(2026, 0, 30), name: '설날', isManual: false }  // 2026-01-30 (금)
  ];

  it('Offset=0: 업데이트일 그대로 반환', () => {
    const updateDate = new Date(2026, 1, 10); // 2026-02-10 (화)
    const result = calculateBusinessDate(updateDate, 0, holidays);

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(1); // 2월 (0-based)
    expect(result.getDate()).toBe(10);
  });

  it('양수 Offset: 과거 날짜 계산 (10 영업일 전)', () => {
    const updateDate = new Date(2026, 1, 10); // 2026-02-10 (화)
    const result = calculateBusinessDate(updateDate, 10, holidays);

    // 10 영업일 전 계산:
    // 2월 10(화) -> 9(월)[1] -> 6(금)[2] -> 5(목)[3] -> 4(수)[4] -> 3(화)[5] -> 2(월)[6]
    // -> 1월 30(금,설날X) -> 29(목,설날X) -> 28(수,설날X) -> 27(화)[7] -> 26(월)[8]
    // -> 23(금)[9] (주말X) -> 22(목)[10] = 최종 결과
    expect(result.getMonth()).toBe(0); // 1월
    expect(result.getDate()).toBe(22);
  });

  it('음수 Offset: 미래 날짜 계산 (-5 영업일 후)', () => {
    const updateDate = new Date(2026, 1, 10); // 2026-02-10 (화)
    const result = calculateBusinessDate(updateDate, -5, holidays);

    // 5 영업일 후 = 2026-02-17 (화)
    // 2월 10일 -> 11일(수) -> 12일(목) -> 13일(금) -> 16일(월) -> 17일(화)
    expect(result.getMonth()).toBe(1); // 2월
    expect(result.getDate()).toBe(17);
  });

  it('주말 건너뛰기', () => {
    const updateDate = new Date(2026, 1, 9); // 2026-02-09 (월)
    const result = calculateBusinessDate(updateDate, 1, []);

    // 1 영업일 전 = 2026-02-06 (금) - 주말 건너뜀
    expect(result.getDate()).toBe(6);
    expect(result.getDay()).toBe(5); // 금요일
  });

  it('공휴일 건너뛰기', () => {
    const updateDate = new Date(2026, 1, 2); // 2026-02-02 (월)
    const result = calculateBusinessDate(updateDate, 3, holidays);

    // 3 영업일 전 계산:
    // 2월 2(월) -> 1월 30(금,설날X) -> 29(목,설날X) -> 28(수,설날X) -> 27(화)[1]
    // -> 26(월)[2] -> 23(금)[3] (주말X) = 최종 결과
    expect(result.getMonth()).toBe(0); // 1월
    expect(result.getDate()).toBe(23);
  });
});

describe('calculateDateTimeFromStage', () => {
  const holidays: Holiday[] = [];

  it('WorkStage로부터 시작/종료일시 계산', () => {
    const updateDate = new Date(2026, 1, 10); // 2026-02-10 (화)
    const stage: WorkStage = {
      id: 'stage1',
      name: '정기',
      startOffsetDays: 13,
      endOffsetDays: 10,
      startTime: '09:00',
      endTime: '18:00',
      order: 1,
      depth: 0,
      tableTargets: ['table1']
    };

    const result = calculateDateTimeFromStage(updateDate, stage, holidays);

    // 10 영업일 전 = 2026-01-27 (화)
    expect(result.startDateTime.getMonth()).toBe(0); // 1월
    expect(result.startDateTime.getDate()).toBe(27);
    expect(result.startDateTime.getHours()).toBe(9);
    expect(result.startDateTime.getMinutes()).toBe(0);

    expect(result.endDateTime.getHours()).toBe(18);
    expect(result.endDateTime.getMinutes()).toBe(0);
  });
});

describe('formatTableDate', () => {
  it('MM/DD(요일) HH:MM 형식 변환', () => {
    const date = new Date(2026, 0, 28, 9, 0); // 2026-01-28 (수) 09:00
    const result = formatTableDate(date);

    expect(result).toBe('01/28(수) 09:00');
  });

  it('시각이 한 자리일 때 0 패딩', () => {
    const date = new Date(2026, 0, 5, 9, 5); // 2026-01-05 (월) 09:05
    const result = formatTableDate(date);

    expect(result).toBe('01/05(월) 09:05');
  });
});

describe('formatUpdateDate', () => {
  it('YYYY-MM-DD (요일) 형식 변환', () => {
    const date = new Date(2026, 1, 10); // 2026-02-10 (화)
    const result = formatUpdateDate(date);

    expect(result).toBe('2026-02-10 (화)');
  });

  it('월과 일이 한 자리일 때 0 패딩', () => {
    const date = new Date(2026, 0, 5); // 2026-01-05 (월)
    const result = formatUpdateDate(date);

    expect(result).toBe('2026-01-05 (월)');
  });
});

describe('formatTime', () => {
  it('HH:MM 형식 변환', () => {
    const date = new Date(2026, 0, 28, 9, 30);
    const result = formatTime(date);

    expect(result).toBe('09:30');
  });

  it('시각이 한 자리일 때 0 패딩', () => {
    const date = new Date(2026, 0, 28, 9, 5);
    const result = formatTime(date);

    expect(result).toBe('09:05');
  });
});
