/**
 * 애플리케이션 전역 상수
 * 매직 넘버를 의미 있는 이름으로 추출
 */

// ── UI 타이밍 ──
export const TOAST_DURATION_MS = 3000;
export const COPY_FEEDBACK_DURATION_MS = 2000;
export const DEBOUNCE_DELAY_MS = 300;

// ── 입력 제약 ──
export const MAX_TEMPLATE_NAME_LENGTH = 50;
export const MAX_DISCLAIMER_LENGTH = 600;
export const MAX_SUBTASK_COUNT = 9;

// ── 프로젝트 기본값 ──
export const DEFAULT_HEADSUP_OFFSET = 10;
export const DEFAULT_IOS_REVIEW_OFFSET = 7;
export const DEFAULT_PAID_PRODUCT_OFFSET = 5;
export const DEFAULT_STAGE_OFFSET = 10;
export const DEFAULT_WORK_START_TIME = '09:00';
export const DEFAULT_WORK_END_TIME = '18:00';

// ── Gantt 차트 ──
export const GANTT_BAR_HEIGHT = 30;
export const GANTT_BAR_CORNER_RADIUS = 3;
export const GANTT_PADDING = 18;

// ── 몰아보기 (Phase 4) ──
export const MAX_PRESET_SLOTS = 4;
export const PRESET_NAME_MAX_LENGTH = 20;

// ── React Query ──
export const QUERY_RETRY_COUNT = 1;
