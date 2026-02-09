/**
 * Settings Screen Component
 * 참조: prd/Azrael-PRD-Phase0.md §10 설정 화면
 *
 * Phase 3: Supabase 연동 리팩토링
 * 리팩토링: 탭별 컴포넌트 분리 (오케스트레이터 패턴)
 */

import { useState, lazy, Suspense } from 'react';
import { Button } from './Button';
import { useProjects, useTemplates } from '../hooks/useSupabase';
import './SettingsScreen.css';

// 탭 컴포넌트 lazy loading (SettingsScreen 청크 분할)
const SettingsProjectsTab = lazy(() => import('./settings/SettingsProjectsTab').then(m => ({ default: m.SettingsProjectsTab })));
const SettingsStagesTab = lazy(() => import('./settings/SettingsStagesTab').then(m => ({ default: m.SettingsStagesTab })));
const SettingsHolidaysTab = lazy(() => import('./settings/SettingsHolidaysTab').then(m => ({ default: m.SettingsHolidaysTab })));
const SettingsJiraTab = lazy(() => import('./settings/SettingsJiraTab').then(m => ({ default: m.SettingsJiraTab })));
const SettingsEmailTemplatesTab = lazy(() => import('./settings/SettingsEmailTemplatesTab').then(m => ({ default: m.SettingsEmailTemplatesTab })));
const SettingsSlackTab = lazy(() => import('./settings/SettingsSlackTab').then(m => ({ default: m.SettingsSlackTab })));

interface SettingsScreenProps {
  currentProjectId: string;
  currentUserId: string;          // Supabase auth user UUID
  currentUserEmail: string;       // 사용자 이메일 (OAuth, 표시용)
  onClose: () => void;
  calculationResult?: import('../types').CalculationResult | null;
}

type SettingsTab = 'projects' | 'stages' | 'holidays' | 'jira' | 'emailTemplates' | 'slack';

export function SettingsScreen({
  currentProjectId,
  currentUserId,
  currentUserEmail,
  onClose,
  calculationResult,
}: SettingsScreenProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('projects');
  const [selectedProjectId, setSelectedProjectId] = useState(currentProjectId);

  // 관리자 권한 확인
  const isAdmin = currentUserEmail === 'jkcho@wemade.com';

  // Supabase 데이터 조회
  const { data: projects } = useProjects();
  const { data: templates } = useTemplates();

  const selectedTemplate = templates?.find(t => t.projectId === selectedProjectId);

  return (
    <div className="settings-screen">
      <div className="settings-header">
        <h2>설정</h2>
        <Button variant="ghost" onClick={onClose}>
          ← 돌아가기
        </Button>
      </div>

      <div className="settings-layout">
        {/* Sidebar - Tab Navigation */}
        <nav className="settings-sidebar" role="tablist" aria-label="설정 메뉴">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'projects'}
            aria-controls="settings-panel-projects"
            className={`settings-nav-item ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            프로젝트
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'stages'}
            aria-controls="settings-panel-stages"
            className={`settings-nav-item ${activeTab === 'stages' ? 'active' : ''}`}
            onClick={() => setActiveTab('stages')}
          >
            업무 단계
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'holidays'}
            aria-controls="settings-panel-holidays"
            className={`settings-nav-item ${activeTab === 'holidays' ? 'active' : ''}`}
            onClick={() => setActiveTab('holidays')}
          >
            공휴일
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'jira'}
            aria-controls="settings-panel-jira"
            className={`settings-nav-item ${activeTab === 'jira' ? 'active' : ''}`}
            onClick={() => setActiveTab('jira')}
          >
            JIRA 연동
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'emailTemplates'}
            aria-controls="settings-panel-emailTemplates"
            className={`settings-nav-item ${activeTab === 'emailTemplates' ? 'active' : ''}`}
            onClick={() => setActiveTab('emailTemplates')}
          >
            이메일 템플릿
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'slack'}
            aria-controls="settings-panel-slack"
            className={`settings-nav-item ${activeTab === 'slack' ? 'active' : ''}`}
            onClick={() => setActiveTab('slack')}
          >
            Slack
          </button>
        </nav>

        {/* Content */}
        <div className="settings-content">
          <Suspense fallback={<div className="settings-tab-loading">불러오는 중...</div>}>
            {activeTab === 'projects' && projects && (
              <SettingsProjectsTab
                selectedProjectId={selectedProjectId}
                onSelectedProjectIdChange={setSelectedProjectId}
                isAdmin={isAdmin}
                projects={projects}
              />
            )}

            {activeTab === 'stages' && projects && (
              <SettingsStagesTab
                selectedProjectId={selectedProjectId}
                onSelectedProjectIdChange={setSelectedProjectId}
                isAdmin={isAdmin}
                projects={projects}
                selectedTemplate={selectedTemplate}
              />
            )}

            {activeTab === 'holidays' && (
              <SettingsHolidaysTab isAdmin={isAdmin} />
            )}

            {activeTab === 'jira' && (
              <SettingsJiraTab currentUserEmail={currentUserEmail} />
            )}

            {activeTab === 'emailTemplates' && projects && (
              <SettingsEmailTemplatesTab
                selectedProjectId={selectedProjectId}
                onSelectedProjectIdChange={setSelectedProjectId}
                projects={projects}
                calculationResult={calculationResult ?? null}
              />
            )}

            {activeTab === 'slack' && projects && (
              <SettingsSlackTab
                currentUserEmail={currentUserEmail}
                currentUserId={currentUserId}
                selectedProjectId={selectedProjectId}
                projects={projects}
              />
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
