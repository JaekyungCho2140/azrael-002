/**
 * Settings Screen Component
 * 참조: prd/Azrael-PRD-Phase0.md §10 설정 화면
 *
 * Phase 3: Supabase 연동 리팩토링
 */

import { useState, useEffect } from 'react';
import { Project, WorkTemplate, WorkStage } from '../types';
import { Button } from './Button';
import { ProjectEditModal } from './ProjectEditModal';
import { StageEditModal } from './StageEditModal';
import { HolidayAddModal } from './HolidayAddModal';
import { supabase } from '../lib/supabase';
import {
  useProjects,
  useTemplates,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useSaveTemplate,
  useHolidays,
  useCreateHoliday,
  useDeleteHoliday,
  useSyncApiHolidays,
} from '../hooks/useSupabase';
import { formatDateLocal } from '../lib/businessDays';
import './SettingsScreen.css';

interface SettingsScreenProps {
  currentProjectId: string;
  onClose: () => void;
}

type SettingsTab = 'projects' | 'stages' | 'holidays';

export function SettingsScreen({
  currentProjectId,
  onClose
}: SettingsScreenProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('projects');
  const [selectedProjectId, setSelectedProjectId] = useState(currentProjectId);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  // 관리자 권한 확인 (jkcho@wemade.com만 CSV 기능 사용 가능)
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
  const { data: holidays } = useHolidays();

  // Mutations
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const saveTemplateMutation = useSaveTemplate();
  const createHolidayMutation = useCreateHoliday();
  const deleteHolidayMutation = useDeleteHoliday();
  const syncApiHolidaysMutation = useSyncApiHolidays();

  // 모달 상태
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<WorkStage | undefined>();
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);

  const selectedTemplate = templates?.find(t => t.projectId === selectedProjectId);

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
      updateProjectMutation.mutate(
        { id: project.id, updates: project },
        {
          onSuccess: () => {
            setProjectModalOpen(false);
          },
          onError: (err: any) => {
            alert(`프로젝트 수정 실패: ${err.message}`);
          },
        }
      );
    } else {
      // 추가
      createProjectMutation.mutate(project, {
        onSuccess: () => {
          setProjectModalOpen(false);
        },
        onError: (err: any) => {
          alert(`프로젝트 추가 실패: ${err.message}`);
        },
      });
    }
  };

  // 프로젝트 삭제
  const handleDeleteProject = (projectId: string) => {
    if ((projects?.length || 0) === 1) {
      alert('마지막 프로젝트는 삭제할 수 없습니다. 최소 1개 프로젝트 필요');
      return;
    }

    if (!confirm('정말 삭제하시겠습니까? 모든 설정과 계산 결과가 사라집니다.')) {
      return;
    }

    deleteProjectMutation.mutate(projectId, {
      onSuccess: () => {
        // 삭제된 프로젝트가 현재 선택된 프로젝트면 다른 프로젝트로 변경
        if (projectId === selectedProjectId && projects && projects.length > 1) {
          const remaining = projects.filter(p => p.id !== projectId);
          setSelectedProjectId(remaining[0].id);
        }
      },
      onError: (err: any) => {
        alert(`프로젝트 삭제 실패: ${err.message}`);
      },
    });
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
    if (!selectedTemplate) {
      // 템플릿이 없으면 새로 생성
      const selectedProject = projects?.find(p => p.id === selectedProjectId);
      if (!selectedProject) return;

      const newTemplate: WorkTemplate = {
        id: selectedProject.templateId,
        projectId: selectedProject.id,
        stages: [{ ...stage, order: 0 }]
      };

      saveTemplateMutation.mutate(newTemplate, {
        onSuccess: () => {
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

    const updatedTemplate: WorkTemplate = {
      ...selectedTemplate,
      stages: updatedStages
    };

    saveTemplateMutation.mutate(updatedTemplate, {
      onSuccess: () => {
        setStageModalOpen(false);
      },
      onError: (err: any) => {
        alert(`업무 단계 저장 실패: ${err.message}`);
      },
    });
  };

  // 업무 단계 삭제
  const handleDeleteStage = (stageId: string) => {
    if (!selectedTemplate) return;
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

  // 공휴일 API 불러오기
  const handleFetchHolidays = async () => {
    const currentYear = new Date().getFullYear();
    const hasApiHolidays = holidays?.some(h => !h.isManual && h.date.getFullYear() === currentYear);

    if (hasApiHolidays) {
      if (!confirm(`이미 ${currentYear}년 공휴일을 불러왔습니다. 다시 불러오시겠습니까?`)) {
        return;
      }
    }

    setIsLoadingHolidays(true);
    try {
      const apiKey = import.meta.env.VITE_HOLIDAY_API_KEY;
      if (!apiKey || apiKey === 'your_api_key_here') {
        throw new Error('공휴일 API 키가 설정되지 않았습니다.');
      }

      const url = `http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?solYear=${currentYear}&ServiceKey=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API 호출 실패 (${response.status})`);
      }

      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      const resultCode = xmlDoc.querySelector('resultCode')?.textContent;
      if (resultCode !== '00') {
        const resultMsg = xmlDoc.querySelector('resultMsg')?.textContent;
        throw new Error(`API 오류: ${resultMsg}`);
      }

      const items = xmlDoc.querySelectorAll('item');
      const newHolidays = Array.from(items).map(item => {
        const locdateStr = item.querySelector('locdate')?.textContent || '';
        const dateName = item.querySelector('dateName')?.textContent || '';

        const year = parseInt(locdateStr.substring(0, 4));
        const month = parseInt(locdateStr.substring(4, 6));
        const day = parseInt(locdateStr.substring(6, 8));
        const date = new Date(year, month - 1, day, 12, 0, 0);

        return {
          date,
          name: dateName,
          isManual: false
        };
      });

      syncApiHolidaysMutation.mutate(newHolidays, {
        onSuccess: () => {
          setIsLoadingHolidays(false);
          alert('공휴일을 성공적으로 불러왔습니다.');
        },
        onError: (err: any) => {
          setIsLoadingHolidays(false);
          alert(`공휴일 저장 실패: ${err.message}`);
        },
      });
    } catch (err: any) {
      setIsLoadingHolidays(false);
      alert(err.message || '공휴일 불러오기 실패');
    }
  };

  // CSV에서 프로젝트 불러오기 (관리자 전용)
  const handleImportProjectsCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let csvText = e.target?.result as string;
        csvText = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        const lines = csvText.split('\n').filter(line => line.trim());
        let updateCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const columns = lines[i].split(',');
          if (columns.length < 4) continue;

          const name = columns[0].trim();
          const headsUpOffset = parseInt(columns[1].trim());
          const showIosReviewDate = columns[2].trim().toUpperCase() === 'TRUE';
          const iosReviewOffset = parseInt(columns[3].trim());

          const id = name.replace(/\//g, '_').replace(/\s*\(([^)]+)\)/, '_$1').replace(/\s+/g, '_');

          updateProjectMutation.mutate({
            id,
            updates: {
              headsUpOffset,
              showIosReviewDate,
              iosReviewOffset: showIosReviewDate ? iosReviewOffset : undefined,
            }
          });
          updateCount++;
        }

        alert(`CSV 파일에서 ${updateCount}개 프로젝트를 업데이트했습니다.`);
      } catch (err: any) {
        alert(err.message || 'CSV 파일 읽기 실패');
      }
    };
    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
  };

  // CSV에서 업무 단계 불러오기 (관리자 전용)
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
          const startOffset = parseInt(columns[2].trim());
          const endOffset = parseInt(columns[3].trim());
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

        // 각 템플릿 업데이트
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

  // CSV에서 공휴일 불러오기 (관리자 전용)
  const handleImportHolidaysCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let csvText = e.target?.result as string;
        csvText = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        const lines = csvText.split('\n').filter(line => line.trim());
        const newHolidays = [];

        for (let i = 1; i < lines.length; i++) {
          const columns = lines[i].split(',');
          if (columns.length < 3) continue;

          const name = columns[1].trim();
          const dateStr = columns[2].trim();

          try {
            const [year, month, day] = dateStr.split('-').map(Number);
            const date = new Date(year, month - 1, day, 12, 0, 0);

            newHolidays.push({
              date,
              name,
              isManual: true,
            });
          } catch (err) {
            console.error(`CSV 라인 ${i} 파싱 실패`);
          }
        }

        // 기존 수동 공휴일 삭제 후 추가
        for (const holiday of newHolidays) {
          createHolidayMutation.mutate(holiday);
        }

        alert(`CSV 파일에서 ${newHolidays.length}개 공휴일을 불러왔습니다.`);
      } catch (err: any) {
        alert(err.message || 'CSV 파일 읽기 실패');
      }
    };
    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
  };

  // 모든 공휴일 삭제 (관리자 전용)
  const handleClearAllHolidays = async () => {
    if (!confirm('모든 공휴일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      // Supabase에서 모든 공휴일 삭제
      const { error } = await supabase
        .from('holidays')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 행 삭제

      if (error) {
        throw error;
      }

      alert('모든 공휴일이 삭제되었습니다.');
    } catch (err: any) {
      alert(`삭제 실패: ${err.message}`);
    }
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
                  {projects?.map(p => (
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
                          disabled={(projects?.length || 0) === 1}
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

                {isAdmin && (
                  <>
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
                  </>
                )}
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

                    {isAdmin && (
                      <>
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
                      </>
                    )}
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

                    {isAdmin && (
                      <>
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
                      </>
                    )}
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
                  {holidays?.map((h, idx) => (
                    <tr key={idx}>
                      <td>{formatDateLocal(h.date)}</td>
                      <td>{h.name}</td>
                      <td>{h.isManual ? '수동' : 'API'}</td>
                      <td>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => {
                            if (confirm('정말 삭제하시겠습니까?')) {
                              deleteHolidayMutation.mutate(h.date);
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

                {isAdmin && (
                  <>
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

                    <Button
                      variant="ghost"
                      onClick={handleClearAllHolidays}
                    >
                      🗑️ 모두 제거
                    </Button>
                  </>
                )}
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
        onSave={(holiday) => {
          createHolidayMutation.mutate(
            holiday,
            {
              onSuccess: () => {
                setHolidayModalOpen(false);
              },
              onError: (err: any) => {
                alert(`공휴일 추가 실패: ${err.message}`);
              },
            }
          );
        }}
      />
    </div>
  );
}
