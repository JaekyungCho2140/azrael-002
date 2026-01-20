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
import { JiraPreviewModal } from './JiraPreviewModal';
import { loadCalculationResult, saveCalculationResult, loadHolidays } from '../lib/storage';
import { supabase } from '../lib/supabase';
import {
  calculateHeadsUpDate,
  calculateIosReviewDate,
  calculateDateTimeFromStage,
  formatUpdateDate,
  formatDateOnly
} from '../lib/businessDays';
import {
  getSummary,
  formatDateYYMMDD,
  formatDateMMDD,
  type TemplateVars
} from '../lib/jira/templates';
import {
  fetchEpicMapping,
  createEpicMappingPending,
  updateEpicMapping,
  deleteEpicMapping,
  createTaskMappings,
  fetchTaskMappings,
  retryWithBackoff,
  type TaskMapping
} from '../lib/api/jira';
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

  // JIRA 관련 상태 (Phase 1)
  const [hasJiraConfig, setHasJiraConfig] = useState(false);
  const [hasEpicMapping, setHasEpicMapping] = useState(false);
  const [jiraPreviewOpen, setJiraPreviewOpen] = useState(false);
  const [jiraPreviewData, setJiraPreviewData] = useState<any>(null);
  const [isCreatingJira, setIsCreatingJira] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  // 사용자 이메일 가져오기
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setCurrentUserEmail(user.email);
      }
    });
  }, []);

  // JIRA 설정 확인 (Phase 1) - 독립적으로 항상 체크
  useEffect(() => {
    const jiraConfig = localStorage.getItem('azrael:jiraConfig');
    setHasJiraConfig(!!jiraConfig);
  }, [calculationResult, showSettings]); // 계산 후 또는 설정 화면 닫을 때 체크

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

    // Epic 매핑 확인 (Phase 1)
    const checkEpicMapping = async () => {
      if (!lastResult) {
        setHasEpicMapping(false);
        return;
      }

      try {
        const epicMapping = await fetchEpicMapping(currentProject.id, lastResult.updateDate);
        setHasEpicMapping(!!epicMapping && epicMapping.epicId !== 'PENDING');
      } catch (err) {
        console.error('Epic 매핑 확인 실패:', err);
        setHasEpicMapping(false);
      }
    };

    checkEpicMapping();
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
      // 1. 본인이 tableTarget을 체크한 부모
      const directParents = stages.filter(s => s.depth === 0 && s.tableTargets.includes(tableTarget));

      // 2. 본인은 체크 안 했지만 하위가 tableTarget을 체크한 부모 (복제용)
      const parentsWithTargetedChildren = stages.filter(s =>
        s.depth === 0 &&
        !s.tableTargets.includes(tableTarget) &&
        stages.some(child =>
          child.parentStageId === s.id &&
          child.tableTargets.includes(tableTarget)
        )
      );

      // 3. 병합 (중복 제거)
      const uniqueParentIds = new Set([
        ...directParents.map(p => p.id),
        ...parentsWithTargetedChildren.map(p => p.id)
      ]);

      const allParents = stages.filter(s => uniqueParentIds.has(s.id));

      return allParents.map((stage, index) => {
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

          // 하위 일감 추가 (해당 테이블에 표시되는 것만)
          const childStages = stages.filter(s =>
            s.parentStageId === stage.id &&
            s.tableTargets.includes(tableTarget)
          );
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

  // JIRA 생성 핸들러 (Phase 1)
  const handleCreateJira = async () => {
    if (!calculationResult) {
      alert('먼저 일정을 계산해주세요.');
      return;
    }

    // JIRA 설정 확인
    const jiraConfigStr = localStorage.getItem('azrael:jiraConfig');
    if (!jiraConfigStr) {
      alert('JIRA 연동 설정이 필요합니다.\n설정 → JIRA 연동 탭에서 API Token을 설정해주세요.');
      return;
    }

    // 프로젝트 키 확인
    if (!currentProject.jiraProjectKey) {
      alert('JIRA 프로젝트 키가 설정되지 않았습니다.\n설정 → 프로젝트 관리에서 프로젝트를 편집하여 JIRA 프로젝트 키를 입력해주세요.');
      return;
    }

    // Epic 중복 체크
    try {
      const existingEpic = await fetchEpicMapping(currentProject.id, calculationResult.updateDate);
      if (existingEpic && existingEpic.epicId !== 'PENDING') {
        alert(`이미 생성된 Epic이 있습니다 (${existingEpic.epicKey}).\n\n[JIRA 업데이트] 버튼을 사용하여 일정을 변경하세요.`);
        return;
      }
    } catch (err: any) {
      alert(`Epic 확인 실패: ${err.message}`);
      return;
    }

    // 미리보기 데이터 생성
    try {
      const template = templates.find(t => t.id === currentProject.templateId);
      if (!template) return;

      // 템플릿 변수 생성
      const dateStr = formatDateYYMMDD(calculationResult.updateDate);
      const headsUpStr = formatDateMMDD(calculationResult.headsUpDate);

      // Epic Summary
      const epicSummary = currentProject.jiraEpicTemplate
        ? currentProject.jiraEpicTemplate.replace(/{date}/g, dateStr).replace(/{projectName}/g, currentProject.name).replace(/{headsUp}/g, headsUpStr)
        : `${dateStr} 업데이트`;

      // Tasks 미리보기 데이터 생성
      const tasks: any[] = [];

      // 헤즈업 Task
      const taskIssueType = currentProject.jiraTaskIssueType || 'PM(표준)';
      tasks.push({
        type: 'Task',  // 표준화: 미리보기 카운팅용
        issueTypeName: taskIssueType,
        summary: `${dateStr} 업데이트 일정 헤즈업`,
        startDate: calculationResult.headsUpDate,
        endDate: calculationResult.headsUpDate,
        stageId: 'HEADSUP',
      });

      // Ext./Int. Tasks
      [...calculationResult.table2Entries, ...calculationResult.table3Entries].forEach(entry => {
        if (!entry.parentId) {
          // 부모 Task
          const vars: TemplateVars = {
            date: dateStr,
            headsUp: headsUpStr,
            projectName: currentProject.name,
            taskName: entry.stageName,
            subtaskName: '',
            stageName: entry.stageName,
          };

          const stage = template.stages.find(s => s.id === entry.stageId);
          const summary = getSummary(stage?.jiraSummaryTemplate, vars, false);

          const taskPreview: any = {
            type: 'Task',  // 표준화: 미리보기 카운팅용
            issueTypeName: taskIssueType,  // 설정된 Task 이슈 타입 사용
            summary,
            startDate: entry.startDateTime,
            endDate: entry.endDateTime,
            stageId: entry.stageId,
            children: [],
          };

          // 하위 일감 (Subtasks)
          if (entry.children) {
            taskPreview.children = entry.children.map(child => {
              const childStage = template.stages.find(s => s.id === child.stageId);
              const childVars: TemplateVars = {
                ...vars,
                subtaskName: child.stageName,
                stageName: child.stageName,
              };
              const childSummary = getSummary(childStage?.jiraSummaryTemplate, childVars, true);
              // Subtask 이슈 타입: 설정값 또는 배치명 사용
              const subtaskIssueType = childStage?.jiraSubtaskIssueType || child.stageName;

              return {
                type: 'Sub-task',  // 표준화: 미리보기 카운팅용
                issueTypeName: subtaskIssueType,
                summary: childSummary,
                startDate: child.startDateTime,
                endDate: child.endDateTime,
                stageId: child.stageId,
              };
            });
          }

          tasks.push(taskPreview);
        }
      });

      setJiraPreviewData({
        epic: {
          summary: epicSummary,
          startDate: calculationResult.headsUpDate,
          endDate: calculationResult.table2Entries[calculationResult.table2Entries.length - 1]?.endDateTime || calculationResult.updateDate,
        },
        tasks,
      });

      setJiraPreviewOpen(true);
    } catch (err: any) {
      alert(`미리보기 생성 실패: ${err.message}`);
    }
  };

  // JIRA 생성 확인 (Phase 1)
  const handleConfirmJiraCreate = async () => {
    if (!calculationResult || !jiraPreviewData) return;

    setIsCreatingJira(true);
    let epicMappingId: string | null = null;

    try {
      // 1. Supabase 선삽입 (동시 생성 방지)
      const pendingMapping = await createEpicMappingPending(
        currentProject.id,
        calculationResult.updateDate
      );
      epicMappingId = pendingMapping.id;

      // 2. JIRA Config 로드
      const jiraConfigStr = localStorage.getItem('azrael:jiraConfig');
      if (!jiraConfigStr) {
        throw new Error('JIRA 설정을 찾을 수 없습니다.');
      }
      const jiraConfig = JSON.parse(jiraConfigStr);

      // 3. Edge Function 요청 데이터 생성
      const template = templates.find(t => t.id === currentProject.templateId);
      if (!template) throw new Error('템플릿을 찾을 수 없습니다.');

      const requestData = {
        projectKey: currentProject.jiraProjectKey!,
        epic: jiraPreviewData.epic,
        tasks: [] as any[],
        jiraAuth: {
          email: currentUserEmail,
          apiToken: jiraConfig.apiToken,
        },
      };

      // Tasks 데이터 생성 (미리보기 데이터 활용)
      jiraPreviewData.tasks.forEach((task: any) => {
        // 헤즈업 또는 부모 Task
        requestData.tasks.push({
          stageId: task.stageId,
          type: 'Task',  // 표준화: 'Task'로 통일
          issueTypeName: task.issueTypeName,  // 실제 JIRA 이슈 타입 이름 (예: "PM(표준)")
          summary: task.summary,
          description: '',
          startDate: task.startDate.toISOString(),
          endDate: task.endDate.toISOString(),
          assignee: jiraConfig.accountId, // 현재 사용자
          parentStageId: undefined,
        });

        // Subtasks
        if (task.children) {
          task.children.forEach((subtask: any) => {
            requestData.tasks.push({
              stageId: subtask.stageId,
              type: 'Sub-task',  // 표준화: 'Sub-task'로 통일
              issueTypeName: subtask.issueTypeName,  // 실제 JIRA 이슈 타입 이름
              summary: subtask.summary,
              description: '',
              startDate: subtask.startDate.toISOString(),
              endDate: subtask.endDate.toISOString(),
              assignee: jiraConfig.accountId,
              parentStageId: task.stageId, // 부모 Task stageId
            });
          });
        }
      });

      // 4. Edge Function 호출
      console.log('=== 프론트엔드: Edge Function 요청 데이터 ===');
      console.log('프로젝트 키:', requestData.projectKey);
      console.log('Epic:', requestData.epic);
      console.log('Tasks 개수:', requestData.tasks.length);
      console.log('Tasks 상세:', requestData.tasks.map((t: any) => ({
        type: t.type,
        issueTypeName: t.issueTypeName,
        summary: t.summary,
        stageId: t.stageId,
        parentStageId: t.parentStageId
      })));

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/jira-create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`Edge Function 호출 실패 (${response.status})`);
      }

      const result = await response.json();

      if (!result.success) {
        console.error('JIRA 생성 실패 상세:', result);
        const errorMsg = result.error || 'JIRA 생성 실패';
        const details = result.details ? `\n\n상세: ${result.details}` : '';
        throw new Error(errorMsg + details);
      }

      // 5. Supabase 매핑 업데이트 (Exponential Backoff)
      const epicIssue = result.createdIssues.find((i: any) => i.type === 'Epic');
      if (!epicIssue) {
        throw new Error('Epic 생성 결과를 찾을 수 없습니다.');
      }

      await retryWithBackoff(async () => {
        await updateEpicMapping(
          epicMappingId!,
          epicIssue.id,
          epicIssue.key,
          `https://wemade.atlassian.net/browse/${epicIssue.key}`
        );
      });

      // 6. Task 매핑 저장 (stageId 중복 제거)
      const seenStageIds = new Set<string>();
      const taskMappings: Omit<TaskMapping, 'id' | 'createdAt' | 'updatedAt'>[] = result.createdIssues
        .filter((i: any) => i.type !== 'Epic')
        .filter((i: any) => {
          // 중복된 stageId는 첫 번째만 저장
          if (seenStageIds.has(i.stageId)) {
            console.log(`중복 stageId 스킵: ${i.stageId} (${i.key})`);
            return false;
          }
          seenStageIds.add(i.stageId);
          return true;
        })
        .map((i: any) => ({
          epicMappingId: epicMappingId!,
          stageId: i.stageId,
          isHeadsup: i.stageId === 'HEADSUP',
          taskId: i.id,
          taskKey: i.key,
          taskUrl: `https://wemade.atlassian.net/browse/${i.key}`,
          issueType: i.type as 'Task' | 'Sub-task',
        }));

      await retryWithBackoff(async () => {
        await createTaskMappings(taskMappings);
      });

      // 7. Epic 존재 여부 업데이트
      setHasEpicMapping(true);

      // 8. 성공 메시지
      alert(`JIRA 일감이 생성되었습니다!\n\nEpic: ${epicIssue.key}\n총 ${result.createdIssues.length}개 일감 생성\n\nJIRA에서 확인하세요: https://wemade.atlassian.net/browse/${epicIssue.key}`);
      setJiraPreviewOpen(false);
    } catch (err: any) {
      console.error('JIRA 생성 실패:', err);

      // 롤백: Supabase 임시 레코드 삭제
      if (epicMappingId) {
        try {
          await deleteEpicMapping(epicMappingId);
        } catch (rollbackErr) {
          console.error('롤백 실패:', rollbackErr);
        }
      }

      alert(`JIRA 생성 실패:\n${err.message}`);
    } finally {
      setIsCreatingJira(false);
    }
  };

  // JIRA 업데이트 핸들러 (Phase 1)
  const handleUpdateJira = async () => {
    if (!calculationResult) {
      alert('먼저 일정을 계산해주세요.');
      return;
    }

    try {
      // 1. Epic 매핑 조회
      const epicMapping = await fetchEpicMapping(currentProject.id, calculationResult.updateDate);
      if (!epicMapping || epicMapping.epicId === 'PENDING') {
        alert('생성된 Epic이 없습니다.\n먼저 [JIRA 생성]을 실행하세요.');
        return;
      }

      // 2. Task 매핑 조회
      const existingTaskMappings = await fetchTaskMappings(epicMapping.id!);

      // 3. JIRA Config 로드
      const jiraConfigStr = localStorage.getItem('azrael:jiraConfig');
      if (!jiraConfigStr) {
        alert('JIRA 설정을 찾을 수 없습니다.');
        return;
      }
      const jiraConfig = JSON.parse(jiraConfigStr);

      // 4. 업데이트할 데이터 생성
      const template = templates.find(t => t.id === currentProject.templateId);
      if (!template) return;

      const dateStr = formatDateYYMMDD(calculationResult.updateDate);
      const headsUpStr = formatDateMMDD(calculationResult.headsUpDate);

      const updates: any[] = [];
      let updatedCount = 0;
      let createdCount = 0;

      // Epic 날짜 업데이트
      const epicUpdate = {
        startDate: calculationResult.headsUpDate.toISOString(),
        endDate: (calculationResult.table2Entries[calculationResult.table2Entries.length - 1]?.endDateTime || calculationResult.updateDate).toISOString(),
      };

      // 헤즈업 Task
      const headsupMapping = existingTaskMappings.find(m => m.stageId === 'HEADSUP');
      updates.push({
        issueId: headsupMapping?.taskId,
        stageId: 'HEADSUP',
        summary: `${dateStr} 업데이트 일정 헤즈업`,
        startDate: calculationResult.headsUpDate.toISOString(),
        endDate: calculationResult.headsUpDate.toISOString(),
        assignee: jiraConfig.accountId,
        issueType: 'Task' as const,
      });

      if (headsupMapping) updatedCount++;
      else createdCount++;

      // Ext./Int. Tasks
      [...calculationResult.table2Entries, ...calculationResult.table3Entries].forEach(entry => {
        if (!entry.parentId) {
          // 부모 Task
          const vars: TemplateVars = {
            date: dateStr,
            headsUp: headsUpStr,
            projectName: currentProject.name,
            taskName: entry.stageName,
            subtaskName: '',
            stageName: entry.stageName,
          };

          const stage = template.stages.find(s => s.id === entry.stageId);
          const summary = getSummary(stage?.jiraSummaryTemplate, vars, false);
          const taskMapping = existingTaskMappings.find(m => m.stageId === entry.stageId);

          updates.push({
            issueId: taskMapping?.taskId,
            stageId: entry.stageId,
            summary,
            startDate: entry.startDateTime.toISOString(),
            endDate: entry.endDateTime.toISOString(),
            assignee: entry.jiraAssignee || jiraConfig.accountId,
            issueType: 'Task' as const,
          });

          if (taskMapping) updatedCount++;
          else createdCount++;

          // Subtasks
          if (entry.children) {
            entry.children.forEach(child => {
              const childStage = template.stages.find(s => s.id === child.stageId);
              const childVars: TemplateVars = {
                ...vars,
                subtaskName: child.stageName,
                stageName: child.stageName,
              };
              const childSummary = getSummary(childStage?.jiraSummaryTemplate, childVars, true);
              const subtaskMapping = existingTaskMappings.find(m => m.stageId === child.stageId);

              updates.push({
                issueId: subtaskMapping?.taskId,
                stageId: child.stageId,
                summary: childSummary,
                startDate: child.startDateTime.toISOString(),
                endDate: child.endDateTime.toISOString(),
                assignee: child.jiraAssignee || jiraConfig.accountId,
                issueType: 'Sub-task' as const,
                parentTaskId: taskMapping?.taskId, // 부모 Task ID
              });

              if (subtaskMapping) updatedCount++;
              else createdCount++;
            });
          }
        }
      });

      // 5. 확인 다이얼로그
      if (!confirm(`JIRA 일감을 업데이트하시겠습니까?\n\n업데이트: ${updatedCount}개\n신규 생성: ${createdCount}개`)) {
        return;
      }

      // 6. Edge Function 호출
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/jira-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          epicId: epicMapping.epicId,
          epicUpdate,
          updates,
          jiraAuth: {
            email: currentUserEmail,
            apiToken: jiraConfig.apiToken,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Edge Function 호출 실패 (${response.status})`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'JIRA 업데이트 실패');
      }

      // 7. 신규 생성된 Task 매핑 저장
      if (result.createdIssues && result.createdIssues.length > 0) {
        const newMappings: Omit<TaskMapping, 'id' | 'createdAt' | 'updatedAt'>[] = result.createdIssues.map((i: any) => ({
          epicMappingId: epicMapping.id!,
          stageId: i.stageId,
          isHeadsup: i.stageId === 'HEADSUP',
          taskId: i.id,
          taskKey: i.key,
          taskUrl: `https://wemade.atlassian.net/browse/${i.key}`,
          issueType: i.type as 'Task' | 'Sub-task',
        }));

        await createTaskMappings(newMappings);
      }

      // 8. 성공 메시지
      alert(`JIRA 일감이 업데이트되었습니다!\n\n업데이트: ${result.updatedCount}개\n신규 생성: ${result.createdCount}개`);
    } catch (err: any) {
      console.error('JIRA 업데이트 실패:', err);
      alert(`JIRA 업데이트 실패:\n${err.message}`);
    }
  };

  // 설정 화면 표시
  if (showSettings) {
    return (
      <SettingsScreen
        currentProjectId={currentProject.id}
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
          <Button
            onClick={handleCreateJira}
            disabled={!calculationResult || !hasJiraConfig}
            title={!calculationResult ? '일정 계산 후 사용 가능' : !hasJiraConfig ? 'JIRA 설정 필요' : ''}
          >
            📋 JIRA 생성
          </Button>
          <Button
            onClick={handleUpdateJira}
            disabled={!hasEpicMapping}
            variant="secondary"
            title={!hasEpicMapping ? '먼저 JIRA 생성 필요' : ''}
          >
            🔄 JIRA 업데이트
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

      {/* JIRA 미리보기 모달 (Phase 1) */}
      {jiraPreviewData && (
        <JiraPreviewModal
          isOpen={jiraPreviewOpen}
          onClose={() => setJiraPreviewOpen(false)}
          onConfirm={handleConfirmJiraCreate}
          epic={jiraPreviewData.epic}
          tasks={jiraPreviewData.tasks}
          isCreating={isCreatingJira}
        />
      )}
    </div>
  );
}
