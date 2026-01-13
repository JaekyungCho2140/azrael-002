/**
 * Loading Component
 * 참조: prd/Azrael-PRD-Design.md §9.2
 */

import './Loading.css';

interface LoadingProps {
  message?: string;
}

export function Loading({ message = '로딩 중...' }: LoadingProps) {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-cat">
          <span className="cat-icon">🐱</span>
          <div className="cat-tail"></div>
        </div>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
}
