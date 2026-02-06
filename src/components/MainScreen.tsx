/**
 * Main Screen Component
 * 참조: prd/Azrael-PRD-Phase0.md §4 메인 화면
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { Project, CalculationResult, WorkTemplate, ScheduleEntry } from '../types';
import { Button } from './Button';
import { ScheduleTable } from './ScheduleTable';

// 무거운 컴포넌트는 lazy loading (번들 크기 최적화)
const GanttChart = lazy(() => import('./GanttChart').then(m => ({ default: m.GanttChart })));
const CalendarView = lazy(() => import('./CalendarView').then(m => ({ default: m.CalendarView })));
const SettingsScreen = lazy(() => import('./SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const JiraPreviewModal = lazy(() => import('./JiraPreviewModal').then(m => ({ default: m.JiraPreviewModal })));
const EmailGeneratorModal = lazy(() => import('./EmailGeneratorModal').then(m => ({ default: m.EmailGeneratorModal })));
import { getUserState } from '../lib/storage';
import { useSaveCalculationResult, useJiraAssignees, useHolidays } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import {
  calculateHeadsUpDate,
  calculateIosReviewDate,
  calculateDateTimeFromStage,
  formatUpdateDate,
  formatDateOnly
} from '../lib/businessDays';
import { fetchEpicMapping } from '../lib/api/jira';
import { useJiraOperations } from '../hooks/useJiraOperations';
import './MainScreen.css';

interface MainScreenProps {
  currentProject: Project;
  projects: Project[];
  templates: WorkTemplate[];
  onProjectChange: (projectId: string) => void;
  onLogout: () => void;
}

export function MainScreen({
  currentProject,
  projects,
  templates,
  onProjectChange,
  onLogout
}: MainScreenProps) {
  const [updateDate, setUpdateDate] = useState<string>('');
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showVisualization, setShowVisualization] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  // Phase 1.7: 계산 결과 Supabase 연동
  const saveMutation = useSaveCalculationResult();

  // JIRA 담당자 목록 조회 (이름 매핑용)
  const { data: jiraAssignees = [] } = useJiraAssignees();

  // Supabase에서 공휴일 조회
  const { data: holidays = [] } = useHolidays();

  // JIRA 작업 훅
  const jira = useJiraOperations({
    currentProject,
    templates,
    calculationResult,
    currentUserEmail,
    holidays,
  });

  // 사용자 이메일 가져오기
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setCurrentUserEmail(user.email);
      }
    });
  }, []);

  // 프로젝트 변경 시 초기화
  useEffect(() => {
    setCalculationResult(null);
    setUpdateDate('');
  }, [currentProject.id]);

  // 시각화 설정 로드 (초기 + 설정 화면 닫힐 때 동기화)
  useEffect(() => {
    if (!showSettings) {
      const userState = getUserState();
      if (userState) {
        setShowVisualization(userState.showVisualization ?? true);
      }
    }
  }, [showSettings]);

  const handleCalculate = () => {
    if (!updateDate) {
      alert('업데이트일을 입력해주세요.');
      return;
    }

    const updateDateObj = new Date(updateDate);
    if (isNaN(updateDateObj.getTime())) {
      alert('올바른 날짜 형식이 아닙니다.');
      return;
    }

    const template = templates.find(t => t.id === currentProject.templateId);
    if (!template || template.stages.length === 0) {
      alert('업무 단계가 설정되지 않았습니다. 설정 화면에서 업무 단계를 추가해주세요.');
      return;
    }

    const headsUpDate = calculateHeadsUpDate(updateDateObj, currentProject, holidays);
    const iosReviewDate = calculateIosReviewDate(updateDateObj, currentProject, holidays);

    const createEntries = (stages: any[], tableTarget: 'table1' | 'table2' | 'table3'): ScheduleEntry[] => {
      const directParents = stages.filter(s => s.depth === 0 && s.tableTargets.includes(tableTarget));

      const parentsWithTargetedChildren = stages.filter(s =>
        s.depth === 0 &&
        !s.tableTargets.includes(tableTarget) &&
        stages.some(child =>
          child.parentStageId === s.id &&
          child.tableTargets.includes(tableTarget)
        )
      );

      const uniqueParentIds = new Set([
        ...directParents.map(p => p.id),
        ...parentsWithTargetedChildren.map(p => p.id)
      ]);

      const allParents = stages.filter(s => uniqueParentIds.has(s.id));

      return allParents.map((stage, index) => {
          const { startDateTime, endDateTime } = calculateDateTimeFromStage(
            updateDateObj,
            stage,
            holidays
          );

          const entry: ScheduleEntry = {
            id: `entry-${stage.id}-${Date.now()}-${index}`,
            index: index + 1,
            stageId: stage.id,
            stageName: stage.name,
            startDateTime,
            endDateTime,
            description: stage.description || '',
            assignee: stage.assignee || '',
            jiraDescription: stage.jiraDescription || '',
            jiraAssignee: stage.jiraAssigneeId
              ? jiraAssignees.find((a: any) => a.jiraAccountId === stage.jiraAssigneeId)?.name || stage.jiraAssigneeId
              : '',
            isManualEdit: false
          };

          const childStages = stages.filter(s =>
            s.parentStageId === stage.id &&
            s.tableTargets.includes(tableTarget)
          );
          if (childStages.length > 0) {
            entry.children = childStages.map((childStage, childIndex) => {
              const { startDateTime: childStart, endDateTime: childEnd } = calculateDateTimeFromStage(
                updateDateObj,
                childStage,
                holidays
              );

              return {
                id: `entry-${childStage.id}-${Date.now()}-${childIndex}`,
                index: childIndex + 1,
                stageId: childStage.id,
                stageName: childStage.name,
                startDateTime: childStart,
                endDateTime: childEnd,
                description: childStage.description || '',
                jiraDescription: childStage.jiraDescription || '',
                jiraAssignee: childStage.jiraAssigneeId
                  ? jiraAssignees.find((a: any) => a.jiraAccountId === childStage.jiraAssigneeId)?.name || childStage.jiraAssigneeId
                  : '',
                parentId: entry.id,
                isManualEdit: false
              };
            });
          }

          return entry;
        });
    };

    const table1Entries = createEntries(template.stages, 'table1');
    const table2Entries = createEntries(template.stages, 'table2');
    const table3Entries = createEntries(template.stages, 'table3');

    const result: CalculationResult = {
      projectId: currentProject.id,
      updateDate: updateDateObj,
      headsUpDate,
      iosReviewDate: iosReviewDate || undefined,
      table1Entries,
      table2Entries,
      table3Entries,
      calculatedAt: new Date()
    };

    setCalculationResult(result);

    // Phase 1.7: Supabase에 저장
    saveMutation.mutate({ result, userEmail: currentUserEmail });

    // Epic 매핑 존재 여부 확인 (JIRA 업데이트 버튼 활성화용)
    fetchEpicMapping(currentProject.id, updateDateObj).then(epicMapping => {
      const hasMapping = !!(epicMapping && epicMapping.epicId !== 'PENDING');
      jira.setHasEpicMapping(hasMapping);
    }).catch(err => {
      console.error('[handleCalculate] Epic 매핑 확인 실패:', err);
      jira.setHasEpicMapping(false);
    });
  };

  // 설정 화면 표시
  if (showSettings) {
    return (
      <Suspense fallback={<div className="lazy-loading">설정을 불러오는 중...</div>}>
        <SettingsScreen
          currentProjectId={currentProject.id}
          onClose={() => setShowSettings(false)}
          calculationResult={calculationResult}
        />
      </Suspense>
    );
  }

  return (
    <div className="main-screen">
      {/* JIRA 로딩 오버레이 */}
      {jira.isJiraLoading && (
        <div className="jira-loading-overlay">
          <div className="jira-loading-content">
            <div className="jira-loading-spinner"></div>
            <p>{jira.jiraLoadingMessage}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="main-header">
        <div className="logo">
          <span className="logo-text">Azrael</span>
        </div>
        <div className="header-actions">
          <select
            value={currentProject.id}
            onChange={(e) => onProjectChange(e.target.value)}
            className="project-dropdown"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Button variant="ghost" onClick={() => setShowSettings(true)}>
            ⚙️ 설정
          </Button>
          <Button variant="ghost" onClick={onLogout}>
            🚪 로그아웃
          </Button>
        </div>
      </header>

      {/* Input Section */}
      <div className="input-section">
        <div className="input-row">
          <span className="input-label">업데이트일</span>
          <input
            type="date"
            value={updateDate.split(' ')[0] || ''}
            onChange={(e) => {
              if (e.target.value) {
                const date = new Date(e.target.value);
                setUpdateDate(formatUpdateDate(date));
              }
            }}
            className="input date-input"
          />
          <Button onClick={handleCalculate}>계산</Button>
          <Button
            onClick={jira.handleCreateJira}
            disabled={!calculationResult || !jira.hasJiraConfig}
            title={!calculationResult ? '일정 계산 후 사용 가능' : !jira.hasJiraConfig ? 'JIRA 설정 필요' : ''}
          >
            📋 JIRA 생성
          </Button>
          <Button
            onClick={jira.handleUpdateJira}
            disabled={!jira.hasEpicMapping}
            variant="secondary"
            title={!jira.hasEpicMapping ? '먼저 JIRA 생성 필요' : ''}
          >
            🔄 JIRA 업데이트
          </Button>
          <Button
            onClick={() => setShowEmailModal(true)}
            disabled={!calculationResult}
            title={!calculationResult ? '일정 계산 후 사용 가능' : ''}
          >
            ✉️ 이메일 복사
          </Button>
        </div>
      </div>

      {/* Results Section */}
      {calculationResult && (
        <div className="results-section">
          {/* 상단 날짜 */}
          <div className="date-summary">
            <div className="date-item">
              <span className="date-label">헤즈업</span>
              <span className="date-value">
                {formatDateOnly(calculationResult.headsUpDate)}
              </span>
            </div>
            {calculationResult.iosReviewDate && (
              <div className="date-item date-item-right">
                <span className="date-label">iOS 심사일</span>
                <span className="date-value">
                  {formatDateOnly(calculationResult.iosReviewDate)}
                </span>
              </div>
            )}
          </div>

          {/* 테이블 1 */}
          <ScheduleTable
            title={`${calculationResult.updateDate.getFullYear().toString().substring(2)}-${String(calculationResult.updateDate.getMonth() + 1).padStart(2, '0')}-${String(calculationResult.updateDate.getDate()).padStart(2, '0')} 업데이트 일정표`}
            entries={calculationResult.table1Entries}
            type="table1"
            disclaimer={currentProject.disclaimer}
          />

          {/* 간트 차트 1 */}
          {showVisualization && (
            <Suspense fallback={null}>
              <GanttChart
                entries={calculationResult.table1Entries}
                chartId="gantt-table1"
                color="#FF9800"
              />
            </Suspense>
          )}

          {/* 테이블 2 */}
          <ScheduleTable
            title={`Ext. ${calculationResult.updateDate.getFullYear().toString().substring(2)}-${String(calculationResult.updateDate.getMonth() + 1).padStart(2, '0')}-${String(calculationResult.updateDate.getDate()).padStart(2, '0')} 업데이트 일정표`}
            entries={calculationResult.table2Entries}
            type="table2"
          />

          {/* 간트 차트 2 */}
          {showVisualization && (
            <Suspense fallback={null}>
              <GanttChart
                entries={calculationResult.table2Entries}
                chartId="gantt-table2"
                color="#009688"
              />
            </Suspense>
          )}

          {/* 테이블 3 */}
          <ScheduleTable
            title={`Int. ${calculationResult.updateDate.getFullYear().toString().substring(2)}-${String(calculationResult.updateDate.getMonth() + 1).padStart(2, '0')}-${String(calculationResult.updateDate.getDate()).padStart(2, '0')} 업데이트 일정표`}
            entries={calculationResult.table3Entries}
            type="table3"
          />

          {/* 간트 차트 3 */}
          {showVisualization && (
            <Suspense fallback={null}>
              <GanttChart
                entries={calculationResult.table3Entries}
                chartId="gantt-table3"
                color="#673AB7"
              />
            </Suspense>
          )}

          {/* 캘린더 뷰 */}
          {showVisualization && (
            <Suspense fallback={null}>
              <CalendarView
                table1Entries={calculationResult.table1Entries}
                table2Entries={calculationResult.table2Entries}
                table3Entries={calculationResult.table3Entries}
                updateDate={calculationResult.updateDate}
              />
            </Suspense>
          )}
        </div>
      )}

      {/* JIRA 미리보기 모달 (Phase 1) */}
      {jira.jiraPreviewData && (
        <Suspense fallback={null}>
          <JiraPreviewModal
            isOpen={jira.jiraPreviewOpen}
            onClose={() => jira.setJiraPreviewOpen(false)}
            onConfirm={jira.handleConfirmJiraCreate}
            epic={jira.jiraPreviewData.epic}
            tasks={jira.jiraPreviewData.tasks}
            isCreating={jira.isCreatingJira}
          />
        </Suspense>
      )}

      {showEmailModal && (
        <Suspense fallback={null}>
          <EmailGeneratorModal
            isOpen={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            projectId={currentProject.id}
            project={currentProject}
            updateDate={new Date(updateDate.split(' ')[0])}
            calculationResult={calculationResult}
          />
        </Suspense>
      )}
    </div>
  );
}
