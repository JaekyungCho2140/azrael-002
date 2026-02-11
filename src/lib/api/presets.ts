/**
 * Presets API (Supabase)
 * 참조: prd/Azrael-PRD-Phase4.md §4.5
 */

import { supabase } from '../supabase';
import type { Database } from '../../types/supabase';
import type { PresetSlot, TableType } from '../../types';

/**
 * Supabase Row → TypeScript PresetSlot 타입 매핑
 */
function mapToPresetSlot(
  row: Database['public']['Tables']['preset_slots']['Row']
): PresetSlot {
  return {
    id: row.id,
    projectId: row.project_id,
    slotIndex: row.slot_index,
    name: row.name,
    calculationId: row.calculation_id,
    visibleTable: row.visible_table as TableType,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

/**
 * 몰아보기 슬롯 목록 조회 (프로젝트별 + 사용자별)
 */
export async function fetchPresetSlots(projectId: string): Promise<PresetSlot[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('인증되지 않은 사용자');

  const { data, error } = await supabase
    .from('preset_slots')
    .select('*')
    .eq('project_id', projectId)
    .eq('created_by', user.id)
    .order('slot_index');

  if (error) throw error;
  return (data ?? []).map(mapToPresetSlot);
}

/**
 * 몰아보기 슬롯 저장
 */
export async function savePresetSlot(params: {
  projectId: string;
  slotIndex: number;
  name: string;
  calculationId: string;
  visibleTable: TableType;
}): Promise<PresetSlot> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('인증되지 않은 사용자');

  const { data, error } = await supabase
    .from('preset_slots')
    .insert({
      project_id: params.projectId,
      slot_index: params.slotIndex,
      name: params.name,
      calculation_id: params.calculationId,
      visible_table: params.visibleTable,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return mapToPresetSlot(data);
}

/**
 * 몰아보기 슬롯 업데이트 (이름, visible_table)
 */
export async function updatePresetSlot(params: {
  presetId: string;
  projectId: string;  // invalidateQueries 키용
  updates: { name?: string; visible_table?: string };
}): Promise<void> {
  const { error } = await supabase
    .from('preset_slots')
    .update({ ...params.updates, updated_at: new Date().toISOString() })
    .eq('id', params.presetId);

  if (error) throw error;
}

/**
 * 몰아보기 슬롯 삭제
 */
export async function deletePresetSlot(params: {
  presetId: string;
  projectId: string;  // invalidateQueries 키용
}): Promise<void> {
  const { error } = await supabase
    .from('preset_slots')
    .delete()
    .eq('id', params.presetId);

  if (error) throw error;
}
