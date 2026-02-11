/**
 * QuadViewScreen Component
 * 4분할 몰아보기 비교 화면
 * 참조: prd/Azrael-PRD-Phase4.md §3.3, §4.3
 */

import { useState } from 'react';
import { PresetSlotCard } from './PresetSlotCard';
import { PresetSaveModal } from './PresetSaveModal';
import { usePresetSlotsWithData, useUpdatePresetSlot, useDeletePresetSlot } from '../hooks/usePresetSlots';
import { Project, CalculationResult, PresetSlotWithData, TableType } from '../types';
import { MAX_PRESET_SLOTS } from '../constants';
import './QuadViewScreen.css';

interface QuadViewScreenProps {
  currentProject: Project;
  currentCalculationResult: CalculationResult | null;
}

export default function QuadViewScreen({
  currentProject,
  currentCalculationResult,
}: QuadViewScreenProps) {
  const { data: presetsWithData, isLoading } = usePresetSlotsWithData(currentProject.id);
  const updateMutation = useUpdatePresetSlot();
  const deleteMutation = useDeletePresetSlot();

  // 몰아보기 저장 모달 상태
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveSlotIndex, setSaveSlotIndex] = useState(0);

  // 4개 슬롯에 대해 몰아보기 매핑 (slotIndex 기준)
  const getPresetForSlot = (slotIndex: number): PresetSlotWithData | null => {
    if (!presetsWithData) return null;
    return presetsWithData.find(p => p.slotIndex === slotIndex) ?? null;
  };

  // 몰아보기 저장 모달 열기
  const handleOpenSaveModal = (slotIndex: number) => {
    setSaveSlotIndex(slotIndex);
    setSaveModalOpen(true);
  };

  // 몰아보기 삭제 (window.confirm 사용)
  const handleDelete = (presetId: string, presetName: string) => {
    if (!window.confirm(`몰아보기 '${presetName}'을 삭제하시겠습니까?`)) return;

    deleteMutation.mutate(
      { presetId, projectId: currentProject.id },
    );
  };

  // 몰아보기 이름 업데이트
  const handleUpdateName = (presetId: string, newName: string) => {
    updateMutation.mutate({
      presetId,
      projectId: currentProject.id,
      updates: { name: newName },
    });
  };

  // 테이블 드롭다운 변경 (즉시 DB 저장)
  const handleUpdateVisibleTable = (presetId: string, table: TableType) => {
    updateMutation.mutate({
      presetId,
      projectId: currentProject.id,
      updates: { visible_table: table },
    });
  };

  // 기존 몰아보기 이름 목록 (중복 체크용)
  const existingNames = presetsWithData?.map(p => p.name) ?? [];

  if (isLoading) {
    return (
      <div className="quad-view-loading">
        <p>몰아보기를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="quad-view-screen">
      <div className="quad-grid">
        {Array.from({ length: MAX_PRESET_SLOTS }, (_, i) => (
          <PresetSlotCard
            key={i}
            slotIndex={i}
            preset={getPresetForSlot(i)}
            currentCalculationResult={currentCalculationResult}
            onSave={handleOpenSaveModal}
            onDelete={handleDelete}
            onUpdateName={handleUpdateName}
            onUpdateVisibleTable={handleUpdateVisibleTable}
          />
        ))}
      </div>

      {/* 몰아보기 저장 모달 */}
      {saveModalOpen && currentCalculationResult && (
        <PresetSaveModal
          isOpen={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
          projectId={currentProject.id}
          slotIndex={saveSlotIndex}
          calculationResult={currentCalculationResult}
          existingNames={existingNames}
        />
      )}
    </div>
  );
}
