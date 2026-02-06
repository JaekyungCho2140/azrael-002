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
import { EmailGeneratorModal } from './EmailGeneratorModal';
import { loadHolidays, getUserState } from '../lib/storage';
import { useSaveCalculationResult, useJiraAssignees } from '../hooks/useSupabase';
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
  checkJiraIssueExists,
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
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showVisualization, setShowVisualization] = useState(true);

  // JIRA 관련 상태 (Phase 1)
  const [hasJiraConfig, setHasJiraConfig] = useState(false);
  const [hasEpicMapping, setHasEpicMapping] = useState(false);
  const [jiraPreviewOpen, setJiraPreviewOpen] = useState(false);
  const [jiraPreviewData, setJiraPreviewData] = useState<any>(null);
  const [isCreatingJira, setIsCreatingJira] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [isJiraLoading, setIsJiraLoading] = useState(false);
  const [jiraLoadingMessage, setJiraLoadingMessage] = useState('');

  // Phase 1.7: 계산 결과 Supabase 연동
  const saveMutation = useSaveCalculationResult();

  // JIRA 담당자 목록 조회 (이름 매핑용)
  const { data: jiraAssignees = [] } = useJiraAssignees();

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

  // 프로젝트 변경 시 초기화
  useEffect(() => {
    // Phase 1.7: Supabase 연동으로 변경 - 업데이트일 입력 시 서버에서 로드
    setCalculationResult(null);
    setUpdateDate('');
    setHasEpicMapping(false);
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
            // Phase 1.7: WorkStage에서 부가 정보 가져오기
            description: stage.description || '',
            assignee: stage.assignee || '',
            jiraDescription: stage.jiraDescription || '',
            // JIRA 담당자: Account ID → 이름 매핑
            jiraAssignee: stage.jiraAssigneeId
              ? jiraAssignees.find((a: any) => a.jiraAccountId === stage.jiraAssigneeId)?.name || stage.jiraAssigneeId
              : '',
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
                // Phase 1.7: WorkStage에서 부가 정보 가져오기
                description: childStage.description || '',
                jiraDescription: childStage.jiraDescription || '',
                // JIRA 담당자: Account ID → 이름 매핑
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
      setHasEpicMapping(hasMapping);
    }).catch(err => {
      console.error('[handleCalculate] Epic 매핑 확인 실패:', err);
      setHasEpicMapping(false);
    });
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

    // Epic 중복 체크 (JIRA 실제 존재 확인 포함)
    setIsJiraLoading(true);
    setJiraLoadingMessage('JIRA 일감 확인 중...');
    try {
      const existingEpic = await fetchEpicMapping(currentProject.id, calculationResult.updateDate);
      if (existingEpic && existingEpic.epicId !== 'PENDING') {
        // JIRA API로 Epic 실제 존재 여부 확인
        const jiraConfig = JSON.parse(jiraConfigStr);
        const checkResult = await checkJiraIssueExists(existingEpic.epicKey, {
          email: currentUserEmail,  // Basic Auth에는 실제 이메일 필요
          apiToken: jiraConfig.apiToken,
        });

        if (checkResult.errorCode === 'UNAUTHORIZED') {
          setIsJiraLoading(false);
          alert('JIRA 인증에 실패했습니다.\n설정 → JIRA 연동 탭에서 API Token을 확인해주세요.');
          return;
        }

        if (checkResult.errorCode === 'NETWORK_ERROR') {
          setIsJiraLoading(false);
          alert(`JIRA 연결 오류: ${checkResult.errorMessage}\n\n잠시 후 다시 시도해주세요.`);
          return;
        }

        if (checkResult.exists) {
          // Epic이 실제로 JIRA에 존재 → 기존 안내
          setIsJiraLoading(false);
          alert(`이미 생성된 Epic이 있습니다 (${existingEpic.epicKey}).\n\n[JIRA 업데이트] 버튼을 사용하여 일정을 변경하세요.`);
          return;
        } else {
          // Epic이 JIRA에서 삭제됨 → 매핑 정리 후 재생성 제안
          setIsJiraLoading(false);
          const shouldCleanup = confirm(
            `JIRA에서 Epic (${existingEpic.epicKey})이 삭제되었습니다.\n\n` +
            `매핑 정보를 정리하고 새로 생성하시겠습니까?\n` +
            `(기존 매핑이 삭제됩니다)`
          );

          if (shouldCleanup) {
            setIsJiraLoading(true);
            setJiraLoadingMessage('매핑 정리 중...');
            await deleteEpicMapping(existingEpic.id!);
            // 매핑 삭제 후 계속 생성 진행
          } else {
            return;
          }
        }
      }
    } catch (err: any) {
      setIsJiraLoading(false);
      alert(`Epic 확인 실패: ${err.message}`);
      return;
    }
    setIsJiraLoading(false);

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
      const headsupSummary = currentProject.jiraHeadsupTemplate
        ? currentProject.jiraHeadsupTemplate.replace(/{date}/g, dateStr).replace(/{projectName}/g, currentProject.name).replace(/{headsUp}/g, headsUpStr)
        : `${dateStr} 업데이트 일정 헤즈업`;
      const headsupStart = new Date(calculationResult.headsUpDate);
      headsupStart.setHours(10, 0, 0, 0);
      const headsupEnd = new Date(calculationResult.headsUpDate);
      headsupEnd.setHours(18, 0, 0, 0);
      tasks.push({
        type: 'Task',  // 표준화: 미리보기 카운팅용
        issueTypeName: taskIssueType,
        summary: headsupSummary,
        jiraDescription: currentProject.jiraHeadsupDescription || undefined,
        startDate: headsupStart,
        endDate: headsupEnd,
        stageId: 'HEADSUP',
      });

      // Ext./Int. Tasks - WorkStage 기준으로 직접 생성
      const holidays = loadHolidays();

      template.stages
        .filter(stage => stage.depth === 0)  // 부모만
        .filter(stage =>
          stage.tableTargets.includes('table2') ||
          stage.tableTargets.includes('table3')
        )
        .forEach(stage => {
          // 날짜 계산: 업데이트일 + stage offset
          const { startDateTime, endDateTime } = calculateDateTimeFromStage(
            calculationResult.updateDate,
            stage,
            holidays
          );

          // 템플릿 변수
          const vars: TemplateVars = {
            date: dateStr,
            headsUp: headsUpStr,
            projectName: currentProject.name,
            taskName: stage.name,
            subtaskName: '',
            stageName: stage.name,
          };

          const summary = getSummary(stage.jiraSummaryTemplate, vars, false);

          const taskPreview: any = {
            type: 'Task',
            issueTypeName: taskIssueType,
            summary,
            startDate: startDateTime,
            endDate: endDateTime,
            stageId: stage.id,
            jiraAssigneeId: stage.jiraAssigneeId || null,  // Phase 1.7: WorkStage 담당자
            jiraDescription: stage.jiraDescription || '',  // Phase 1.7: JIRA 설명
            children: [],
          };

          // 하위 일감 (Subtasks)
          const childStages = template.stages.filter(s => s.parentStageId === stage.id);

          if (childStages.length > 0) {
            taskPreview.children = childStages.map(childStage => {
              const { startDateTime: childStart, endDateTime: childEnd } = calculateDateTimeFromStage(
                calculationResult.updateDate,
                childStage,
                holidays
              );

              const childVars: TemplateVars = {
                ...vars,
                subtaskName: childStage.name,
                stageName: childStage.name,
              };

              const childSummary = getSummary(childStage.jiraSummaryTemplate, childVars, true);
              const subtaskIssueType = childStage.jiraSubtaskIssueType || childStage.name;

              return {
                type: 'Sub-task',
                issueTypeName: subtaskIssueType,
                summary: childSummary,
                startDate: childStart,
                endDate: childEnd,
                stageId: childStage.id,
                jiraAssigneeId: childStage.jiraAssigneeId || null,  // Phase 1.7: 하위 일감 담당자
                jiraDescription: childStage.jiraDescription || '',  // Phase 1.7: JIRA 설명
              };
            });
          }

          tasks.push(taskPreview);
        });

      setJiraPreviewData({
        epic: {
          summary: epicSummary,
          startDate: calculationResult.headsUpDate,  // Date 객체 (미리보기용)
          endDate: calculationResult.table2Entries[calculationResult.table2Entries.length - 1]?.endDateTime || calculationResult.updateDate,  // Date 객체
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
        epic: {
          summary: jiraPreviewData.epic.summary,
          startDate: jiraPreviewData.epic.startDate.toISOString(),  // Date → ISO string
          endDate: jiraPreviewData.epic.endDate.toISOString(),  // Date → ISO string
        },
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
          description: task.jiraDescription && task.jiraDescription.trim() !== '' ? task.jiraDescription : null,  // Phase 1.7: WorkStage JIRA 설명 (평문 → Edge Function에서 ADF 변환)
          startDate: task.startDate.toISOString(),
          endDate: task.endDate.toISOString(),
          assignee: task.jiraAssigneeId || jiraConfig.accountId, // Phase 1.7: WorkStage 담당자 또는 현재 사용자
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
              description: subtask.jiraDescription && subtask.jiraDescription.trim() !== '' ? subtask.jiraDescription : null,  // Phase 1.7: WorkStage JIRA 설명 (평문 → Edge Function에서 ADF 변환)
              startDate: subtask.startDate.toISOString(),
              endDate: subtask.endDate.toISOString(),
              assignee: subtask.jiraAssigneeId || jiraConfig.accountId,  // Phase 1.7: WorkStage 담당자
              parentStageId: task.stageId, // 부모 Task stageId
            });
          });
        }
      });

      // 4. Edge Function 호출

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

    setIsJiraLoading(true);
    setJiraLoadingMessage('JIRA 일감 확인 중...');

    try {
      // 1. JIRA Config 로드 (Epic 존재 확인에 필요하므로 먼저 로드)
      const jiraConfigStr = localStorage.getItem('azrael:jiraConfig');
      if (!jiraConfigStr) {
        setIsJiraLoading(false);
        alert('JIRA 설정을 찾을 수 없습니다.');
        return;
      }
      const jiraConfig = JSON.parse(jiraConfigStr);

      // 2. Epic 매핑 조회
      const epicMapping = await fetchEpicMapping(currentProject.id, calculationResult.updateDate);
      if (!epicMapping || epicMapping.epicId === 'PENDING') {
        setIsJiraLoading(false);
        alert('생성된 Epic이 없습니다.\n먼저 [JIRA 생성]을 실행하세요.');
        return;
      }

      // 3. JIRA API로 Epic 실제 존재 여부 확인
      const checkResult = await checkJiraIssueExists(epicMapping.epicKey, {
        email: currentUserEmail,  // Basic Auth에는 실제 이메일 필요
        apiToken: jiraConfig.apiToken,
      });
      if (checkResult.errorCode === 'UNAUTHORIZED') {
        setIsJiraLoading(false);
        alert('JIRA 인증에 실패했습니다.\n설정 → JIRA 연동 탭에서 API Token을 확인해주세요.');
        return;
      }

      if (checkResult.errorCode === 'NETWORK_ERROR') {
        setIsJiraLoading(false);
        alert(`JIRA 연결 오류: ${checkResult.errorMessage}\n\n잠시 후 다시 시도해주세요.`);
        return;
      }

      if (!checkResult.exists) {
        // Epic이 JIRA에서 삭제됨 → 매핑 정리 후 재생성 안내
        setJiraLoadingMessage('매핑 정리 중...');
        await deleteEpicMapping(epicMapping.id!);
        setIsJiraLoading(false);
        alert(
          `JIRA에서 Epic (${epicMapping.epicKey})이 삭제되었습니다.\n\n` +
          `[JIRA 생성] 버튼을 사용하여 새로 생성해주세요.`
        );
        return;
      }

      // 4. Task 매핑 조회
      const existingTaskMappings = await fetchTaskMappings(epicMapping.id!);

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
      const updateHeadsupStart = new Date(calculationResult.headsUpDate);
      updateHeadsupStart.setHours(10, 0, 0, 0);
      const updateHeadsupEnd = new Date(calculationResult.headsUpDate);
      updateHeadsupEnd.setHours(18, 0, 0, 0);
      updates.push({
        issueId: headsupMapping?.taskId,
        stageId: 'HEADSUP',
        summary: `${dateStr} 업데이트 일정 헤즈업`,
        description: currentProject.jiraHeadsupDescription || '',  // Phase 1.7: 헤즈업 설명
        startDate: updateHeadsupStart.toISOString(),
        endDate: updateHeadsupEnd.toISOString(),
        assignee: jiraConfig.accountId,
        issueType: 'Task' as const,
      });

      if (headsupMapping) updatedCount++;
      else createdCount++;

      // Ext./Int. Tasks - WorkStage 기준으로 직접 생성
      const holidays = loadHolidays();

      template.stages
        .filter(stage => stage.depth === 0)  // 부모만
        .filter(stage =>
          stage.tableTargets.includes('table2') ||
          stage.tableTargets.includes('table3')
        )
        .forEach(stage => {
          // 날짜 계산: 업데이트일 + stage offset
          const { startDateTime, endDateTime } = calculateDateTimeFromStage(
            calculationResult.updateDate,
            stage,
            holidays
          );

          // 템플릿 변수
          const vars: TemplateVars = {
            date: dateStr,
            headsUp: headsUpStr,
            projectName: currentProject.name,
            taskName: stage.name,
            subtaskName: '',
            stageName: stage.name,
          };

          const summary = getSummary(stage.jiraSummaryTemplate, vars, false);
          const taskMapping = existingTaskMappings.find(m => m.stageId === stage.id);

          updates.push({
            issueId: taskMapping?.taskId,
            stageId: stage.id,
            summary,
            description: stage.jiraDescription || '',  // Phase 1.7: WorkStage JIRA 설명
            startDate: startDateTime.toISOString(),
            endDate: endDateTime.toISOString(),
            assignee: stage.jiraAssigneeId || jiraConfig.accountId,  // Phase 1.7: WorkStage 담당자 우선
            issueType: 'Task' as const,
          });

          if (taskMapping) updatedCount++;
          else createdCount++;

          // Subtasks
          const childStages = template.stages.filter(s => s.parentStageId === stage.id);

          if (childStages.length > 0) {
            childStages.forEach(childStage => {
              const { startDateTime: childStart, endDateTime: childEnd } = calculateDateTimeFromStage(
                calculationResult.updateDate,
                childStage,
                holidays
              );

              const childVars: TemplateVars = {
                ...vars,
                subtaskName: childStage.name,
                stageName: childStage.name,
              };

              const childSummary = getSummary(childStage.jiraSummaryTemplate, childVars, true);
              const subtaskMapping = existingTaskMappings.find(m => m.stageId === childStage.id);

              updates.push({
                issueId: subtaskMapping?.taskId,
                stageId: childStage.id,
                summary: childSummary,
                description: childStage.jiraDescription || '',  // Phase 1.7: WorkStage JIRA 설명
                startDate: childStart.toISOString(),
                endDate: childEnd.toISOString(),
                assignee: childStage.jiraAssigneeId || jiraConfig.accountId,  // Phase 1.7: WorkStage 담당자 우선
                issueType: 'Sub-task' as const,
                parentTaskId: taskMapping?.taskId, // 부모 Task ID
              });

              if (subtaskMapping) updatedCount++;
              else createdCount++;
            });
          }
        });

      // 5. 확인 다이얼로그 (로딩 해제 후 사용자 입력 대기)
      setIsJiraLoading(false);
      if (!confirm(`JIRA 일감을 업데이트하시겠습니까?\n\n업데이트: ${updatedCount}개\n신규 생성: ${createdCount}개`)) {
        return;
      }

      // 6. Edge Function 호출
      setIsJiraLoading(true);
      setJiraLoadingMessage('JIRA 업데이트 중...');

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
      setIsJiraLoading(false);
      alert(`JIRA 일감이 업데이트되었습니다!\n\n업데이트: ${result.updatedCount}개\n신규 생성: ${result.createdCount}개`);
    } catch (err: any) {
      setIsJiraLoading(false);
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
        calculationResult={calculationResult}
      />
    );
  }

  return (
    <div className="main-screen">
      {/* JIRA 로딩 오버레이 */}
      {isJiraLoading && (
        <div className="jira-loading-overlay">
          <div className="jira-loading-content">
            <div className="jira-loading-spinner"></div>
            <p>{jiraLoadingMessage}</p>
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
            <GanttChart
              entries={calculationResult.table1Entries}
              chartId="gantt-table1"
              color="#FF9800"
            />
          )}

          {/* 테이블 2 */}
          <ScheduleTable
            title={`Ext. ${calculationResult.updateDate.getFullYear().toString().substring(2)}-${String(calculationResult.updateDate.getMonth() + 1).padStart(2, '0')}-${String(calculationResult.updateDate.getDate()).padStart(2, '0')} 업데이트 일정표`}
            entries={calculationResult.table2Entries}
            type="table2"
          />

          {/* 간트 차트 2 */}
          {showVisualization && (
            <GanttChart
              entries={calculationResult.table2Entries}
              chartId="gantt-table2"
              color="#009688"
            />
          )}

          {/* 테이블 3 */}
          <ScheduleTable
            title={`Int. ${calculationResult.updateDate.getFullYear().toString().substring(2)}-${String(calculationResult.updateDate.getMonth() + 1).padStart(2, '0')}-${String(calculationResult.updateDate.getDate()).padStart(2, '0')} 업데이트 일정표`}
            entries={calculationResult.table3Entries}
            type="table3"
          />

          {/* 간트 차트 3 */}
          {showVisualization && (
            <GanttChart
              entries={calculationResult.table3Entries}
              chartId="gantt-table3"
              color="#673AB7"
            />
          )}

          {/* 캘린더 뷰 */}
          {showVisualization && (
            <CalendarView
              table1Entries={calculationResult.table1Entries}
              table2Entries={calculationResult.table2Entries}
              table3Entries={calculationResult.table3Entries}
              updateDate={calculationResult.updateDate}
            />
          )}
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

      <EmailGeneratorModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        projectId={currentProject.id}
        project={currentProject}
        updateDate={new Date(updateDate.split(' ')[0])}
        calculationResult={calculationResult}
      />
    </div>
  );
}
