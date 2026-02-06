import { useState } from 'react';
import { Project, EmailTemplate, CalculationResult } from '../../types';
import { Button } from '../Button';
import { EmailTemplateEditModal } from '../EmailTemplateEditModal';
import {
  useEmailTemplates,
  useDeleteEmailTemplate,
} from '../../hooks/useEmailTemplates';

interface SettingsEmailTemplatesTabProps {
  selectedProjectId: string;
  onSelectedProjectIdChange: (id: string) => void;
  projects: Project[];
  calculationResult: CalculationResult | null;
}

export function SettingsEmailTemplatesTab({
  selectedProjectId,
  onSelectedProjectIdChange,
  projects,
  calculationResult,
}: SettingsEmailTemplatesTabProps) {
  const [emailTemplateModalOpen, setEmailTemplateModalOpen] = useState(false);
  const [editingEmailTemplate, setEditingEmailTemplate] = useState<EmailTemplate | null>(null);

  const { data: emailTemplates } = useEmailTemplates(selectedProjectId);
  const deleteEmailTemplateMutation = useDeleteEmailTemplate();

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  const handleAddEmailTemplate = () => {
    setEditingEmailTemplate(null);
    setEmailTemplateModalOpen(true);
  };

  const handleEditEmailTemplate = (tmpl: EmailTemplate) => {
    setEditingEmailTemplate(tmpl);
    setEmailTemplateModalOpen(true);
  };

  const handleDeleteEmailTemplate = (tmpl: EmailTemplate) => {
    if (!confirm(`"${tmpl.name}" 템플릿을 삭제하시겠습니까?`)) return;
    deleteEmailTemplateMutation.mutate(
      { templateId: tmpl.id, projectId: selectedProjectId },
      {
        onError: (err: any) => {
          alert(`삭제 실패: ${err.message}`);
        },
      },
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>이메일 템플릿</h3>
        <Button onClick={handleAddEmailTemplate}>+ 새 템플릿</Button>
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

      {!selectedProjectId ? (
        <div style={{ marginTop: '1rem', color: 'var(--azrael-gray-500)', fontSize: 'var(--text-sm)' }}>
          프로젝트를 먼저 선택해주세요
        </div>
      ) : (
        <table className="stages-table" style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>이름</th>
              <th>유형</th>
              <th>생성일</th>
              <th>편집</th>
              <th>삭제</th>
            </tr>
          </thead>
          <tbody>
            {emailTemplates
              ?.sort((a, b) => {
                if (a.isBuiltIn !== b.isBuiltIn) return a.isBuiltIn ? -1 : 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              })
              .map(tmpl => (
                <tr key={tmpl.id}>
                  <td>{tmpl.name}</td>
                  <td>{tmpl.isBuiltIn ? '기본 제공' : '사용자 정의'}</td>
                  <td>{new Date(tmpl.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td>
                    <button
                      className="btn-icon"
                      onClick={() => handleEditEmailTemplate(tmpl)}
                    >
                      ✎
                    </button>
                  </td>
                  <td>
                    {!tmpl.isBuiltIn && (
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => handleDeleteEmailTemplate(tmpl)}
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            {(!emailTemplates || emailTemplates.length === 0) && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--azrael-gray-500)' }}>
                  템플릿이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {selectedProject && (
        <EmailTemplateEditModal
          isOpen={emailTemplateModalOpen}
          onClose={() => setEmailTemplateModalOpen(false)}
          projectId={selectedProjectId}
          template={editingEmailTemplate}
          project={selectedProject}
          calculationResult={calculationResult ?? null}
          onSave={() => {}}
        />
      )}
    </div>
  );
}
