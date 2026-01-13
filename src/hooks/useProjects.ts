/**
 * useProjects Hook
 * 프로젝트 관리를 위한 커스텀 훅
 */

import { useState, useEffect } from 'react';
import { Project, WorkTemplate } from '../types';
import {
  getProjects,
  saveProjects,
  getTemplates,
  saveTemplates,
  deleteProject as deleteProjectStorage
} from '../lib/storage';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<WorkTemplate[]>([]);

  // 초기 로드
  useEffect(() => {
    setProjects(getProjects());
    setTemplates(getTemplates());
  }, []);

  // 프로젝트 추가
  const addProject = (project: Project) => {
    const updated = [...projects, project];
    setProjects(updated);
    saveProjects(updated);

    // 빈 템플릿 생성
    const newTemplate: WorkTemplate = {
      id: project.templateId,
      projectId: project.id,
      stages: []
    };
    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
  };

  // 프로젝트 업데이트
  const updateProject = (projectId: string, updates: Partial<Project>) => {
    const updated = projects.map(p =>
      p.id === projectId ? { ...p, ...updates } : p
    );
    setProjects(updated);
    saveProjects(updated);
  };

  // 프로젝트 삭제
  const deleteProject = (projectId: string) => {
    // 마지막 프로젝트 삭제 불가
    if (projects.length === 1) {
      throw new Error('마지막 프로젝트는 삭제할 수 없습니다. 최소 1개 프로젝트 필요');
    }

    deleteProjectStorage(projectId);
    setProjects(getProjects());
    setTemplates(getTemplates());
  };

  // isDeletable 동적 계산
  const getProjectWithDeletable = (project: Project) => ({
    ...project,
    isDeletable: projects.length > 1
  });

  return {
    projects: projects.map(getProjectWithDeletable),
    templates,
    addProject,
    updateProject,
    deleteProject,
    setTemplates: (updated: WorkTemplate[]) => {
      setTemplates(updated);
      saveTemplates(updated);
    }
  };
}
