/**
 * useImageCopy Hook
 * html2canvas를 사용한 이미지 복사 기능
 * 참조: prd/Azrael-PRD-Phase0.md §8
 */

import { useState } from 'react';
import html2canvas from 'html2canvas';

export function useImageCopy() {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 요소를 이미지로 캡처하여 클립보드에 복사
   * 참조: Azrael-PRD-Phase0.md §8.2, §8.3, §8.5
   */
  const copyElementAsImage = async (elementId: string): Promise<void> => {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`요소를 찾을 수 없습니다: ${elementId}`);
    }

    // Clipboard API 지원 여부 확인 (Q9: fallback)
    if (!navigator.clipboard || !navigator.clipboard.write) {
      const shouldDownload = confirm(
        '이 브라우저는 클립보드 복사를 지원하지 않습니다.\n이미지를 다운로드하시겠습니까?'
      );

      if (shouldDownload) {
        await downloadElementAsImage(elementId);
      }
      return;
    }

    try {
      setIsLoading(true);

      // Q17: 스크롤 처리 - overflow를 visible로 임시 전환
      const originalOverflow = element.style.overflow;
      element.style.overflow = 'visible';

      // html2canvas로 캡처 (scale: 2 for Retina)
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // 원래 overflow 복원
      element.style.overflow = originalOverflow;

      // Canvas → PNG Blob
      await new Promise<void>((resolve, reject) => {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error('이미지 생성에 실패했습니다'));
            return;
          }

          try {
            // Clipboard API로 복사
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            resolve();
          } catch (err) {
            // Q9: Clipboard 실패 시 다운로드 제안
            const shouldDownload = confirm(
              '클립보드 복사에 실패했습니다.\n이미지를 다운로드하시겠습니까?'
            );

            if (shouldDownload) {
              const url = canvas.toDataURL('image/png');
              const a = document.createElement('a');
              a.href = url;
              a.download = `azrael-${elementId}-${Date.now()}.png`;
              a.click();
            }
            reject(err);
          }
        }, 'image/png');
      });

      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  /**
   * 요소를 이미지로 다운로드 (fallback)
   */
  const downloadElementAsImage = async (elementId: string): Promise<void> => {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`요소를 찾을 수 없습니다: ${elementId}`);
    }

    try {
      setIsLoading(true);

      const originalOverflow = element.style.overflow;
      element.style.overflow = 'visible';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      element.style.overflow = originalOverflow;

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `azrael-${elementId}-${Date.now()}.png`;
      a.click();

      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  return {
    copyElementAsImage,
    downloadElementAsImage,
    isLoading
  };
}
