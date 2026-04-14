import { useState, useEffect } from 'react';
import { Project, WorkTemplate, WorkStage } from '../../types';
import { Button } from '../Button';
import { StageEditModal } from '../StageEditModal';
import { useSaveTemplate } from '../../hooks/useSupabase';
import type { StageClipboard } from '../SettingsScreen';

function recalculateOrders(orderedParents: WorkStage[], allStages: WorkStage[]): WorkStage[] {
  const result: WorkStage[] = [];
  orderedParents.forEach((parent, parentIdx) => {
    const newParentOrder = parentIdx + 1;
    result.push({ ...parent, order: newParentOrder });
    const children = allStages
      .filter(s => s.parentStageId === parent.id)
      .sort((a, b) => a.order - b.order);
    children.forEach((child, childIdx) => {
      result.push({ ...child, order: newParentOrder + (childIdx + 1) * 0.1 });
    });
  });
  return result;
}

interface SettingsStagesTabProps {
  selectedProjectId: string;
  onSelectedProjectIdChange: (id: string) => void;
  isAdmin: boolean;
  projects: Project[];
  selectedTemplate: WorkTemplate | undefined;
  stageClipboard: StageClipboard | null;
  onStageClipboardChange: (clipboard: StageClipboard | null) => void;
}

export function SettingsStagesTab({
  selectedProjectId,
  onSelectedProjectIdChange,
  isAdmin,
  projects,
  selectedTemplate,
  stageClipboard,
  onStageClipboardChange,
}: SettingsStagesTabProps) {
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<WorkStage | undefined>();
  const [selectedStageIds, setSelectedStageIds] = useState<Set<string>>(new Set());

  const saveTemplateMutation = useSaveTemplate();

  // 프로젝트 변경 시 선택 초기화
  useEffect(() => {
    setSelectedStageIds(new Set());
  }, [selectedProjectId]);

  const handleToggleStage = (stageId: string, isParent: boolean) => {
    setSelectedStageIds(prev => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
        // 부모 해제 시 자식도 해제
        if (isParent && selectedTemplate) {
          selectedTemplate.stages
            .filter(s => s.parentStageId === stageId)
            .forEach(child => next.delete(child.id));
        }
      } else {
        next.add(stageId);
        // 부모 선택 시 자식도 선택
        if (isParent && selectedTemplate) {
          selectedTemplate.stages
            .filter(s => s.parentStageId === stageId)
            .forEach(child => next.add(child.id));
        }
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (!selectedTemplate) return;
    const allIds = selectedTemplate.stages.map(s => s.id);
    if (allIds.every(id => selectedStageIds.has(id))) {
      setSelectedStageIds(new Set());
    } else {
      setSelectedStageIds(new Set(allIds));
    }
  };

  const handleCopyStages = () => {
    if (!selectedTemplate || selectedStageIds.size === 0) return;
    const selectedProject = projects?.find(p => p.id === selectedProjectId);
    if (!selectedProject) return;

    const selectedParents = selectedTemplate.stages.filter(
      s => s.depth === 0 && selectedStageIds.has(s.id)
    );
    const childIdsInParents = new Set<string>();

    const items: StageClipboard['items'] = [];

    // 부모 단계 처리: 자식 포함
    for (const parent of selectedParents) {
      const children = selectedTemplate.stages.filter(s => s.parentStageId === parent.id);
      children.forEach(c => childIdsInParents.add(c.id));
      items.push({
        stage: { ...parent },
        children: children.map(c => ({ ...c })),
        type: 'parent',
      });
    }

    // 부모가 선택 안 된 자식만 단독 항목으로 추가
    const orphanChildren = selectedTemplate.stages.filter(
      s => s.depth === 1 && selectedStageIds.has(s.id) && !childIdsInParents.has(s.id)
    );
    for (const child of orphanChildren) {
      items.push({
        stage: { ...child },
        children: [],
        type: 'child',
      });
    }

    if (items.length === 0) return;

    onStageClipboardChange({
      sourceProjectId: selectedProjectId,
      sourceProjectName: selectedProject.name,
      items,
    });

    setSelectedStageIds(new Set());
    const totalCount = items.reduce((acc, item) => acc + 1 + item.children.length, 0);
    alert(`${totalCount}개 업무 단계가 복사되었습니다.`);
  };

  const handlePasteStages = () => {
    if (!stageClipboard || stageClipboard.items.length === 0) return;

    const selectedProject = projects?.find(p => p.id === selectedProjectId);
    if (!selectedProject) return;

    const existingStages = selectedTemplate?.stages ?? [];

    // 자식만 복사된 경우 부모 선택 필요
    const hasOnlyChildren = stageClipboard.items.every(item => item.type === 'child');
    let targetParentId: string | null = null;

    if (hasOnlyChildren) {
      const parentStages = existingStages.filter(s => s.depth === 0);
      if (parentStages.length === 0) {
        alert('부모 단계가 없습니다. 먼저 부모 업무 단계를 추가해주세요.');
        return;
      }
      if (parentStages.length === 1) {
        targetParentId = parentStages[0].id;
      } else {
        const parentOptions = parentStages.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
        const choice = prompt(`하위 일감을 추가할 부모 단계를 선택하세요:\n${parentOptions}\n\n번호를 입력하세요:`);
        if (!choice) return;
        const idx = parseInt(choice, 10) - 1;
        if (isNaN(idx) || idx < 0 || idx >= parentStages.length) {
          alert('잘못된 선택입니다.');
          return;
        }
        targetParentId = parentStages[idx].id;
      }
    }

    // 새 stages 생성
    const newStages: WorkStage[] = [];
    const parentMaxOrder = existingStages.filter(s => s.depth === 0).length > 0
      ? Math.max(...existingStages.filter(s => s.depth === 0).map(s => Math.floor(s.order)))
      : 0;

    let parentOrderOffset = 0;

    for (const item of stageClipboard.items) {
      if (item.type === 'parent') {
        const newParentId = crypto.randomUUID();
        const newParentOrder = parentMaxOrder + 1 + parentOrderOffset;
        parentOrderOffset++;

        newStages.push({
          ...item.stage,
          id: newParentId,
          order: newParentOrder,
          parentStageId: undefined,
        });

        for (let i = 0; i < item.children.length; i++) {
          newStages.push({
            ...item.children[i],
            id: crypto.randomUUID(),
            parentStageId: newParentId,
            order: newParentOrder + (i + 1) * 0.1,
          });
        }
      } else {
        // 자식 단독 붙여넣기
        const existingChildrenOfTarget = existingStages.filter(s => s.parentStageId === targetParentId);
        const targetParent = existingStages.find(s => s.id === targetParentId);
        const baseOrder = targetParent ? Math.floor(targetParent.order) : 0;
        const childOffset = existingChildrenOfTarget.length + newStages.filter(s => s.parentStageId === targetParentId).length;

        newStages.push({
          ...item.stage,
          id: crypto.randomUUID(),
          parentStageId: targetParentId!,
          order: baseOrder + (childOffset + 1) * 0.1,
        });
      }
    }

    const allStages = [...existingStages, ...newStages];

    if (selectedTemplate) {
      const updatedTemplate: WorkTemplate = {
        ...selectedTemplate,
        stages: allStages,
      };
      saveTemplateMutation.mutate(updatedTemplate, {
        onSuccess: () => alert('붙여넣기 완료'),
        onError: (err: any) => alert(`붙여넣기 실패: ${err.message}`),
      });
    } else {
      // 템플릿이 없는 프로젝트
      const newTemplate: WorkTemplate = {
        id: selectedProject.templateId,
        projectId: selectedProject.id,
        stages: newStages,
      };
      saveTemplateMutation.mutate(newTemplate, {
        onSuccess: () => alert('붙여넣기 완료'),
        onError: (err: any) => alert(`붙여넣기 실패: ${err.message}`),
      });
    }
  };

  const handleAddStage = () => {
    setEditingStage(undefined);
    setStageModalOpen(true);
  };

  const handleEditStage = (stage: WorkStage) => {
    setEditingStage(stage);
    setStageModalOpen(true);
  };

  const handleSaveStage = (stage: WorkStage, subtasks: WorkStage[]) => {
    if (!selectedTemplate) {
      const selectedProject = projects?.find(p => p.id === selectedProjectId);
      if (!selectedProject) return;

      const newTemplate: WorkTemplate = {
        id: selectedProject.templateId,
        projectId: selectedProject.id,
        stages: [{ ...stage, order: 1.0 }, ...subtasks]
      };

      saveTemplateMutation.mutate(newTemplate, {
        onSuccess: () => {
          alert('저장되었습니다');
          setStageModalOpen(false);
        },
        onError: (err: any) => {
          alert(`업무 단계 저장 실패: ${err.message}`);
        },
      });
      return;
    }

    let updatedStages: WorkStage[];

    if (editingStage) {
      updatedStages = selectedTemplate.stages
        .filter(s => s.id !== stage.id && s.parentStageId !== stage.id)
        .map(s => s);

      updatedStages.push({ ...stage, order: editingStage.order });
      updatedStages.push(...subtasks);
      updatedStages.sort((a, b) => a.order - b.order);
    } else {
      const parentStages = selectedTemplate.stages.filter(s => s.depth === 0);
      const maxOrder = parentStages.length > 0
        ? Math.max(...parentStages.map(s => Math.floor(s.order)))
        : 0;

      const newParentOrder = maxOrder + 1.0;
      const stageWithOrder = { ...stage, order: newParentOrder };

      const subtasksWithOrder = subtasks.map((sub, idx) => ({
        ...sub,
        order: newParentOrder + (idx + 1) * 0.1
      }));

      updatedStages = [
        ...selectedTemplate.stages,
        stageWithOrder,
        ...subtasksWithOrder
      ];
    }

    const updatedTemplate: WorkTemplate = {
      ...selectedTemplate,
      stages: updatedStages
    };

    saveTemplateMutation.mutate(updatedTemplate, {
      onSuccess: () => {
        alert('저장되었습니다');
        setStageModalOpen(false);
      },
      onError: (err: any) => {
        alert(`업무 단계 저장 실패: ${err.message}`);
      },
    });
  };

  const handleDeleteStage = (stageId: string) => {
    if (!selectedTemplate) return;

    // 부모 단계 삭제 시 자식 존재 여부를 사전 검증 (saveTemplate 비트랜잭션 데이터 소실 방지)
    const hasChildren = selectedTemplate.stages.some(s => s.parentStageId === stageId);
    if (hasChildren) {
      alert('하위 일감이 존재하는 업무 단계는 삭제할 수 없습니다.\n하위 일감을 먼저 삭제해주세요.');
      return;
    }

    if (!confirm('정말 삭제하시겠습니까?')) return;

    const updatedTemplate: WorkTemplate = {
      ...selectedTemplate,
      stages: selectedTemplate.stages.filter(s => s.id !== stageId)
    };

    saveTemplateMutation.mutate(updatedTemplate, {
      onError: (err: any) => {
        alert(`업무 단계 삭제 실패: ${err.message}`);
      },
    });
  };

  const handleMoveStage = (parentStageId: string, direction: 'up' | 'down') => {
    if (!selectedTemplate) return;
    const parentStages = selectedTemplate.stages
      .filter(s => s.depth === 0)
      .sort((a, b) => a.order - b.order);
    const currentIndex = parentStages.findIndex(s => s.id === parentStageId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= parentStages.length) return;
    const reordered = [...parentStages];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
    const newStages = recalculateOrders(reordered, selectedTemplate.stages);
    saveTemplateMutation.mutate({ ...selectedTemplate, stages: newStages }, {
      onError: (err: any) => alert(`순서 변경 실패: ${err.message}`),
    });
  };

  const handleImportStagesCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let csvText = e.target?.result as string;
        csvText = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        const lines = csvText.split('\n').filter(line => line.trim());
        const stagesByProject: Record<string, any[]> = {};

        for (let i = 1; i < lines.length; i++) {
          const columns = lines[i].split(',');
          if (columns.length < 7) continue;

          const projectName = columns[0].trim();
          const stageName = columns[1].trim();
          const startOffset = parseInt(columns[2].trim(), 10);
          const endOffset = parseInt(columns[3].trim(), 10);
          const startTime = columns[4].trim();
          const endTime = columns[5].trim();
          const tableTargetsStr = columns[6].trim();

          if (!projectName || !stageName || isNaN(startOffset) || isNaN(endOffset)) continue;

          const projectId = projectName.replace(/\//g, '_').replace(/\s*\(([^)]+)\)/, '_$1').replace(/\s+/g, '_');
          const templateId = `template_${projectId}`;

          const tableTargets = tableTargetsStr
            .split(/[,\s]+/)
            .map(t => t.replace('T', 'table') as 'table1' | 'table2' | 'table3')
            .filter(t => ['table1', 'table2', 'table3'].includes(t));

          if (!stagesByProject[templateId]) {
            stagesByProject[templateId] = [];
          }

          stagesByProject[templateId].push({
            id: `${templateId}_stage_${stagesByProject[templateId].length}`,
            name: stageName,
            startOffsetDays: startOffset,
            endOffsetDays: endOffset,
            startTime,
            endTime,
            order: stagesByProject[templateId].length,
            depth: 0,
            tableTargets,
            parentStageId: undefined,
          });
        }

        for (const templateId of Object.keys(stagesByProject)) {
          const projectId = templateId.replace('template_', '');
          const stages = stagesByProject[templateId];

          const template: WorkTemplate = {
            id: templateId,
            projectId,
            stages,
          };

          saveTemplateMutation.mutate(template);
        }

        const importedCount = Object.keys(stagesByProject).length;
        alert(`CSV 파일에서 ${importedCount}개 프로젝트의 업무 단계를 불러왔습니다.`);
      } catch (err: any) {
        alert(err.message || 'CSV 파일 읽기 실패');
      }
    };
    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>업무 단계 템플릿</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button onClick={handleAddStage}>+ 추가</Button>
          <Button
            variant="secondary"
            onClick={handleCopyStages}
            disabled={selectedStageIds.size === 0}
          >
            복사 {selectedStageIds.size > 0 ? `(${selectedStageIds.size})` : ''}
          </Button>
          <Button
            variant="secondary"
            onClick={handlePasteStages}
            disabled={!stageClipboard}
            title={stageClipboard ? `${stageClipboard.sourceProjectName}에서 복사된 ${stageClipboard.items.length}개 항목` : '복사된 항목 없음'}
          >
            붙여넣기
          </Button>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ marginRight: '1rem', fontWeight: 500 }}>프로젝트 선택:</label>
        <select
          value={selectedProjectId}
          onChange={(e) => onSelectedProjectIdChange(e.target.value)}
          className="project-dropdown"
        >
          {projects?.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {selectedTemplate ? (
        <>
          {selectedTemplate.stages.length > 0 ? (
            <table className="stages-table">
              <thead>
                <tr>
                  <th className="stage-checkbox-col">
                    <input
                      type="checkbox"
                      checked={selectedTemplate.stages.length > 0 && selectedTemplate.stages.every(s => selectedStageIds.has(s.id))}
                      onChange={handleToggleAll}
                    />
                  </th>
                  <th>#</th>
                  <th>순서</th>
                  <th>업무명</th>
                  <th>마감 Offset</th>
                  <th>테이블 전달 Offset</th>
                  <th>시작 시각</th>
                  <th>종료 시각</th>
                  <th>표시 테이블</th>
                  <th>편집</th>
                  <th>삭제</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const parentStages = selectedTemplate.stages.filter(s => s.depth === 0).sort((a, b) => a.order - b.order);
                  return parentStages.map((parentStage, parentIndex) => {
                    const children = selectedTemplate.stages.filter(s => s.parentStageId === parentStage.id).sort((a, b) => a.order - b.order);
                    return (
                      <>
                        <tr key={parentStage.id} className={selectedStageIds.has(parentStage.id) ? 'stage-row-selected' : ''}>
                          <td className="stage-checkbox-col">
                            <input
                              type="checkbox"
                              checked={selectedStageIds.has(parentStage.id)}
                              onChange={() => handleToggleStage(parentStage.id, true)}
                            />
                          </td>
                          <td>{parentIndex + 1}</td>
                          <td className="stage-order-col">
                            <button
                              className="btn-icon btn-order"
                              onClick={() => handleMoveStage(parentStage.id, 'up')}
                              disabled={parentIndex === 0}
                              title="위로 이동"
                            >▲</button>
                            <button
                              className="btn-icon btn-order"
                              onClick={() => handleMoveStage(parentStage.id, 'down')}
                              disabled={parentIndex === parentStages.length - 1}
                              title="아래로 이동"
                            >▼</button>
                          </td>
                          <td>{parentStage.name}</td>
                          <td>{parentStage.startOffsetDays}</td>
                          <td>{parentStage.endOffsetDays}</td>
                          <td>{parentStage.startTime}</td>
                          <td>{parentStage.endTime}</td>
                          <td>{parentStage.tableTargets.join(', ').replace(/table/g, 'T')}</td>
                          <td>
                            <button
                              className="btn-icon"
                              onClick={() => handleEditStage(parentStage)}
                            >
                              ✎
                            </button>
                          </td>
                          <td>
                            <button
                              className="btn-icon btn-danger"
                              onClick={() => handleDeleteStage(parentStage.id)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                        {children.map((child, childIndex) => (
                          <tr key={child.id} className={`subtask-row${selectedStageIds.has(child.id) ? ' stage-row-selected' : ''}`}>
                            <td className="stage-checkbox-col">
                              <input
                                type="checkbox"
                                checked={selectedStageIds.has(child.id)}
                                onChange={() => handleToggleStage(child.id, false)}
                              />
                            </td>
                            <td style={{ color: 'var(--azrael-gray-500)' }}>
                              {parentIndex + 1}.{childIndex + 1}
                            </td>
                            <td className="stage-order-col"></td>
                            <td style={{ paddingLeft: '2rem', color: 'var(--azrael-gray-700)' }}>
                              ㄴ {child.name}
                            </td>
                            <td>{child.startOffsetDays}</td>
                            <td>{child.endOffsetDays}</td>
                            <td>{child.startTime}</td>
                            <td>{child.endTime}</td>
                            <td>{child.tableTargets.join(', ').replace(/table/g, 'T')}</td>
                            <td>
                              <button
                                className="btn-icon"
                                onClick={() => handleEditStage(child)}
                                disabled
                                title="하위 일감은 부모 편집에서 수정"
                                style={{ opacity: 0.3, cursor: 'not-allowed' }}
                              >
                                ✎
                              </button>
                            </td>
                            <td>
                              <button
                                className="btn-icon btn-danger"
                                onClick={() => handleDeleteStage(child.id)}
                                disabled
                                title="하위 일감은 부모 편집에서 삭제"
                                style={{ opacity: 0.3, cursor: 'not-allowed' }}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </>
                    );
                  });
                })()}
              </tbody>
            </table>
          ) : (
            <p style={{ color: 'var(--azrael-gray-500)', fontStyle: 'italic', margin: '1rem 0' }}>
              업무 단계가 없습니다. 추가해주세요.
            </p>
          )}

          {isAdmin && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
              <input
                type="file"
                accept=".csv"
                onChange={handleImportStagesCSV}
                style={{ display: 'none' }}
                id="stages-csv-upload"
              />
              <Button
                variant="secondary"
                onClick={() => document.getElementById('stages-csv-upload')?.click()}
              >
                📁 업무 단계 불러오기 (CSV)
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  if (!selectedTemplate) return;
                  if (confirm('이 프로젝트의 모든 업무 단계를 삭제하시겠습니까?')) {
                    saveTemplateMutation.mutate({
                      ...selectedTemplate,
                      stages: []
                    });
                  }
                }}
              >
                🗑️ 모두 제거
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <p style={{ color: 'var(--azrael-gray-500)', fontStyle: 'italic', margin: '1rem 0' }}>
            이 프로젝트에 템플릿이 없습니다. 업무 단계를 추가하면 자동으로 생성됩니다.
          </p>
          {isAdmin && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
              <input
                type="file"
                accept=".csv"
                onChange={handleImportStagesCSV}
                style={{ display: 'none' }}
                id="stages-csv-upload-2"
              />
              <Button
                variant="secondary"
                onClick={() => document.getElementById('stages-csv-upload-2')?.click()}
              >
                📁 업무 단계 불러오기 (CSV)
              </Button>
            </div>
          )}
        </>
      )}

      <StageEditModal
        isOpen={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
        stage={editingStage}
        existingSubtasks={editingStage ? selectedTemplate?.stages.filter(s => s.parentStageId === editingStage.id) : undefined}
        onSave={handleSaveStage}
      />
    </div>
  );
}
