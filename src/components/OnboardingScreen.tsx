/**
 * Onboarding Screen Component
 * 참조: prd/Azrael-PRD-Phase0.md §3 온보딩
 * 참조: prd/Azrael-PRD-Design.md §7.2 온보딩 화면
 */

import { useState } from 'react';
import { Project } from '../types';
import { Button } from './Button';
import { FlowerSVG, BlobSVG } from './funky/FunkyDecor';
import './OnboardingScreen.css';

interface OnboardingScreenProps {
  projects: Project[];
  onComplete: (selectedProjectId: string) => void;
}

const CHIP_COLORS = ['#FFD1E3', '#D9C3FF', '#7FE8D4', '#FFE36E', '#D5F24A', '#B388FF', '#FFB0CF', '#A5E8D4'];

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
      {/* Funky 플로팅 스티커 */}
      <div className="onboarding-stickers funky-only" aria-hidden="true">
        <div className="f1"><FlowerSVG size={110} petal="#FFD1E3" core="#FFE36E" /></div>
        <div className="f2"><FlowerSVG size={90} petal="#D9C3FF" core="#FFD1E3" /></div>
        <div className="f3"><FlowerSVG size={100} petal="#7FE8D4" core="#FF3D9A" /></div>
        <div className="f4"><BlobSVG size={180} color="#D9C3FF" /></div>
      </div>

      <div className="onboarding-card">
        {/* Funky 리본 */}
        <div className="onboarding-ribbon funky-only">♡ first time here</div>

        {/* Funky 스텝 미터 */}
        <div className="onboarding-stepper funky-only">
          <span className="pip on" />
          <span className="pip" />
          <span>STEP 1 · 시작하기 전에</span>
        </div>

        <h1 className="onboarding-title">
          <span className="default-only">Azrael에 오신 것을 환영합니다!</span>
          <span className="funky-only">
            Azrael에<br />오신 것을 환영합니다! <span className="wave">✿</span>
          </span>
        </h1>
        <p className="onboarding-subtitle">먼저 사용할 프로젝트를 선택해주세요:</p>

        <div className="onboarding-section-label funky-only">
          <span>✦ Projects</span>
          <span className="dash" />
          <span className="count">{projects.length} available</span>
        </div>

        <div className="radio-group">
          {projects.map((project, i) => {
            const chip = CHIP_COLORS[i % CHIP_COLORS.length];
            const initial = project.name.charAt(0);
            return (
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
                <label htmlFor={project.id}>
                  <span className="onboarding-chip funky-only" style={{ background: chip }}>{initial}</span>
                  <span>{project.name}</span>
                  <span className="onboarding-check funky-only" aria-hidden="true">
                    <span className="onboarding-check-mark">✓</span>
                  </span>
                </label>
              </div>
            );
          })}
        </div>

        <Button
          onClick={handleStart}
          disabled={!selectedProjectId}
          style={{ width: '100%', marginTop: '2rem' }}
        >
          시작하기
          <span className="funky-only" style={{ display: 'inline-block', marginLeft: 8 }}>→</span>
        </Button>

        <p className="onboarding-note">
          <span className="default-only">⚠️ 이 화면은 최초 1회만 표시됩니다.</span>
          <span className="funky-only">
            <span className="warn">⚠</span>이 화면은 최초 1회만 표시됩니다.
          </span>
        </p>
      </div>
    </div>
  );
}
