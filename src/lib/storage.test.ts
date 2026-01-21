/**
 * LocalStorage Tests
 * 참조: prd/Azrael-PRD-Shared.md §5.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadHolidays,
  getUserState,
  saveUserState,
  initializeDefaultData
} from './storage';
import { Holiday, UserState, STORAGE_KEYS } from '../types';

beforeEach(() => {
  localStorage.clear();
});

describe('initializeDefaultData', () => {
  it('localStorage가 비어있을 때 기본 데이터 생성', () => {
    initializeDefaultData();

    expect(localStorage.getItem(STORAGE_KEYS.PROJECTS)).not.toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.TEMPLATES)).not.toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.HOLIDAYS)).not.toBeNull();
  });

  it('이미 데이터가 있으면 덮어쓰지 않음', () => {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify([{ id: 'TEST' }]));

    initializeDefaultData();

    const projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS)!);
    expect(projects.length).toBe(1);
    expect(projects[0].id).toBe('TEST');
  });
});

describe('UserState 저장 및 로드', () => {
  it('UserState가 올바르게 저장/로드됨', () => {
    const state: UserState = {
      email: 'test@example.com',
      lastProjectId: 'M4_GL',
      hasCompletedOnboarding: true
    };

    saveUserState(state);
    const loaded = getUserState();

    expect(loaded).not.toBeNull();
    expect(loaded!.email).toBe('test@example.com');
    expect(loaded!.lastProjectId).toBe('M4_GL');
    expect(loaded!.hasCompletedOnboarding).toBe(true);
  });

  it('UserState가 없으면 null 반환', () => {
    const loaded = getUserState();
    expect(loaded).toBeNull();
  });
});

describe('Holiday 로드', () => {
  it('Holiday 배열 Date 필드가 올바르게 역직렬화됨', () => {
    const holidays: Holiday[] = [
      { date: new Date(2026, 0, 1), name: '신정', isManual: false },
      { date: new Date(2026, 0, 28), name: '설날', isManual: false },
      { date: new Date(2026, 4, 1), name: '근로자의 날', isManual: true }
    ];

    // 직접 localStorage에 저장 (saveHolidays는 삭제됨)
    localStorage.setItem(STORAGE_KEYS.HOLIDAYS, JSON.stringify(holidays));

    const loaded = loadHolidays();

    expect(loaded.length).toBe(3);
    expect(loaded[0].date).toBeInstanceOf(Date);
    expect(loaded[0].name).toBe('신정');
    expect(loaded[0].isManual).toBe(false);
    expect(loaded[2].isManual).toBe(true);
  });

  it('Holiday가 없으면 빈 배열 반환', () => {
    const loaded = loadHolidays();
    expect(loaded).toEqual([]);
  });
});
