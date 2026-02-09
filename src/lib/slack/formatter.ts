/**
 * 슬랙 메시지 포맷터
 * - formatTableMrkdwn: ScheduleEntry[] → mrkdwn 텍스트 테이블
 * - convertDisclaimerToMrkdwn: 커스텀 서식 태그 → mrkdwn 변환
 * - renderMrkdwnPreview: mrkdwn → HTML 변환 (미리보기용)
 * - parseThreadTs: Slack URL → thread_ts 파싱
 *
 * 참조: prd/Azrael-PRD-Phase3.md §2.3, §2.4, §4.3
 */

import type { ScheduleEntry } from '../../types';
import { formatEmailDate } from '../email/formatters';

// ============================================================
// mrkdwn 테이블 포맷터
// ============================================================

/**
 * 평탄화된 ScheduleEntry[] → mrkdwn 텍스트 테이블
 *
 * 참조: PRD §2.2 mrkdwn 테이블 출력
 *
 * @param entries - 평탄화된 엔트리 배열 (부모+자식 모두 포함)
 * @param _projectName - 프로젝트 이름 (헤더용, 현재는 미사용)
 * @returns mrkdwn 형식 테이블 텍스트
 *
 * @example
 * formatTableMrkdwn([...], "M4/GL") →
 * "*[일정 요약]*\n1. 정기: 01/10(금) 09:00 ~ 01/15(수) 18:00\n  1.1. 번역: ..."
 */
export function formatTableMrkdwn(entries: ScheduleEntry[], _projectName: string): string {
  if (entries.length === 0) {
    return '(해당 테이블에 일정이 없습니다)';
  }

  const header = '*[일정 요약]*\n';
  const lines: string[] = [];

  for (const entry of entries) {
    const indent = entry.parentId ? '  ' : '';  // 하위 일감은 2칸 인덴트
    const stageName = entry.stageName;
    const start = formatEmailDate(entry.startDateTime);
    const startTime = formatTime(entry.startDateTime);
    const end = formatEmailDate(entry.endDateTime);
    const endTime = formatTime(entry.endDateTime);

    // 번호 목록 렌더링: 부모는 "1.", 하위는 "  1.1."
    const line = `${indent}${entry.index}. ${stageName}: ${start} ${startTime} ~ ${end} ${endTime}`;
    lines.push(line);
  }

  return header + lines.join('\n');
}

/**
 * Date → 시간 형식 (HH:MM)
 */
function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// ============================================================
// Disclaimer mrkdwn 변환
// ============================================================

/**
 * 커스텀 서식 태그 → mrkdwn 변환
 *
 * 참조: PRD §2.3 Disclaimer 슬랙 변환 규칙
 *
 * @param disclaimer - 커스텀 서식 태그가 포함된 Disclaimer 텍스트
 * @returns mrkdwn 형식 텍스트
 *
 * @example
 * convertDisclaimerToMrkdwn("<b>굵게</b> <r>빨강</r>") → "*굵게* 빨강"
 */
export function convertDisclaimerToMrkdwn(disclaimer: string): string {
  return disclaimer
    .replace(/<b>(.*?)<\/b>/g, '*$1*')     // Bold
    .replace(/<r>(.*?)<\/r>/g, '$1')       // 색상 미지원, 태그만 제거
    .replace(/<g>(.*?)<\/g>/g, '$1')       // 색상 미지원, 태그만 제거
    .replace(/<bl>(.*?)<\/bl>/g, '$1')     // 색상 미지원, 태그만 제거
    .replace(/<u>(.*?)<\/u>/g, '$1');      // 밑줄 미지원, 태그만 제거
  // \n은 유지 (별도 변환 불필요)
}

// ============================================================
// mrkdwn 미리보기 HTML 변환
// ============================================================

/**
 * mrkdwn → HTML 변환 (모달 미리보기용)
 *
 * 참조: PRD §4.3 간이 mrkdwn 미리보기 렌더링
 *
 * 변환 순서 (XSS 방지):
 * 1. HTML entity escape (<, >, &, ", ')
 * 2. mrkdwn → HTML 변환
 * 3. URL 링크 변환 시 http/https만 허용
 *
 * @param mrkdwn - 슬랙 mrkdwn 형식 텍스트
 * @returns HTML 문자열 (dangerouslySetInnerHTML용)
 *
 * @example
 * renderMrkdwnPreview("*bold* _italic_") → "<strong>bold</strong> <em>italic</em>"
 */
export function renderMrkdwnPreview(mrkdwn: string): string {
  // 1. HTML entity escape (XSS 방지)
  let html = mrkdwn
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // 2. mrkdwn → HTML 변환
  html = html
    .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')   // *bold*
    .replace(/_([^_]+)_/g, '<em>$1</em>')             // _italic_
    .replace(/~([^~]+)~/g, '<del>$1</del>')           // ~strike~
    .replace(/---/g, '<hr>');                         // ---

  // 3. URL 링크 변환 (<url|text> → <a href="url">text</a>, http/https만)
  // &lt;, &gt;로 escape된 상태이므로 복원 후 변환
  html = html.replace(/&lt;(https?:\/\/[^|]+)\|([^&]+)&gt;/g, (_, url, text) => {
    // URL은 이미 안전 (http/https만), text는 entity escape된 상태 유지
    return `<a href="${url}">${text}</a>`;
  });

  // 4. 줄바꿈 변환 (\n → <br>)
  html = html.replace(/\n/g, '<br>');

  return html;
}

// ============================================================
// 스레드 타임스탬프 파싱
// ============================================================

/**
 * Slack 메시지 링크 또는 thread_ts 파싱
 *
 * 참조: PRD §4.3 스레드 리플라이
 *
 * @param input - Slack URL 또는 thread_ts 문자열
 * @returns thread_ts 값 또는 null (유효하지 않으면)
 *
 * @example
 * parseThreadTs("https://team.slack.com/archives/C123/p1234567890123456") → "1234567890.123456"
 * parseThreadTs("1234567890.123456") → "1234567890.123456"
 * parseThreadTs("invalid") → null
 */
export function parseThreadTs(input: string): string | null {
  if (!input || !input.trim()) return null;

  const trimmed = input.trim();

  // 1. Slack URL 파싱: https://team.slack.com/archives/C123/p1234567890123456
  const urlPattern = /\/archives\/[^/]+\/p(\d{10})(\d{6})/;
  const urlMatch = trimmed.match(urlPattern);
  if (urlMatch) {
    const timestamp = urlMatch[1];     // 10자리 초 타임스탬프
    const microseconds = urlMatch[2];  // 6자리 마이크로초
    return `${timestamp}.${microseconds}`;
  }

  // 2. 직접 입력: "1234567890.123456" 형식 검증
  const directPattern = /^\d{10}\.\d{6}$/;
  if (directPattern.test(trimmed)) {
    return trimmed;
  }

  // 유효하지 않은 형식
  return null;
}
