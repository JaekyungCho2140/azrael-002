import { useState } from 'react';
import { Project, WorkTemplate, WorkStage } from '../../types';
import { Button } from '../Button';
import { StageEditModal } from '../StageEditModal';
import { useSaveTemplate } from '../../hooks/useSupabase';

interface SettingsStagesTabProps {
  selectedProjectId: string;
  onSelectedProjectIdChange: (id: string) => void;
  isAdmin: boolean;
  projects: Project[];
  selectedTemplate: WorkTemplate | undefined;
}

export function SettingsStagesTab({
  selectedProjectId,
  onSelectedProjectIdChange,
  isAdmin,
  projects,
  selectedTemplate,
}: SettingsStagesTabProps) {
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<WorkStage | undefined>();

  const saveTemplateMutation = useSaveTemplate();

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
    if (!confirm('정말 삭제하시겠습니까?')) return;

    const updatedTemplate: WorkTemplate = {
      ...selectedTemplate,
      stages: selectedTemplate.stages.filter(s => s.id !== stageId)
    };

    saveTemplateMutation.mutate(updatedTemplate, {
      onError: (err: any) => {
        const message = err.message?.includes('fk_parent_stage')
          ? '하위 일감이 존재하는 업무 단계는 삭제할 수 없습니다. 하위 일감을 먼저 삭제해주세요.'
          : `업무 단계 삭제 실패: ${err.message}`;
        alert(message);
      },
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
        <Button onClick={handleAddStage}>+ 업무 단계 추가</Button>
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
                  <th>#</th>
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
                {selectedTemplate.stages
                  .filter(s => s.depth === 0)
                  .map((parentStage, parentIndex) => {
                    const children = selectedTemplate.stages.filter(s => s.parentStageId === parentStage.id);
                    return (
                      <>
                        <tr key={parentStage.id}>
                          <td>{parentIndex + 1}</td>
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
                          <tr key={child.id} className="subtask-row">
                            <td style={{ color: 'var(--azrael-gray-500)' }}>
                              {parentIndex + 1}.{childIndex + 1}
                            </td>
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
                  })}
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
