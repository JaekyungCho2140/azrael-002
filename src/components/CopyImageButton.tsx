/**
 * CopyImageButton Component
 * 참조: prd/Azrael-PRD-Phase0.md §8.1
 */

import { Button } from './Button';
import { useImageCopy } from '../hooks/useImageCopy';

interface CopyImageButtonProps {
  targetId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function CopyImageButton({ targetId, onSuccess, onError }: CopyImageButtonProps) {
  const { copyElementAsImage, isLoading } = useImageCopy();

  const handleClick = async () => {
    try {
      await copyElementAsImage(targetId);
      onSuccess?.();
    } catch (err) {
      onError?.(err as Error);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      variant="secondary"
    >
      {isLoading ? '생성 중...' : '📋 이미지 복사'}
    </Button>
  );
}
