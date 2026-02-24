/**
 * Holidays API (Supabase)
 * 참조: docs/Supabase-Migration-Plan.md
 */

import { supabase, getCurrentUserEmail } from '../supabase';
import type { Holiday } from '../../types';

/**
 * Supabase Row → TypeScript Holiday 타입 매핑
 */
function mapToHoliday(row: any): Holiday {
  return {
    date: new Date(row.date),
    name: row.name,
    isManual: row.is_manual,
  };
}

/**
 * 모든 공휴일 조회
 */
export async function fetchHolidays(): Promise<Holiday[]> {
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .order('date');

  if (error) {
    console.error('Failed to fetch holidays:', error);
    throw new Error(`공휴일 조회 실패: ${error.message}`);
  }

  return data.map(mapToHoliday);
}

/**
 * 공휴일 추가 (단일)
 */
export async function createHoliday(holiday: Holiday): Promise<void> {
  const userEmail = await getCurrentUserEmail();

  const { error } = await supabase.from('holidays').insert({
    date: holiday.date.toISOString().split('T')[0], // YYYY-MM-DD
    name: holiday.name,
    is_manual: holiday.isManual,
    created_by: holiday.isManual ? userEmail : null,
  });

  if (error) {
    console.error('Failed to create holiday:', error);
    throw new Error(`공휴일 추가 실패: ${error.message}`);
  }
}

/**
 * 공휴일 일괄 추가
 */
export async function createHolidays(holidays: Holiday[]): Promise<void> {
  const userEmail = await getCurrentUserEmail();

  const { error } = await supabase.from('holidays').insert(
    holidays.map((holiday) => ({
      date: holiday.date.toISOString().split('T')[0],
      name: holiday.name,
      is_manual: holiday.isManual,
      created_by: holiday.isManual ? userEmail : null,
    }))
  );

  if (error) {
    console.error('Failed to create holidays:', error);
    throw new Error(`공휴일 일괄 추가 실패: ${error.message}`);
  }
}

/**
 * 공휴일 삭제
 */
export async function deleteHoliday(date: Date): Promise<void> {
  const dateStr = date.toISOString().split('T')[0];

  const { error } = await supabase.from('holidays').delete().eq('date', dateStr);

  if (error) {
    console.error('Failed to delete holiday:', error);
    throw new Error(`공휴일 삭제 실패: ${error.message}`);
  }
}

/**
 * API 공휴일 동기화
 * 해당 연도의 API 공휴일(isManual=false)만 삭제하고 새로운 API 데이터 삽입
 * 수동 공휴일(isManual=true)은 유지하며, 날짜가 겹치는 API 공휴일은 건너뜀
 */
export async function syncApiHolidays(targetYear: number, apiHolidays: Holiday[]): Promise<void> {
  // 0. 빈 응답 방어 (삭제 전 차단)
  if (apiHolidays.length === 0) {
    throw new Error(`${targetYear}년 공휴일 데이터가 없습니다.`);
  }

  // 1. 해당 연도의 API 공휴일만 삭제
  const { error: deleteError } = await supabase
    .from('holidays')
    .delete()
    .eq('is_manual', false)
    .gte('date', `${targetYear}-01-01`)
    .lte('date', `${targetYear}-12-31`);

  if (deleteError) {
    console.error('Failed to delete old API holidays:', deleteError);
    throw new Error(`기존 API 공휴일 삭제 실패: ${deleteError.message}`);
  }

  // 2. 수동 공휴일 날짜 조회 (중복 방지)
  const { data: manualRows, error: manualError } = await supabase
    .from('holidays')
    .select('date')
    .eq('is_manual', true);

  if (manualError) {
    console.error('Failed to fetch manual holidays:', manualError);
    throw new Error(`수동 공휴일 조회 실패: ${manualError.message}`);
  }

  const manualDates = new Set(manualRows?.map((r) => r.date) ?? []);

  // 3. 수동 공휴일과 겹치지 않는 API 공휴일만 삽입
  const newHolidays = apiHolidays.filter(
    (h) => !manualDates.has(h.date.toISOString().split('T')[0])
  );

  if (newHolidays.length > 0) {
    const { error: insertError } = await supabase.from('holidays').insert(
      newHolidays.map((holiday) => ({
        date: holiday.date.toISOString().split('T')[0],
        name: holiday.name,
        is_manual: false,
        created_by: null,
      }))
    );

    if (insertError) {
      console.error('Failed to insert new API holidays:', insertError);
      throw new Error(`새 API 공휴일 삽입 실패: ${insertError.message}`);
    }
  }
}
