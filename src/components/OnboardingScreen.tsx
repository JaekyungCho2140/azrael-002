/**
 * Onboarding Screen Component
 * 참조: prd/Azrael-PRD-Phase0.md §3 온보딩
 * 참조: prd/Azrael-PRD-Design.md §7.2 온보딩 화면
 */

import { useState } from 'react';
import { Project } from '../types';
import { Button } from './Button';
import './OnboardingScreen.css';

interface OnboardingScreenProps {
  projects: Project[];
  onComplete: (selectedProjectId: string) => void;
}

export function OnboardingScreen({ projects, onComplete }: OnboardingScreenProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const handleStart = () => {
    if (!selectedProjectId) {
      alert('프로젝트를 선택해주세요.');
      return;
    }
    onComplete(selectedProjectId);
  };

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <h1 className="onboarding-title">Azrael에 오신 것을 환영합니다!</h1>
        <p className="onboarding-subtitle">먼저 사용할 프로젝트를 선택해주세요:</p>

        <div className="radio-group">
          {projects.map((project) => (
            <div
              key={project.id}
              className={`radio-item ${selectedProjectId === project.id ? 'selected' : ''}`}
              onClick={() => setSelectedProjectId(project.id)}
            >
              <input
                type="radio"
                id={project.id}
                name="project"
                value={project.id}
                checked={selectedProjectId === project.id}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              />
              <label htmlFor={project.id}>{project.name}</label>
            </div>
          ))}
        </div>

        <Button
          onClick={handleStart}
          disabled={!selectedProjectId}
          style={{ width: '100%', marginTop: '2rem' }}
        >
          시작하기
        </Button>

        <p className="onboarding-note">⚠️ 이 화면은 최초 1회만 표시됩니다.</p>
      </div>
    </div>
  );
}
