/**
 * Calculation Results API
 * 계산 결과 Supabase 저장/조회
 */

import { supabase } from '../supabase';
import { CalculationResult, ScheduleEntry } from '../../types';
import { formatDateLocal } from '../businessDays';

/**
 * 계산 결과 조회
 * @param projectId 프로젝트 ID
 * @param updateDate 업데이트일
 * @returns 계산 결과 또는 null
 */
export async function fetchCalculationResult(
  projectId: string,
  updateDate: Date
): Promise<CalculationResult | null> {
  try {
    const updateDateStr = formatDateLocal(updateDate);

    // 1. calculation_results 조회
    const { data: calcData, error: calcError } = await (supabase as any)
      .from('calculation_results')
      .select('*')
      .eq('project_id', projectId)
      .eq('update_date', updateDateStr)
      .maybeSingle();

    if (calcError) throw calcError;
    if (!calcData) return null;

    // 2. schedule_entries 조회 (3개 테이블)
    const { data: entriesData, error: entriesError } = await (supabase as any)
      .from('schedule_entries')
      .select('*')
      .eq('calculation_id', calcData.id)
      .order('entry_index');

    if (entriesError) throw entriesError;

    // 3. ScheduleEntry 재구성 (부모-자식 관계)
    const buildEntries = (tableType: 'table1' | 'table2' | 'table3'): ScheduleEntry[] => {
      const tableEntries = entriesData?.filter((e: any) => e.table_type === tableType) || [];
      const parentEntries = tableEntries.filter((e: any) => !e.parent_id);

      return parentEntries.map((parent: any) => {
        const entry: ScheduleEntry = {
          id: parent.id,
          index: parent.entry_index,
          stageId: parent.stage_id,
          stageName: parent.stage_name,
          startDateTime: new Date(parent.start_datetime),
          endDateTime: new Date(parent.end_datetime),
          description: '',
          assignee: '',
          jiraDescription: '',
          jiraAssignee: '',
          isManualEdit: false,
        };

        // 하위 일감 찾기
        const children = tableEntries.filter((e: any) => e.parent_id === parent.id);
        if (children.length > 0) {
          entry.children = children.map((child: any) => ({
            id: child.id,
            index: child.entry_index,
            stageId: child.stage_id,
            stageName: child.stage_name,
            startDateTime: new Date(child.start_datetime),
            endDateTime: new Date(child.end_datetime),
            description: '',
            jiraDescription: '',
            parentId: parent.id,
            isManualEdit: false,
          }));
        }

        return entry;
      });
    };

    // 4. CalculationResult 조립
    const result: CalculationResult = {
      projectId: calcData.project_id,
      updateDate: new Date(calcData.update_date),
      headsUpDate: new Date(calcData.heads_up_date),
      iosReviewDate: calcData.ios_review_date ? new Date(calcData.ios_review_date) : undefined,
      table1Entries: buildEntries('table1'),
      table2Entries: buildEntries('table2'),
      table3Entries: buildEntries('table3'),
      calculatedAt: new Date(calcData.calculated_at),
    };

    return result;
  } catch (error) {
    console.error('계산 결과 조회 실패:', error);
    throw error;
  }
}

/**
 * 계산 결과 저장 (UPSERT - 덮어쓰기)
 * @param result 계산 결과
 * @param userEmail 계산한 사용자 이메일
 */
export async function saveCalculationResult(
  result: CalculationResult,
  userEmail: string
): Promise<void> {
  try {
    const updateDateStr = formatDateLocal(result.updateDate);
    const headsUpDateStr = formatDateLocal(result.headsUpDate);
    const iosReviewDateStr = result.iosReviewDate ? formatDateLocal(result.iosReviewDate) : null;

    // 1. calculation_results UPSERT
    const { data: calcData, error: calcError } = await (supabase as any)
      .from('calculation_results')
      .upsert(
        {
          project_id: result.projectId,
          update_date: updateDateStr,
          heads_up_date: headsUpDateStr,
          ios_review_date: iosReviewDateStr,
          calculated_by: userEmail,
        },
        {
          onConflict: 'project_id,update_date',
        }
      )
      .select()
      .single();

    if (calcError) throw calcError;
    if (!calcData) throw new Error('계산 결과 저장 실패');

    // 2. 기존 schedule_entries 삭제 (CASCADE로 자동 삭제됨)
    // (UPSERT 시 자동으로 이전 entries가 삭제되므로 별도 DELETE 불필요)

    // 3. 새 schedule_entries INSERT (부모 먼저, 자식 나중)
    const saveParentsAndChildren = async (
      entries: ScheduleEntry[],
      tableType: 'table1' | 'table2' | 'table3'
    ) => {
      for (const entry of entries) {
        // 부모 저장
        const { data: parentData, error: parentError } = await (supabase as any)
          .from('schedule_entries')
          .insert({
            calculation_id: calcData.id,
            table_type: tableType,
            entry_index: entry.index,
            stage_id: entry.stageId,
            stage_name: entry.stageName,
            start_datetime: entry.startDateTime.toISOString(),
            end_datetime: entry.endDateTime.toISOString(),
            parent_id: null,
          })
          .select()
          .single();

        if (parentError) throw parentError;

        // 하위 일감 저장
        if (entry.children && entry.children.length > 0) {
          const childrenToInsert = entry.children.map(child => ({
            calculation_id: calcData.id,
            table_type: tableType,
            entry_index: child.index,
            stage_id: child.stageId,
            stage_name: child.stageName,
            start_datetime: child.startDateTime.toISOString(),
            end_datetime: child.endDateTime.toISOString(),
            parent_id: parentData.id,  // 부모 UUID
          }));

          const { error: childrenError } = await (supabase as any)
            .from('schedule_entries')
            .insert(childrenToInsert);

          if (childrenError) throw childrenError;
        }
      }
    };

    await saveParentsAndChildren(result.table1Entries, 'table1');
    await saveParentsAndChildren(result.table2Entries, 'table2');
    await saveParentsAndChildren(result.table3Entries, 'table3');

  } catch (error) {
    console.error('계산 결과 저장 실패:', error);
    throw error;
  }
}
