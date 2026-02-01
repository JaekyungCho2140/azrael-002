/**
 * 클립보드 복사 유틸리티
 * - copyEmailToClipboard: HTML + 플레인텍스트 동시 복사 (Safari 호환)
 * - copySubjectToClipboard: 제목 플레인텍스트 복사
 * - checkClipboardSupport: 브라우저 Clipboard API 지원 여부 확인
 *
 * Safari 호환: ClipboardItem에 Promise 전달 패턴 적용
 * Firefox 제한: ClipboardItem 미지원 시 경고 + 복사 버튼 비활성화
 *
 * 참조: prd/Azrael-PRD-Phase2.md §4.5
 */

// ============================================================
// 클립보드 지원 확인
// ============================================================

/**
 * Clipboard API (ClipboardItem) 지원 여부 확인
 *
 * Firefox는 기본적으로 ClipboardItem이 비활성화되어 있어 HTML 복사 불가.
 * about:config에서 dom.events.asyncClipboard.clipboardItem을 true로 설정하면 사용 가능.
 *
 * 참조: PRD §4.5 checkClipboardSupport (v2.6)
 *
 * @returns { supported, warning? } — supported=false 시 warning 메시지 포함
 */
export function checkClipboardSupport(): {
  supported: boolean;
  warning?: string;
} {
  if (typeof ClipboardItem === 'undefined') {
    return {
      supported: false,
      warning:
        'Firefox에서는 HTML 복사가 제한됩니다.\n\nabout:config에서 dom.events.asyncClipboard.clipboardItem을 true로 설정하거나,\nChrome 또는 Edge를 사용해주세요.',
    };
  }
  return { supported: true };
}

// ============================================================
// 이메일 본문 복사 (HTML + 플레인텍스트)
// ============================================================

/**
 * 이메일 본문을 클립보드에 복사 (HTML + 플레인텍스트 동시)
 *
 * Safari 호환: ClipboardItem에 Promise.resolve(Blob)을 전달하여
 * user activation 타이밍 이슈를 방지.
 *
 * 참조: PRD §4.5 copyEmailToClipboard (v2.7)
 *
 * @param html - HTML 형식 이메일 본문 (juice 인라인 스타일 적용 완료)
 * @param text - 플레인텍스트 형식 이메일 본문
 * @throws {Error} 클립보드 접근 거부 시 사용자 친화적 메시지 포함 에러
 */
export async function copyEmailToClipboard(
  html: string,
  text: string,
): Promise<void> {
  const htmlBlob = new Blob([html], { type: 'text/html' });
  const textBlob = new Blob([text], { type: 'text/plain' });

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': Promise.resolve(htmlBlob),
        'text/plain': Promise.resolve(textBlob),
      }),
    ]);
  } catch (err) {
    // Safari user activation 만료 시 NotAllowedError 발생
    if (err instanceof Error && err.name === 'NotAllowedError') {
      throw new Error(
        '클립보드 접근이 거부되었습니다. 버튼을 다시 클릭해주세요.',
      );
    }
    throw err;
  }
}

// ============================================================
// 제목 복사 (플레인텍스트)
// ============================================================

/**
 * 이메일 제목을 클립보드에 복사 (플레인텍스트)
 *
 * 참조: PRD §2.1 제목 복사 방식 (writeText)
 *
 * @param subject - 이메일 제목 (플레인텍스트)
 * @throws {Error} 클립보드 접근 거부 시 에러
 */
export async function copySubjectToClipboard(subject: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(subject);
  } catch (err) {
    if (err instanceof Error && err.name === 'NotAllowedError') {
      throw new Error(
        '클립보드 접근이 거부되었습니다. 버튼을 다시 클릭해주세요.',
      );
    }
    throw err;
  }
}
