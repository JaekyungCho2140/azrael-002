import { useState, useEffect } from 'react';
import { Project } from '../../types';
import { Button } from '../Button';
import { ProjectEditModal } from '../ProjectEditModal';
import {
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from '../../hooks/useSupabase';
import { getUserState, saveUserState } from '../../lib/storage';

interface SettingsProjectsTabProps {
  selectedProjectId: string;
  onSelectedProjectIdChange: (id: string) => void;
  isAdmin: boolean;
  projects: Project[];
}

export function SettingsProjectsTab({
  selectedProjectId,
  onSelectedProjectIdChange,
  isAdmin,
  projects,
}: SettingsProjectsTabProps) {
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [showVisualization, setShowVisualization] = useState(true);

  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  // 시각화 설정 로드
  useEffect(() => {
    const userState = getUserState();
    if (userState) {
      setShowVisualization(userState.showVisualization ?? true);
    }
  }, []);

  const handleToggleVisualization = () => {
    const newValue = !showVisualization;
    setShowVisualization(newValue);
    const userState = getUserState();
    if (userState) {
      saveUserState({ ...userState, showVisualization: newValue });
    }
  };

  const handleAddProject = () => {
    setEditingProject(undefined);
    setProjectModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectModalOpen(true);
  };

  const handleSaveProject = (project: Project) => {
    if (editingProject) {
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
        if (projectId === selectedProjectId && projects && projects.length > 1) {
          const remaining = projects.filter(p => p.id !== projectId);
          onSelectedProjectIdChange(remaining[0].id);
        }
      },
      onError: (err: any) => {
        alert(`프로젝트 삭제 실패: ${err.message}`);
      },
    });
  };

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
          const headsUpOffset = parseInt(columns[1].trim(), 10);
          const showIosReviewDate = columns[2].trim().toUpperCase() === 'TRUE';
          const iosReviewOffset = parseInt(columns[3].trim(), 10);

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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>프로젝트 관리</h3>
        <Button onClick={handleAddProject}>+ 새 프로젝트 추가</Button>
      </div>

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

      {isAdmin && (
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
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
            프로젝트 불러오기 (CSV)
          </Button>
        </div>
      )}

      {/* 시각화 표시 설정 */}
      <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--azrael-gray-50)', borderRadius: '8px' }}>
        <label className="form-checkbox">
          <input
            type="checkbox"
            checked={showVisualization}
            onChange={handleToggleVisualization}
          />
          <span>간트 차트 / 캘린더 뷰 표시</span>
        </label>
        <small style={{ color: 'var(--azrael-gray-500)', fontSize: 'var(--text-xs)', marginTop: '0.25rem', display: 'block' }}>
          비활성화하면 메인 화면에서 간트 차트와 캘린더가 숨겨집니다.
        </small>
      </div>

      <ProjectEditModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        project={editingProject}
        onSave={handleSaveProject}
      />
    </div>
  );
}
