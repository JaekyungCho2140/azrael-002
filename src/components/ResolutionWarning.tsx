/**
 * ResolutionWarning Component
 * 참조: prd/Azrael-PRD-Design.md §9.1
 */

import './ResolutionWarning.css';

export function ResolutionWarning() {
  return (
    <div className="resolution-warning">
      <div className="warning-content">
        <span className="warning-icon">🐱</span>
        <h2>Azrael은 PC 전용입니다</h2>
        <p>최소 해상도: 1280x720</p>
        <p className="warning-note">
          더 큰 화면에서 사용해주세요
        </p>
      </div>
    </div>
  );
}
