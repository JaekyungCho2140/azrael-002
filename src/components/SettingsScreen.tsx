/**
 * Settings Screen Component
 * 참조: prd/Azrael-PRD-Phase0.md §10 설정 화면
 */

import { useState } from 'react';
import { Project, WorkTemplate, WorkStage } from '../types';
import { Button } from './Button';
import { ProjectEditModal } from './ProjectEditModal';
import { StageEditModal } from './StageEditModal';
import { HolidayAddModal } from './HolidayAddModal';
import { useHolidays } from '../hooks/useHolidays';
import { formatDateLocal } from '../lib/businessDays';
import './SettingsScreen.css';

interface SettingsScreenProps {
  projects: Project[];
  templates: WorkTemplate[];
  currentProjectId: string;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
  onUpdateTemplates: (templates: WorkTemplate[]) => void;
  onAddProject: (project: Project) => void;
  onClose: () => void;
}

type SettingsTab = 'projects' | 'stages' | 'holidays';

export function SettingsScreen({
  projects,
  templates,
  currentProjectId,
  onUpdateProject,
  onDeleteProject,
  onUpdateTemplates,
  onAddProject,
  onClose
}: SettingsScreenProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('projects');
  const [selectedProjectId, setSelectedProjectId] = useState(currentProjectId);
  const { holidays, addHoliday, deleteHoliday, clearAllHolidays, fetchHolidaysFromAPI, importHolidaysFromCSV } = useHolidays();
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);

  // 모달 상태
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<WorkStage | undefined>();
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);

  const selectedTemplate = templates.find(t => t.projectId === selectedProjectId);

  // 프로젝트 추가
  const handleAddProject = () => {
    setEditingProject(undefined);
    setProjectModalOpen(true);
  };

  // 프로젝트 편집
  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectModalOpen(true);
  };

  // 프로젝트 저장
  const handleSaveProject = (project: Project) => {
    if (editingProject) {
      // 편집
      onUpdateProject(project.id, project);
    } else {
      // 추가
      onAddProject(project);

      // 빈 템플릿 생성
      const newTemplate: WorkTemplate = {
        id: project.templateId,
        projectId: project.id,
        stages: []
      };
      onUpdateTemplates([...templates, newTemplate]);
    }
  };

  // 프로젝트 삭제
  const handleDeleteProject = (projectId: string) => {
    if (projects.length === 1) {
      alert('마지막 프로젝트는 삭제할 수 없습니다. 최소 1개 프로젝트 필요');
      return;
    }

    if (!confirm('정말 삭제하시겠습니까? 모든 설정과 계산 결과가 사라집니다.')) {
      return;
    }

    onDeleteProject(projectId);
  };

  // 업무 단계 추가
  const handleAddStage = () => {
    setEditingStage(undefined);
    setStageModalOpen(true);
  };

  // 업무 단계 편집
  const handleEditStage = (stage: WorkStage) => {
    setEditingStage(stage);
    setStageModalOpen(true);
  };

  // 업무 단계 저장
  const handleSaveStage = (stage: WorkStage) => {
    // 템플릿이 없으면 새로 생성
    if (!selectedTemplate) {
      const selectedProject = projects.find(p => p.id === selectedProjectId);
      if (!selectedProject) return;

      const newTemplate: WorkTemplate = {
        id: selectedProject.templateId,
        projectId: selectedProject.id,
        stages: [{ ...stage, order: 0 }]
      };

      onUpdateTemplates([...templates, newTemplate]);
      return;
    }

    let updatedStages: WorkStage[];

    if (editingStage) {
      // 편집
      updatedStages = selectedTemplate.stages.map(s =>
        s.id === stage.id ? { ...stage, order: s.order } : s
      );
    } else {
      // 추가
      updatedStages = [
        ...selectedTemplate.stages,
        { ...stage, order: selectedTemplate.stages.length }
      ];
    }

    const updatedTemplates = templates.map(t =>
      t.id === selectedTemplate.id
        ? { ...t, stages: updatedStages }
        : t
    );

    onUpdateTemplates(updatedTemplates);
  };

  // 업무 단계 삭제
  const handleDeleteStage = (stageId: string) => {
    if (!selectedTemplate) return;
    if (!confirm('정말 삭제하시겠습니까?')) return;

    const updatedTemplates = templates.map(t =>
      t.id === selectedTemplate.id
        ? { ...t, stages: t.stages.filter(s => s.id !== stageId) }
        : t
    );

    onUpdateTemplates(updatedTemplates);
  };

  // 공휴일 API 불러오기
  const handleFetchHolidays = async () => {
    const currentYear = new Date().getFullYear();
    const hasApiHolidays = holidays.some(h => !h.isManual && h.date.getFullYear() === currentYear);

    if (hasApiHolidays) {
      if (!confirm(`이미 ${currentYear}년 공휴일을 불러왔습니다. 다시 불러오시겠습니까?`)) {
        return;
      }
    }

    setIsLoadingHolidays(true);
    try {
      await fetchHolidaysFromAPI(currentYear);
      alert('공휴일을 성공적으로 불러왔습니다.');
    } catch (err: any) {
      alert(err.message || '공휴일 불러오기 실패');
    } finally {
      setIsLoadingHolidays(false);
    }
  };

  // CSV에서 공휴일 불러오기
  const handleImportHolidaysCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        importHolidaysFromCSV(csvText);
        alert('CSV 파일에서 공휴일을 성공적으로 불러왔습니다.');
      } catch (err: any) {
        alert(err.message || 'CSV 파일 읽기 실패');
      }
    };
    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
  };

  // 업무 단계 CSV 임포트
  const handleImportStagesCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let csvText = e.target?.result as string;

        // BOM 제거
        if (csvText.charCodeAt(0) === 0xFEFF) {
          csvText = csvText.substring(1);
        }

        // CRLF → LF 정규화
        csvText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        const lines = csvText.split('\n').filter(line => line.trim());
        const stagesByProject: Record<string, WorkStage[]> = {};
        const debugInfo: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const columns = line.split(',');
          if (columns.length < 7) {
            debugInfo.push(`라인 ${i}: 컬럼 부족 (${columns.length}개)`);
            continue;
          }

          const projectName = columns[0].trim();
          const stageName = columns[1].trim();
          const startOffset = parseInt(columns[2].trim());
          const endOffset = parseInt(columns[3].trim());
          const startTime = columns[4].trim();
          const endTime = columns[5].trim();
          const tableTargetsStr = columns[6].trim();

          // 유효성 검증
          if (!projectName || !stageName || isNaN(startOffset) || isNaN(endOffset)) {
            debugInfo.push(`⚠ 라인 ${i}: 잘못된 데이터 건너뜀`);
            continue;
          }

          const tableTargets = tableTargetsStr
            .split(/[,\s]+/)
            .map(t => t.replace('T', 'table') as 'table1' | 'table2' | 'table3')
            .filter(t => ['table1', 'table2', 'table3'].includes(t));

          if (!stagesByProject[projectName]) {
            stagesByProject[projectName] = [];
          }

          stagesByProject[projectName].push({
            id: `stage-${Date.now()}-${i}-${Math.random()}`,
            name: stageName,
            startOffsetDays: startOffset,
            endOffsetDays: endOffset,
            startTime,
            endTime,
            order: stagesByProject[projectName].length,
            depth: 0,
            tableTargets
          });

          debugInfo.push(`+ ${projectName}: ${stageName} (${startOffset}/${endOffset})`);
        }

        // 모든 프로젝트의 템플릿 업데이트 (없으면 생성)
        const templateMap = new Map(templates.map(t => [t.projectId, t]));

        projects.forEach(project => {
          const csvStages = stagesByProject[project.name];
          if (!csvStages) {
            debugInfo.push(`- ${project.name}: CSV에 데이터 없음 (유지)`);
            return;
          }

          if (templateMap.has(project.id)) {
            // 기존 템플릿 업데이트
            const template = templateMap.get(project.id)!;
            templateMap.set(project.id, { ...template, stages: csvStages });
            debugInfo.push(`✓ ${project.name}: ${csvStages.length}개 업무 단계 임포트 (업데이트)`);
          } else {
            // 새 템플릿 생성
            templateMap.set(project.id, {
              id: project.templateId,
              projectId: project.id,
              stages: csvStages
            });
            debugInfo.push(`✓ ${project.name}: ${csvStages.length}개 업무 단계 임포트 (신규)`);
          }
        });

        const updatedTemplates = Array.from(templateMap.values());

        console.log('업무 단계 CSV 임포트:', debugInfo.join('\n'));

        // LocalStorage 직접 저장
        localStorage.setItem('azrael:templates', JSON.stringify(updatedTemplates));

        const importedProjects = Object.keys(stagesByProject);
        alert(`CSV 파일에서 ${importedProjects.length}개 프로젝트의 업무 단계를 불러왔습니다.\n페이지를 새로고침합니다.`);
        window.location.reload();
      } catch (err: any) {
        alert(err.message || 'CSV 파일 읽기 실패');
      }
    };
    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
  };

  // 프로젝트 CSV 임포트
  const handleImportProjectsCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let csvText = e.target?.result as string;

        // BOM 제거
        if (csvText.charCodeAt(0) === 0xFEFF) {
          csvText = csvText.substring(1);
        }

        // CRLF → LF 정규화
        csvText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        const lines = csvText.split('\n').filter(line => line.trim());
        let updateCount = 0;
        const debugInfo: string[] = [];

        const updatedProjects = [...projects];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const columns = line.split(',');
          if (columns.length < 4) {
            debugInfo.push(`라인 ${i}: 컬럼 부족 (${columns.length}개)`);
            continue;
          }

          const name = columns[0].trim();
          const headsUpOffset = parseInt(columns[1].trim());
          const showIosReviewDate = columns[2].trim().toUpperCase() === 'TRUE';
          const iosReviewOffset = parseInt(columns[3].trim());

          const projectIndex = updatedProjects.findIndex(p => p.name === name);

          if (projectIndex >= 0) {
            updatedProjects[projectIndex] = {
              ...updatedProjects[projectIndex],
              headsUpOffset,
              showIosReviewDate,
              iosReviewOffset: showIosReviewDate ? iosReviewOffset : undefined
            };
            updateCount++;
            debugInfo.push(`✓ ${name}: 헤즈업 ${headsUpOffset}, iOS ${showIosReviewDate ? iosReviewOffset : 'N/A'}`);
          } else {
            debugInfo.push(`✗ ${name}: 프로젝트 없음`);
          }
        }

        // LocalStorage 직접 저장
        if (updateCount > 0) {
          localStorage.setItem('azrael:projects', JSON.stringify(updatedProjects));
        }

        console.log('프로젝트 CSV 임포트:', debugInfo.join('\n'));

        if (updateCount > 0) {
          alert(`CSV 파일에서 ${updateCount}개 프로젝트를 성공적으로 불러왔습니다.\n페이지를 새로고침합니다.`);
          window.location.reload();
        } else {
          alert('업데이트할 프로젝트가 없습니다.');
        }
      } catch (err: any) {
        alert(err.message || 'CSV 파일 읽기 실패');
      }
    };
    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
  };

  return (
    <div className="settings-screen">
      <div className="settings-header">
        <h2>설정</h2>
        <Button variant="ghost" onClick={onClose}>
          ← 돌아가기
        </Button>
      </div>

      <div className="settings-layout">
        {/* Sidebar */}
        <div className="settings-sidebar">
          <div
            className={`settings-nav-item ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            프로젝트
          </div>
          <div
            className={`settings-nav-item ${activeTab === 'stages' ? 'active' : ''}`}
            onClick={() => setActiveTab('stages')}
          >
            업무 단계
          </div>
          <div
            className={`settings-nav-item ${activeTab === 'holidays' ? 'active' : ''}`}
            onClick={() => setActiveTab('holidays')}
          >
            공휴일
          </div>
        </div>

        {/* Content */}
        <div className="settings-content">
          {/* 프로젝트 관리 */}
          {activeTab === 'projects' && (
            <div>
              <h3>프로젝트 관리</h3>

              <table className="stages-table" style={{ marginTop: '1rem' }}>
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>헤즈업 Offset</th>
                    <th>iOS 심사일</th>
                    <th>편집</th>
                    <th>삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.headsUpOffset} 영업일</td>
                      <td>{p.showIosReviewDate ? `${p.iosReviewOffset} 영업일` : '-'}</td>
                      <td>
                        <button
                          className="btn-icon"
                          onClick={() => handleEditProject(p)}
                        >
                          ✎
                        </button>
                      </td>
                      <td>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => handleDeleteProject(p.id)}
                          disabled={projects.length === 1}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                <Button onClick={handleAddProject}>
                  + 새 프로젝트 추가
                </Button>

                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportProjectsCSV}
                  style={{ display: 'none' }}
                  id="projects-csv-upload"
                />
                <Button
                  variant="secondary"
                  onClick={() => document.getElementById('projects-csv-upload')?.click()}
                >
                  📁 프로젝트 불러오기 (CSV)
                </Button>
              </div>
            </div>
          )}

          {/* 업무 단계 관리 */}
          {activeTab === 'stages' && (
            <div>
              <h3>업무 단계 템플릿</h3>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ marginRight: '1rem', fontWeight: 500 }}>프로젝트 선택:</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="project-dropdown"
                >
                  {projects.map(p => (
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
                        {selectedTemplate.stages.map((stage, index) => (
                          <tr key={stage.id}>
                            <td>{index + 1}</td>
                            <td>{stage.name}</td>
                            <td>{stage.startOffsetDays}</td>
                            <td>{stage.endOffsetDays}</td>
                            <td>{stage.startTime}</td>
                            <td>{stage.endTime}</td>
                            <td>{stage.tableTargets.join(', ').replace(/table/g, 'T')}</td>
                            <td>
                              <button
                                className="btn-icon"
                                onClick={() => handleEditStage(stage)}
                              >
                                ✎
                              </button>
                            </td>
                            <td>
                              <button
                                className="btn-icon btn-danger"
                                onClick={() => handleDeleteStage(stage.id)}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: 'var(--azrael-gray-500)', fontStyle: 'italic', margin: '1rem 0' }}>
                      업무 단계가 없습니다. 추가해주세요.
                    </p>
                  )}

                  <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                    <Button onClick={handleAddStage}>
                      + 업무 단계 추가
                    </Button>

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
                          const updated = templates.map(t =>
                            t.id === selectedTemplate.id ? { ...t, stages: [] } : t
                          );
                          onUpdateTemplates(updated);
                        }
                      }}
                    >
                      🗑️ 모두 제거
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ color: 'var(--azrael-gray-500)', fontStyle: 'italic', margin: '1rem 0' }}>
                    이 프로젝트에 템플릿이 없습니다. 업무 단계를 추가하면 자동으로 생성됩니다.
                  </p>
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                    <Button onClick={handleAddStage}>
                      + 업무 단계 추가
                    </Button>

                    <label>
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
                    </label>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 공휴일 관리 */}
          {activeTab === 'holidays' && (
            <div>
              <h3>공휴일 관리</h3>

              <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Button
                  onClick={handleFetchHolidays}
                  disabled={isLoadingHolidays}
                >
                  {isLoadingHolidays ? '불러오는 중...' : '🔄 공휴일 불러오기 (API)'}
                </Button>

                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportHolidaysCSV}
                  style={{ display: 'none' }}
                  id="holidays-csv-upload"
                />
                <Button
                  variant="secondary"
                  onClick={() => document.getElementById('holidays-csv-upload')?.click()}
                >
                  📁 공휴일 불러오기 (CSV)
                </Button>

                <span style={{ color: 'var(--azrael-gray-600)' }}>
                  올해: {new Date().getFullYear()}년
                </span>
              </div>

              <table className="holidays-table">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>이름</th>
                    <th>출처</th>
                    <th>삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map((h, idx) => (
                    <tr key={idx}>
                      <td>{formatDateLocal(h.date)}</td>
                      <td>{h.name}</td>
                      <td>{h.isManual ? '수동' : 'API'}</td>
                      <td>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => {
                            if (confirm('정말 삭제하시겠습니까?')) {
                              deleteHoliday(h.date);
                            }
                          }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                <Button onClick={() => setHolidayModalOpen(true)}>
                  + 공휴일 수동 추가
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    if (confirm('모든 공휴일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                      clearAllHolidays();
                      alert('모든 공휴일이 삭제되었습니다.');
                    }
                  }}
                >
                  🗑️ 모두 제거
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 모달들 */}
      <ProjectEditModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        project={editingProject}
        onSave={handleSaveProject}
      />

      <StageEditModal
        isOpen={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
        stage={editingStage}
        onSave={handleSaveStage}
      />

      <HolidayAddModal
        isOpen={holidayModalOpen}
        onClose={() => setHolidayModalOpen(false)}
        onSave={addHoliday}
      />
    </div>
  );
}
