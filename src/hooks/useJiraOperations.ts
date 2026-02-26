/**
 * JIRA 작업 커스텀 훅
 * MainScreen에서 추출된 JIRA 생성/업데이트 로직
 */

import { useState, useEffect } from 'react';
import { Project, CalculationResult, WorkTemplate, Holiday } from '../types';
import {
  calculateDateTimeFromStage,
} from '../lib/businessDays';
import {
  getSummary,
  formatDateYYMMDD,
  formatDateMMDD,
  formatDateDay,
  formatDateFull,
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

interface UseJiraOperationsParams {
  currentProject: Project;
  templates: WorkTemplate[];
  calculationResult: CalculationResult | null;
  currentUserEmail: string;
  holidays: Holiday[];
}

export function useJiraOperations({
  currentProject,
  templates,
  calculationResult,
  currentUserEmail,
  holidays,
}: UseJiraOperationsParams) {
  const [hasJiraConfig, setHasJiraConfig] = useState(false);
  const [hasEpicMapping, setHasEpicMapping] = useState(false);
  const [jiraPreviewOpen, setJiraPreviewOpen] = useState(false);
  const [jiraPreviewData, setJiraPreviewData] = useState<any>(null);
  const [isCreatingJira, setIsCreatingJira] = useState(false);
  const [isJiraLoading, setIsJiraLoading] = useState(false);
  const [jiraLoadingMessage, setJiraLoadingMessage] = useState('');

  // JIRA 설정 확인 - 독립적으로 항상 체크
  useEffect(() => {
    const jiraConfig = localStorage.getItem('azrael:jiraConfig');
    setHasJiraConfig(!!jiraConfig);
  }, [calculationResult]);

  // 프로젝트 변경 시 Epic 매핑 초기화
  useEffect(() => {
    setHasEpicMapping(false);
  }, [currentProject.id]);

  // 계산 후 Epic 매핑 존재 여부 확인
  const checkEpicMapping = async () => {
    if (!calculationResult) return;
    try {
      const epicMapping = await fetchEpicMapping(currentProject.id, calculationResult.updateDate);
      const hasMapping = !!(epicMapping && epicMapping.epicId !== 'PENDING');
      setHasEpicMapping(hasMapping);
    } catch (err) {
      console.error('[checkEpicMapping] Epic 매핑 확인 실패:', err);
      setHasEpicMapping(false);
    }
  };

  // JIRA 생성 핸들러
  const handleCreateJira = async () => {
    if (!calculationResult) {
      alert('먼저 일정을 계산해주세요.');
      return;
    }

    const jiraConfigStr = localStorage.getItem('azrael:jiraConfig');
    if (!jiraConfigStr) {
      alert('JIRA 연동 설정이 필요합니다.\n설정 → JIRA 연동 탭에서 API Token을 설정해주세요.');
      return;
    }

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
        const jiraConfig = JSON.parse(jiraConfigStr);
        const checkResult = await checkJiraIssueExists(existingEpic.epicKey, {
          email: currentUserEmail,
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
          setIsJiraLoading(false);
          alert(`이미 생성된 Epic이 있습니다 (${existingEpic.epicKey}).\n\n[JIRA 업데이트] 버튼을 사용하여 일정을 변경하세요.`);
          return;
        } else {
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

      const dateStr = formatDateYYMMDD(calculationResult.updateDate);
      const headsUpStr = formatDateMMDD(calculationResult.headsUpDate);

      // 통합 변수 체계 (v1.2) — 날짜 3형식
      const updateDateDay = formatDateDay(calculationResult.updateDate);
      const updateDateFull = formatDateFull(calculationResult.updateDate);
      const headsUpDay = formatDateDay(calculationResult.headsUpDate);
      const headsUpFull = formatDateFull(calculationResult.headsUpDate);
      const iosReviewStr = calculationResult.iosReviewDate ? formatDateMMDD(calculationResult.iosReviewDate) : '';
      const iosReviewDay = calculationResult.iosReviewDate ? formatDateDay(calculationResult.iosReviewDate) : '';
      const iosReviewFull = calculationResult.iosReviewDate ? formatDateFull(calculationResult.iosReviewDate) : '';
      const paidProductStr = calculationResult.paidProductDate ? formatDateMMDD(calculationResult.paidProductDate) : '';
      const paidProductDay = calculationResult.paidProductDate ? formatDateDay(calculationResult.paidProductDate) : '';
      const paidProductFull = calculationResult.paidProductDate ? formatDateFull(calculationResult.paidProductDate) : '';

      const epicSummary = currentProject.jiraEpicTemplate
        ? currentProject.jiraEpicTemplate.replace(/{date}/g, dateStr).replace(/{projectName}/g, currentProject.name).replace(/{headsUp}/g, headsUpStr)
        : `${dateStr} 업데이트`;

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
        type: 'Task',
        issueTypeName: taskIssueType,
        summary: headsupSummary,
        jiraDescription: currentProject.jiraHeadsupDescription || undefined,
        startDate: headsupStart,
        endDate: headsupEnd,
        stageId: 'HEADSUP',
      });

      // Ext./Int. Tasks - WorkStage 기준으로 직접 생성
      template.stages
        .filter(stage => stage.depth === 0)
        .filter(stage =>
          stage.tableTargets.includes('table2') ||
          stage.tableTargets.includes('table3')
        )
        .forEach(stage => {
          const { startDateTime, endDateTime } = calculateDateTimeFromStage(
            calculationResult.updateDate,
            stage,
            holidays
          );

          const vars: TemplateVars = {
            date: dateStr,
            updateDate: formatDateMMDD(calculationResult.updateDate),
            updateDateDay,
            updateDateFull,
            headsUp: headsUpStr,
            headsUpDay,
            headsUpFull,
            iosReviewDate: iosReviewStr,
            iosReviewDateDay: iosReviewDay,
            iosReviewDateFull: iosReviewFull,
            paidProductDate: paidProductStr,
            paidProductDateDay: paidProductDay,
            paidProductDateFull: paidProductFull,
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
            jiraAssigneeId: stage.jiraAssigneeId || null,
            jiraDescription: stage.jiraDescription || '',
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
                jiraAssigneeId: childStage.jiraAssigneeId || null,
                jiraDescription: childStage.jiraDescription || '',
              };
            });
          }

          tasks.push(taskPreview);
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

  // JIRA 생성 확인
  const handleConfirmJiraCreate = async () => {
    if (!calculationResult || !jiraPreviewData) return;

    setIsCreatingJira(true);
    let epicMappingId: string | null = null;

    try {
      const pendingMapping = await createEpicMappingPending(
        currentProject.id,
        calculationResult.updateDate
      );
      epicMappingId = pendingMapping.id;

      const jiraConfigStr = localStorage.getItem('azrael:jiraConfig');
      if (!jiraConfigStr) {
        throw new Error('JIRA 설정을 찾을 수 없습니다.');
      }
      const jiraConfig = JSON.parse(jiraConfigStr);

      const template = templates.find(t => t.id === currentProject.templateId);
      if (!template) throw new Error('템플릿을 찾을 수 없습니다.');

      const requestData = {
        projectKey: currentProject.jiraProjectKey!,
        epic: {
          summary: jiraPreviewData.epic.summary,
          startDate: jiraPreviewData.epic.startDate.toISOString(),
          endDate: jiraPreviewData.epic.endDate.toISOString(),
        },
        tasks: [] as any[],
        jiraAuth: {
          email: currentUserEmail,
          apiToken: jiraConfig.apiToken,
        },
      };

      jiraPreviewData.tasks.forEach((task: any) => {
        requestData.tasks.push({
          stageId: task.stageId,
          type: 'Task',
          issueTypeName: task.issueTypeName,
          summary: task.summary,
          description: task.jiraDescription && task.jiraDescription.trim() !== '' ? task.jiraDescription : null,
          startDate: task.startDate.toISOString(),
          endDate: task.endDate.toISOString(),
          assignee: task.jiraAssigneeId || jiraConfig.accountId,
          parentStageId: undefined,
        });

        if (task.children) {
          task.children.forEach((subtask: any) => {
            requestData.tasks.push({
              stageId: subtask.stageId,
              type: 'Sub-task',
              issueTypeName: subtask.issueTypeName,
              summary: subtask.summary,
              description: subtask.jiraDescription && subtask.jiraDescription.trim() !== '' ? subtask.jiraDescription : null,
              startDate: subtask.startDate.toISOString(),
              endDate: subtask.endDate.toISOString(),
              assignee: subtask.jiraAssigneeId || jiraConfig.accountId,
              parentStageId: task.stageId,
            });
          });
        }
      });

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

      const seenStageIds = new Set<string>();
      const taskMappings: Omit<TaskMapping, 'id' | 'createdAt' | 'updatedAt'>[] = result.createdIssues
        .filter((i: any) => i.type !== 'Epic')
        .filter((i: any) => {
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

      setHasEpicMapping(true);

      alert(`JIRA 일감이 생성되었습니다!\n\nEpic: ${epicIssue.key}\n총 ${result.createdIssues.length}개 일감 생성\n\nJIRA에서 확인하세요: https://wemade.atlassian.net/browse/${epicIssue.key}`);
      setJiraPreviewOpen(false);
    } catch (err: any) {
      console.error('JIRA 생성 실패:', err);

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

  // JIRA 업데이트 핸들러
  const handleUpdateJira = async () => {
    if (!calculationResult) {
      alert('먼저 일정을 계산해주세요.');
      return;
    }

    setIsJiraLoading(true);
    setJiraLoadingMessage('JIRA 일감 확인 중...');

    try {
      const jiraConfigStr = localStorage.getItem('azrael:jiraConfig');
      if (!jiraConfigStr) {
        setIsJiraLoading(false);
        alert('JIRA 설정을 찾을 수 없습니다.');
        return;
      }
      const jiraConfig = JSON.parse(jiraConfigStr);

      const epicMapping = await fetchEpicMapping(currentProject.id, calculationResult.updateDate);
      if (!epicMapping || epicMapping.epicId === 'PENDING') {
        setIsJiraLoading(false);
        alert('생성된 Epic이 없습니다.\n먼저 [JIRA 생성]을 실행하세요.');
        return;
      }

      const checkResult = await checkJiraIssueExists(epicMapping.epicKey, {
        email: currentUserEmail,
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
        setJiraLoadingMessage('매핑 정리 중...');
        await deleteEpicMapping(epicMapping.id!);
        setIsJiraLoading(false);
        alert(
          `JIRA에서 Epic (${epicMapping.epicKey})이 삭제되었습니다.\n\n` +
          `[JIRA 생성] 버튼을 사용하여 새로 생성해주세요.`
        );
        return;
      }

      const existingTaskMappings = await fetchTaskMappings(epicMapping.id!);

      const template = templates.find(t => t.id === currentProject.templateId);
      if (!template) return;

      const dateStr = formatDateYYMMDD(calculationResult.updateDate);
      const headsUpStr = formatDateMMDD(calculationResult.headsUpDate);

      // 통합 변수 체계 (v1.2) — 날짜 3형식
      const updateDateDay2 = formatDateDay(calculationResult.updateDate);
      const updateDateFull2 = formatDateFull(calculationResult.updateDate);
      const headsUpDay2 = formatDateDay(calculationResult.headsUpDate);
      const headsUpFull2 = formatDateFull(calculationResult.headsUpDate);
      const iosReviewStr2 = calculationResult.iosReviewDate ? formatDateMMDD(calculationResult.iosReviewDate) : '';
      const iosReviewDay2 = calculationResult.iosReviewDate ? formatDateDay(calculationResult.iosReviewDate) : '';
      const iosReviewFull2 = calculationResult.iosReviewDate ? formatDateFull(calculationResult.iosReviewDate) : '';
      const paidProductStr2 = calculationResult.paidProductDate ? formatDateMMDD(calculationResult.paidProductDate) : '';
      const paidProductDay2 = calculationResult.paidProductDate ? formatDateDay(calculationResult.paidProductDate) : '';
      const paidProductFull2 = calculationResult.paidProductDate ? formatDateFull(calculationResult.paidProductDate) : '';

      const updates: any[] = [];
      let updatedCount = 0;
      let createdCount = 0;

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
        description: currentProject.jiraHeadsupDescription || '',
        startDate: updateHeadsupStart.toISOString(),
        endDate: updateHeadsupEnd.toISOString(),
        assignee: jiraConfig.accountId,
        issueType: 'Task' as const,
      });

      if (headsupMapping) updatedCount++;
      else createdCount++;

      // Ext./Int. Tasks
      template.stages
        .filter(stage => stage.depth === 0)
        .filter(stage =>
          stage.tableTargets.includes('table2') ||
          stage.tableTargets.includes('table3')
        )
        .forEach(stage => {
          const { startDateTime, endDateTime } = calculateDateTimeFromStage(
            calculationResult.updateDate,
            stage,
            holidays
          );

          const vars: TemplateVars = {
            date: dateStr,
            updateDate: formatDateMMDD(calculationResult.updateDate),
            updateDateDay: updateDateDay2,
            updateDateFull: updateDateFull2,
            headsUp: headsUpStr,
            headsUpDay: headsUpDay2,
            headsUpFull: headsUpFull2,
            iosReviewDate: iosReviewStr2,
            iosReviewDateDay: iosReviewDay2,
            iosReviewDateFull: iosReviewFull2,
            paidProductDate: paidProductStr2,
            paidProductDateDay: paidProductDay2,
            paidProductDateFull: paidProductFull2,
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
            description: stage.jiraDescription || '',
            startDate: startDateTime.toISOString(),
            endDate: endDateTime.toISOString(),
            assignee: stage.jiraAssigneeId || jiraConfig.accountId,
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
                description: childStage.jiraDescription || '',
                startDate: childStart.toISOString(),
                endDate: childEnd.toISOString(),
                assignee: childStage.jiraAssigneeId || jiraConfig.accountId,
                issueType: 'Sub-task' as const,
                parentTaskId: taskMapping?.taskId,
              });

              if (subtaskMapping) updatedCount++;
              else createdCount++;
            });
          }
        });

      setIsJiraLoading(false);
      if (!confirm(`JIRA 일감을 업데이트하시겠습니까?\n\n업데이트: ${updatedCount}개\n신규 생성: ${createdCount}개`)) {
        return;
      }

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

      setIsJiraLoading(false);
      alert(`JIRA 일감이 업데이트되었습니다!\n\n업데이트: ${result.updatedCount}개\n신규 생성: ${result.createdCount}개`);
    } catch (err: any) {
      setIsJiraLoading(false);
      console.error('JIRA 업데이트 실패:', err);
      alert(`JIRA 업데이트 실패:\n${err.message}`);
    }
  };

  return {
    handleCreateJira,
    handleConfirmJiraCreate,
    handleUpdateJira,
    checkEpicMapping,
    hasJiraConfig,
    hasEpicMapping,
    setHasEpicMapping,
    jiraPreviewOpen,
    setJiraPreviewOpen,
    jiraPreviewData,
    isCreatingJira,
    isJiraLoading,
    jiraLoadingMessage,
  };
}
