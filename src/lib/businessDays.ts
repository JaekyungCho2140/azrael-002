/**
 * 영업일 역산 계산 엔진
 * 참조: prd/Azrael-PRD-Shared.md §3 공통 계산 로직
 */

import { Holiday, Project, WorkStage } from '../types';

/**
 * 업데이트일 기준 N 영업일 역산
 * 참조: Azrael-PRD-Shared.md §3.1
 *
 * @param updateDate - 업데이트일 (D-day)
 * @param offsetDays - 역산할 영업일 (양수 = 과거, 음수 = 미래)
 * @param holidays - 공휴일 배열
 * @returns 계산된 날짜
 *
 * ⚠️ 핵심 규칙:
 * - 주말 제외: 토요일(6), 일요일(0) 완전 제외
 * - 공휴일 제외: 공휴일 배열에 포함된 날짜 완전 제외
 * - Offset=0 정책: 업데이트일을 그대로 반환 (영업일 검증 안 함)
 */
export function calculateBusinessDate(
  updateDate: Date,
  offsetDays: number,
  holidays: Holiday[]
): Date {
  // Offset=0 정책: 업데이트일 그대로 반환
  if (offsetDays === 0) {
    return new Date(updateDate);
  }

  let currentDate = new Date(updateDate);
  let remainingDays = Math.abs(offsetDays);
  const direction = offsetDays >= 0 ? -1 : 1; // 양수면 과거(-), 음수면 미래(+)

  while (remainingDays > 0) {
    currentDate.setDate(currentDate.getDate() + direction);

    // 주말 체크 (토요일=6, 일요일=0)
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue; // 주말은 영업일에서 제외, 카운트 안 함
    }

    // 공휴일 체크
    const isHoliday = holidays.some(holiday =>
      holiday.date.getFullYear() === currentDate.getFullYear() &&
      holiday.date.getMonth() === currentDate.getMonth() &&
      holiday.date.getDate() === currentDate.getDate()
    );
    if (isHoliday) {
      continue; // 공휴일은 영업일에서 제외, 카운트 안 함
    }

    // 영업일 카운트
    remainingDays--;
  }

  return currentDate;
}

/**
 * WorkStage로부터 시작/종료일시 계산
 * 참조: Azrael-PRD-Shared.md §3.2
 * 수정: 마감과 테이블 전달에 각각 다른 Offset 사용
 *
 * @param updateDate - 업데이트일
 * @param stage - 업무 단계
 * @param holidays - 공휴일 배열
 * @returns { startDateTime, endDateTime }
 */
export function calculateDateTimeFromStage(
  updateDate: Date,
  stage: WorkStage,
  holidays: Holiday[]
): { startDateTime: Date; endDateTime: Date } {
  // 1. 날짜 계산 (각각 다른 Offset 사용)
  const startDate = calculateBusinessDate(updateDate, stage.startOffsetDays, holidays);
  const endDate = calculateBusinessDate(updateDate, stage.endOffsetDays, holidays);

  // 2. 시각 추가
  const [startHour, startMin] = stage.startTime.split(':').map(Number);
  const [endHour, endMin] = stage.endTime.split(':').map(Number);

  const startDateTime = new Date(startDate);
  startDateTime.setHours(startHour, startMin, 0, 0);

  const endDateTime = new Date(endDate);
  endDateTime.setHours(endHour, endMin, 0, 0);

  return { startDateTime, endDateTime };
}

/**
 * 헤즈업 날짜 계산
 * 참조: Azrael-PRD-Shared.md §3.3
 */
export function calculateHeadsUpDate(
  updateDate: Date,
  project: Project,
  holidays: Holiday[]
): Date {
  return calculateBusinessDate(updateDate, project.headsUpOffset, holidays);
}

/**
 * iOS 심사일 계산
 * 참조: Azrael-PRD-Shared.md §3.3
 */
export function calculateIosReviewDate(
  updateDate: Date,
  project: Project,
  holidays: Holiday[]
): Date | null {
  if (!project.showIosReviewDate || !project.iosReviewOffset) {
    return null;
  }
  return calculateBusinessDate(updateDate, project.iosReviewOffset, holidays);
}

/**
 * 유료화 상품 협의 일정 계산
 * 업데이트일 기준 N 영업일 역산
 */
export function calculatePaidProductDate(
  updateDate: Date,
  project: Project,
  holidays: Holiday[]
): Date | null {
  if (!project.showPaidProductDate || !project.paidProductOffset) {
    return null;
  }
  return calculateBusinessDate(updateDate, project.paidProductOffset, holidays);
}

/**
 * Disclaimer 텍스트의 변수 치환
 * {updateDate}, {headsUp}, {iosReviewDate}, {paidProductDate} → 날짜 형식
 */
export function substituteDisclaimerVariables(
  disclaimer: string,
  dates: { updateDate: Date; headsUpDate: Date; iosReviewDate?: Date; paidProductDate?: Date },
  dateFormatter: (d: Date) => string = formatDateOnly
): string {
  return disclaimer
    .replace(/\{updateDate\}/g, dateFormatter(dates.updateDate))
    .replace(/\{headsUp\}/g, dateFormatter(dates.headsUpDate))
    .replace(/\{iosReviewDate\}/g, dates.iosReviewDate ? dateFormatter(dates.iosReviewDate) : '')
    .replace(/\{paidProductDate\}/g, dates.paidProductDate ? dateFormatter(dates.paidProductDate) : '');
}

/**
 * Date → 테이블 출력 형식 변환
 * 참조: Azrael-PRD-Shared.md §3.4
 *
 * @param date
 * @returns "MM/DD(요일) HH:MM" 형식
 * @example formatTableDate(new Date('2026-01-28 09:00')) → "01/28(화) 09:00"
 */
export function formatTableDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = weekdays[date.getDay()];
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');

  return `${mm}/${dd}(${dayOfWeek}) ${hh}:${min}`;
}

/**
 * Date → 업데이트일 입력 형식 변환
 * 참조: Azrael-PRD-Shared.md §3.4
 *
 * @param date
 * @returns "YYYY-MM-DD (요일)" 형식
 * @example formatUpdateDate(new Date('2026-02-10')) → "2026-02-10 (월)"
 */
export function formatUpdateDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = weekdays[date.getDay()];

  return `${yyyy}-${mm}-${dd} (${dayOfWeek})`;
}

/**
 * 시각만 추출 (HH:MM)
 */
export function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${min}`;
}

/**
 * Date → 날짜만 변환 (시각 제외)
 * @param date
 * @returns "MM/DD(요일)" 형식
 * @example formatDateOnly(new Date('2026-01-28')) → "01/28(수)"
 */
export function formatDateOnly(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = weekdays[date.getDay()];

  return `${mm}/${dd}(${dayOfWeek})`;
}

/**
 * Date → YYYY-MM-DD 변환 (로컬 시간대 기준, UTC 변환 없음)
 * @param date
 * @returns "YYYY-MM-DD" 형식
 * @example formatDateLocal(new Date(2026, 0, 1)) → "2026-01-01"
 */
export function formatDateLocal(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd}`;
}
