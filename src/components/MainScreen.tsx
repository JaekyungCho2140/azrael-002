/**
 * Main Screen Component
 * 참조: prd/Azrael-PRD-Phase0.md §4 메인 화면
 */

import { useState, useEffect } from 'react';
import { Project, CalculationResult, WorkTemplate, ScheduleEntry } from '../types';
import { Button } from './Button';
import { ScheduleTable } from './ScheduleTable';
import { GanttChart } from './GanttChart';
import { CalendarView } from './CalendarView';
import { SettingsScreen } from './SettingsScreen';
import { loadCalculationResult, saveCalculationResult, loadHolidays } from '../lib/storage';
import {
  calculateHeadsUpDate,
  calculateIosReviewDate,
  calculateDateTimeFromStage,
  formatUpdateDate,
  formatDateOnly
} from '../lib/businessDays';
import './MainScreen.css';

interface MainScreenProps {
  currentProject: Project;
  projects: Project[];
  templates: WorkTemplate[];
  onProjectChange: (projectId: string) => void;
  onAddProject: (project: Project) => void;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
  onUpdateTemplates: (templates: WorkTemplate[]) => void;
  onLogout: () => void;
}

export function MainScreen({
  currentProject,
  projects,
  templates,
  onProjectChange,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onUpdateTemplates,
  onLogout
}: MainScreenProps) {
  const [updateDate, setUpdateDate] = useState<string>('');
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // 프로젝트 변경 시 해당 프로젝트의 계산 결과 로드
  useEffect(() => {
    const lastResult = loadCalculationResult(currentProject.id);
    if (lastResult) {
      setCalculationResult(lastResult);
      setUpdateDate(formatUpdateDate(lastResult.updateDate));
    } else {
      // 저장된 결과가 없으면 초기화
      setCalculationResult(null);
      setUpdateDate('');
    }
  }, [currentProject.id]);

  // 테이블 엔트리 업데이트
  const handleUpdateEntry = (entryId: string, field: string, value: string) => {
    if (!calculationResult) return;

    const updateEntryInList = (entries: ScheduleEntry[]): ScheduleEntry[] => {
      return entries.map(entry => {
        if (entry.id === entryId) {
          return { ...entry, [field]: value };
        }
        if (entry.children) {
          return { ...entry, children: updateEntryInList(entry.children) };
        }
        return entry;
      });
    };

    const updated: CalculationResult = {
      ...calculationResult,
      table1Entries: updateEntryInList(calculationResult.table1Entries),
      table2Entries: updateEntryInList(calculationResult.table2Entries),
      table3Entries: updateEntryInList(calculationResult.table3Entries)
    };

    setCalculationResult(updated);
    saveCalculationResult(updated);
  };

  // 인덱스 재계산 함수
  const reindexEntries = (entries: ScheduleEntry[]): ScheduleEntry[] => {
    let parentIndex = 1;
    
    return entries.map(entry => {
      if (entry.parentId) {
        // 하위 일감: 부모의 인덱스.자식번호
        return entry;
      } else {
        // 부모 엔트리
        const reindexedEntry = { ...entry, index: parentIndex };
        
        if (entry.children && entry.children.length > 0) {
          reindexedEntry.children = entry.children.map((child, childIdx) => ({
            ...child,
            index: parseFloat(`${parentIndex}.${childIdx + 1}`)
          }));
        }
        
        parentIndex++;
        return reindexedEntry;
      }
    });
  };

  // 같은 레벨 엔트리 추가 (+ 버튼)
  const handleAddSibling = (entryId: string) => {
    if (!calculationResult) return;

    const addSiblingInList = (entries: ScheduleEntry[]): ScheduleEntry[] => {
      const result: ScheduleEntry[] = [];

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        result.push(entry);

        if (entry.id === entryId) {
          // 현재 엔트리 다음에 새 엔트리 추가
          const newEntry: ScheduleEntry = {
            id: `entry-new-${Date.now()}`,
            index: 0, // 나중에 재정렬
            stageId: entry.stageId,
            stageName: '새 업무',
            startDateTime: new Date(entry.startDateTime),
            endDateTime: new Date(entry.endDateTime),
            description: '',
            assignee: '',
            jiraDescription: '',
            parentId: entry.parentId,
            isManualEdit: false
          };
          result.push(newEntry);
        }

        // 하위 일감 재귀
        if (entry.children) {
          entry.children = addSiblingInList(entry.children);
        }
      }

      return result;
    };

    const updated: CalculationResult = {
      ...calculationResult,
      table1Entries: reindexEntries(addSiblingInList(calculationResult.table1Entries)),
      table2Entries: reindexEntries(addSiblingInList(calculationResult.table2Entries)),
      table3Entries: reindexEntries(addSiblingInList(calculationResult.table3Entries))
    };

    setCalculationResult(updated);
    saveCalculationResult(updated);
  };

  // 하위 일감 추가 (↓ 버튼)
  const handleAddChild = (entryId: string) => {
    if (!calculationResult) return;

    const addChildInList = (entries: ScheduleEntry[]): ScheduleEntry[] => {
      return entries.map(entry => {
        if (entry.id === entryId) {
          // 검증: 이미 자식이면 에러
          if (entry.parentId) {
            alert('최대 2단계까지만 지원합니다');
            return entry;
          }

          // 검증: 최대 20개 체크
          if (entry.children && entry.children.length >= 20) {
            alert('하위 일감은 최대 20개까지 추가할 수 있습니다');
            return entry;
          }

          const newChild: ScheduleEntry = {
            id: `entry-child-${Date.now()}`,
            index: 0,
            stageId: entry.stageId,
            stageName: '하위 업무',
            startDateTime: new Date(entry.startDateTime),
            endDateTime: new Date(entry.endDateTime),
            description: '',
            jiraDescription: '',
            parentId: entry.id,
            isManualEdit: false
          };

          return {
            ...entry,
            children: [...(entry.children || []), newChild]
          };
        }

        if (entry.children) {
          return { ...entry, children: addChildInList(entry.children) };
        }

        return entry;
      });
    };

    const updated: CalculationResult = {
      ...calculationResult,
      table1Entries: reindexEntries(addChildInList(calculationResult.table1Entries)),
      table2Entries: reindexEntries(addChildInList(calculationResult.table2Entries)),
      table3Entries: reindexEntries(addChildInList(calculationResult.table3Entries))
    };

    setCalculationResult(updated);
    saveCalculationResult(updated);
  };

  // 엔트리 삭제 (✕ 버튼)
  const handleDeleteEntry = (entryId: string) => {
    if (!calculationResult) return;

    if (!confirm('정말 삭제하시겠습니까?')) return;

    const deleteFromList = (entries: ScheduleEntry[]): ScheduleEntry[] => {
      return entries
        .filter(entry => entry.id !== entryId)
        .map(entry => {
          if (entry.children) {
            // 자식도 삭제 확인
            const hasTargetChild = entry.children.some(c => c.id === entryId);
            if (hasTargetChild) {
              return {
                ...entry,
                children: entry.children.filter(c => c.id !== entryId)
              };
            }
            return { ...entry, children: deleteFromList(entry.children) };
          }
          return entry;
        });
    };

    const updated: CalculationResult = {
      ...calculationResult,
      table1Entries: reindexEntries(deleteFromList(calculationResult.table1Entries)),
      table2Entries: reindexEntries(deleteFromList(calculationResult.table2Entries)),
      table3Entries: reindexEntries(deleteFromList(calculationResult.table3Entries))
    };

    setCalculationResult(updated);
    saveCalculationResult(updated);
  };

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

    // 현재 프로젝트의 템플릿 찾기
    const template = templates.find(t => t.id === currentProject.templateId);
    if (!template || template.stages.length === 0) {
      alert('업무 단계가 설정되지 않았습니다. 설정 화면에서 업무 단계를 추가해주세요.');
      return;
    }

    // 최신 공휴일 데이터 로드 (공휴일 추가 후 즉시 반영)
    const currentHolidays = loadHolidays();

    // 계산 수행
    const headsUpDate = calculateHeadsUpDate(updateDateObj, currentProject, currentHolidays);
    const iosReviewDate = calculateIosReviewDate(updateDateObj, currentProject, currentHolidays);

    // 테이블 엔트리 생성 (테이블별 필터링)
    const createEntries = (stages: any[], tableTarget: 'table1' | 'table2' | 'table3'): ScheduleEntry[] => {
      return stages
        .filter(s => s.depth === 0 && s.tableTargets.includes(tableTarget)) // 부모만 + 해당 테이블에 표시되는 것만
        .map((stage, index) => {
          const { startDateTime, endDateTime } = calculateDateTimeFromStage(
            updateDateObj,
            stage,
            currentHolidays
          );

          const entry: ScheduleEntry = {
            id: `entry-${stage.id}-${Date.now()}-${index}`,
            index: index + 1,
            stageId: stage.id,
            stageName: stage.name,
            startDateTime,
            endDateTime,
            description: '',
            assignee: '',
            jiraDescription: '',
            isManualEdit: false
          };

          // 하위 일감 추가
          const childStages = stages.filter(s => s.parentStageId === stage.id);
          if (childStages.length > 0) {
            entry.children = childStages.map((childStage, childIndex) => {
              const { startDateTime: childStart, endDateTime: childEnd } = calculateDateTimeFromStage(
                updateDateObj,
                childStage,
                currentHolidays
              );

              return {
                id: `entry-${childStage.id}-${Date.now()}-${childIndex}`,
                index: childIndex + 1,
                stageId: childStage.id,
                stageName: childStage.name,
                startDateTime: childStart,
                endDateTime: childEnd,
                description: '',
                jiraDescription: '',
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
    saveCalculationResult(result);
  };

  // 설정 화면 표시
  if (showSettings) {
    return (
      <SettingsScreen
        projects={projects}
        templates={templates}
        currentProjectId={currentProject.id}
        onAddProject={onAddProject}
        onUpdateProject={onUpdateProject}
        onDeleteProject={onDeleteProject}
        onUpdateTemplates={onUpdateTemplates}
        onClose={() => setShowSettings(false)}
      />
    );
  }

  return (
    <div className="main-screen">
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
            onUpdateEntry={handleUpdateEntry}
            onAddSibling={handleAddSibling}
            onAddChild={handleAddChild}
            onDelete={handleDeleteEntry}
          />

          {/* 간트 차트 1 */}
          <GanttChart
            entries={calculationResult.table1Entries}
            chartId="gantt-table1"
            color="#FF9800"
          />

          {/* 테이블 2 */}
          <ScheduleTable
            title={`Ext. ${calculationResult.updateDate.getFullYear().toString().substring(2)}-${String(calculationResult.updateDate.getMonth() + 1).padStart(2, '0')}-${String(calculationResult.updateDate.getDate()).padStart(2, '0')} 업데이트 일정표`}
            entries={calculationResult.table2Entries}
            type="table2"
            onUpdateEntry={handleUpdateEntry}
            onAddSibling={handleAddSibling}
            onAddChild={handleAddChild}
            onDelete={handleDeleteEntry}
          />

          {/* 간트 차트 2 */}
          <GanttChart
            entries={calculationResult.table2Entries}
            chartId="gantt-table2"
            color="#009688"
          />

          {/* 테이블 3 */}
          <ScheduleTable
            title={`Int. ${calculationResult.updateDate.getFullYear().toString().substring(2)}-${String(calculationResult.updateDate.getMonth() + 1).padStart(2, '0')}-${String(calculationResult.updateDate.getDate()).padStart(2, '0')} 업데이트 일정표`}
            entries={calculationResult.table3Entries}
            type="table3"
            onUpdateEntry={handleUpdateEntry}
            onAddSibling={handleAddSibling}
            onAddChild={handleAddChild}
            onDelete={handleDeleteEntry}
          />

          {/* 간트 차트 3 */}
          <GanttChart
            entries={calculationResult.table3Entries}
            chartId="gantt-table3"
            color="#673AB7"
          />

          {/* 캘린더 뷰 */}
          <CalendarView
            table1Entries={calculationResult.table1Entries}
            table2Entries={calculationResult.table2Entries}
            table3Entries={calculationResult.table3Entries}
            updateDate={calculationResult.updateDate}
          />
        </div>
      )}
    </div>
  );
}
