/**
 * Settings Screen Component
 * 참조: prd/Azrael-PRD-Phase0.md §10 설정 화면
 *
 * Phase 3: Supabase 연동 리팩토링
 * 리팩토링: 탭별 컴포넌트 분리 (오케스트레이터 패턴)
 */

import { useState, useEffect } from 'react';
import { Button } from './Button';
import { supabase } from '../lib/supabase';
import { useProjects, useTemplates } from '../hooks/useSupabase';
import { SettingsProjectsTab } from './settings/SettingsProjectsTab';
import { SettingsStagesTab } from './settings/SettingsStagesTab';
import { SettingsHolidaysTab } from './settings/SettingsHolidaysTab';
import { SettingsJiraTab } from './settings/SettingsJiraTab';
import { SettingsEmailTemplatesTab } from './settings/SettingsEmailTemplatesTab';
import './SettingsScreen.css';

interface SettingsScreenProps {
  currentProjectId: string;
  onClose: () => void;
  calculationResult?: import('../types').CalculationResult | null;
}

type SettingsTab = 'projects' | 'stages' | 'holidays' | 'jira' | 'emailTemplates';

export function SettingsScreen({
  currentProjectId,
  onClose,
  calculationResult,
}: SettingsScreenProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('projects');
  const [selectedProjectId, setSelectedProjectId] = useState(currentProjectId);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  // 관리자 권한 확인
  const isAdmin = currentUserEmail === 'jkcho@wemade.com';

  // 현재 사용자 이메일 가져오기
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setCurrentUserEmail(user.email);
      }
    });
  }, []);

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
        </nav>

        {/* Content */}
        <div className="settings-content">
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
        </div>
      </div>
    </div>
  );
}
