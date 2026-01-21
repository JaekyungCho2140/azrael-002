/**
 * LocalStorage → Supabase 데이터 마이그레이션 스크립트
 * 참조: docs/Supabase-Migration-Plan.md Phase 4
 *
 * 실행 방법:
 * 1. 개발 서버 실행: npm run dev
 * 2. 브라우저 콘솔에서 실행:
 *    import { migrateLocalStorageToSupabase } from './scripts/migrateToSupabase';
 *    await migrateLocalStorageToSupabase();
 */

import { supabase, getCurrentUserEmail } from '../lib/supabase';
import { loadHolidays } from '../lib/storage';
import { Project, WorkTemplate, STORAGE_KEYS } from '../types';

/**
 * LocalStorage에서 Projects 읽기 (인라인 구현)
 * storage.ts에서 마이그레이션 함수 삭제 후 여기서 직접 구현
 */
function getProjects(): Project[] {
  const json = localStorage.getItem(STORAGE_KEYS.PROJECTS);
  if (!json) return [];
  return JSON.parse(json);
}

/**
 * LocalStorage에서 Templates 읽기 (인라인 구현)
 */
function getTemplates(): WorkTemplate[] {
  const json = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
  if (!json) return [];
  return JSON.parse(json);
}

interface MigrationResult {
  success: boolean;
  summary: {
    projects: number;
    templates: number;
    stages: number;
    holidays: number;
  };
  errors: string[];
}

/**
 * 메인 마이그레이션 함수
 */
export async function migrateLocalStorageToSupabase(): Promise<MigrationResult> {
  console.log('🚀 Azrael 데이터 마이그레이션 시작...');
  console.log('📍 LocalStorage → Supabase');
  console.log('');

  const result: MigrationResult = {
    success: true,
    summary: {
      projects: 0,
      templates: 0,
      stages: 0,
      holidays: 0,
    },
    errors: [],
  };

  try {
    // 0. 사용자 인증 확인
    const userEmail = await getCurrentUserEmail();
    if (!userEmail) {
      throw new Error('로그인이 필요합니다. Gmail OAuth로 먼저 로그인해주세요.');
    }
    console.log(`✅ 인증 확인: ${userEmail}`);
    console.log('');

    // 1. Projects 마이그레이션
    console.log('📦 1. Projects 마이그레이션...');
    const localProjects = getProjects();
    console.log(`   발견: ${localProjects.length}개`);

    for (const project of localProjects) {
      try {
        const { error } = await supabase.from('projects').upsert({
          id: project.id,
          name: project.name,
          heads_up_offset: project.headsUpOffset,
          ios_review_offset: project.iosReviewOffset,
          show_ios_review_date: project.showIosReviewDate,
          template_id: project.templateId,
          disclaimer: project.disclaimer || '',
          created_by: userEmail,
        }, {
          onConflict: 'id', // 중복 시 업데이트
        });

        if (error) {
          console.error(`   ❌ ${project.id} 실패:`, error.message);
          result.errors.push(`Project ${project.id}: ${error.message}`);
        } else {
          console.log(`   ✅ ${project.id} (${project.name})`);
          result.summary.projects++;
        }
      } catch (err: any) {
        console.error(`   ❌ ${project.id} 예외:`, err.message);
        result.errors.push(`Project ${project.id}: ${err.message}`);
      }
    }
    console.log(`   완료: ${result.summary.projects}/${localProjects.length}`);
    console.log('');

    // 2. WorkTemplates & WorkStages 마이그레이션
    console.log('📦 2. WorkTemplates & WorkStages 마이그레이션...');
    const localTemplates = getTemplates();
    console.log(`   발견: ${localTemplates.length}개 템플릿`);

    for (const template of localTemplates) {
      try {
        // 2-1. WorkTemplate 삽입
        const { error: templateError } = await supabase
          .from('work_templates')
          .upsert({
            id: template.id,
            project_id: template.projectId,
          }, {
            onConflict: 'id',
          });

        if (templateError) {
          console.error(`   ❌ Template ${template.id} 실패:`, templateError.message);
          result.errors.push(`Template ${template.id}: ${templateError.message}`);
          continue;
        }

        result.summary.templates++;
        console.log(`   ✅ Template: ${template.id}`);

        // 2-2. WorkStages 삽입
        if (template.stages.length > 0) {
          // 기존 stages 삭제 후 재삽입 (upsert가 복잡하므로)
          await supabase
            .from('work_stages')
            .delete()
            .eq('template_id', template.id);

          const { error: stageError } = await supabase
            .from('work_stages')
            .insert(
              template.stages.map((stage) => ({
                id: stage.id,
                template_id: template.id,
                name: stage.name,
                start_offset_days: stage.startOffsetDays,
                end_offset_days: stage.endOffsetDays,
                start_time: stage.startTime,
                end_time: stage.endTime,
                order: stage.order,
                parent_stage_id: stage.parentStageId,
                depth: stage.depth,
                table_targets: stage.tableTargets,
              }))
            );

          if (stageError) {
            console.error(`   ❌ Stages for ${template.id} 실패:`, stageError.message);
            result.errors.push(`Stages for ${template.id}: ${stageError.message}`);
          } else {
            console.log(`      ✅ Stages: ${template.stages.length}개`);
            result.summary.stages += template.stages.length;
          }
        } else {
          console.log(`      ⏭️  Stages: 없음`);
        }
      } catch (err: any) {
        console.error(`   ❌ Template ${template.id} 예외:`, err.message);
        result.errors.push(`Template ${template.id}: ${err.message}`);
      }
    }
    console.log(`   완료: ${result.summary.templates}/${localTemplates.length} 템플릿, ${result.summary.stages}개 stage`);
    console.log('');

    // 3. Holidays 마이그레이션
    console.log('📦 3. Holidays 마이그레이션...');
    const localHolidays = loadHolidays();
    console.log(`   발견: ${localHolidays.length}개`);

    for (const holiday of localHolidays) {
      try {
        const dateStr = holiday.date.toISOString().split('T')[0]; // YYYY-MM-DD

        const { error } = await supabase.from('holidays').upsert({
          date: dateStr,
          name: holiday.name,
          is_manual: holiday.isManual,
          created_by: holiday.isManual ? userEmail : null,
        }, {
          onConflict: 'date', // 날짜 중복 시 업데이트
        });

        if (error) {
          console.error(`   ❌ ${holiday.name} (${dateStr}) 실패:`, error.message);
          result.errors.push(`Holiday ${holiday.name}: ${error.message}`);
        } else {
          console.log(`   ✅ ${holiday.name} (${dateStr})`);
          result.summary.holidays++;
        }
      } catch (err: any) {
        console.error(`   ❌ ${holiday.name} 예외:`, err.message);
        result.errors.push(`Holiday ${holiday.name}: ${err.message}`);
      }
    }
    console.log(`   완료: ${result.summary.holidays}/${localHolidays.length}`);
    console.log('');

    // 4. 최종 결과
    console.log('🎉 마이그레이션 완료!');
    console.log('');
    console.log('📊 요약:');
    console.log(`   Projects: ${result.summary.projects}개`);
    console.log(`   Templates: ${result.summary.templates}개`);
    console.log(`   WorkStages: ${result.summary.stages}개`);
    console.log(`   Holidays: ${result.summary.holidays}개`);

    if (result.errors.length > 0) {
      console.log('');
      console.log('⚠️  오류 발생:');
      result.errors.forEach((err) => console.log(`   - ${err}`));
      result.success = false;
    }

    console.log('');
    console.log('✅ Supabase 데이터 확인:');
    console.log('   https://supabase.com/dashboard → SQL Editor');
    console.log('   SELECT * FROM projects;');
    console.log('   SELECT * FROM work_templates;');
    console.log('   SELECT * FROM work_stages;');
    console.log('   SELECT * FROM holidays;');

    return result;
  } catch (err: any) {
    console.error('');
    console.error('❌ 마이그레이션 실패:', err.message);
    result.success = false;
    result.errors.push(`Critical error: ${err.message}`);
    return result;
  }
}

/**
 * 마이그레이션 검증 함수
 */
export async function validateMigration(): Promise<void> {
  console.log('🔍 마이그레이션 검증 시작...');
  console.log('');

  const localProjects = getProjects();
  const localTemplates = getTemplates();
  const localHolidays = loadHolidays();

  console.log('📦 LocalStorage 데이터:');
  console.log(`   Projects: ${localProjects.length}개`);
  console.log(`   Templates: ${localTemplates.length}개`);
  console.log(`   Holidays: ${localHolidays.length}개`);
  console.log('');

  // Supabase 데이터 조회
  const { data: projects } = await supabase.from('projects').select('*');
  const { data: templates } = await supabase.from('work_templates').select('*');
  const { data: stages } = await supabase.from('work_stages').select('*');
  const { data: holidays } = await supabase.from('holidays').select('*');

  console.log('☁️  Supabase 데이터:');
  console.log(`   Projects: ${projects?.length || 0}개`);
  console.log(`   Templates: ${templates?.length || 0}개`);
  console.log(`   WorkStages: ${stages?.length || 0}개`);
  console.log(`   Holidays: ${holidays?.length || 0}개`);
  console.log('');

  // 비교
  const projectsMatch = localProjects.length === (projects?.length || 0);
  const templatesMatch = localTemplates.length === (templates?.length || 0);
  const holidaysMatch = localHolidays.length === (holidays?.length || 0);

  console.log('✅ 검증 결과:');
  console.log(`   Projects: ${projectsMatch ? '✅ 일치' : '❌ 불일치'}`);
  console.log(`   Templates: ${templatesMatch ? '✅ 일치' : '❌ 불일치'}`);
  console.log(`   Holidays: ${holidaysMatch ? '✅ 일치' : '❌ 불일치'}`);

  if (projectsMatch && templatesMatch && holidaysMatch) {
    console.log('');
    console.log('🎉 모든 데이터가 정상적으로 마이그레이션되었습니다!');
  } else {
    console.log('');
    console.log('⚠️  일부 데이터가 일치하지 않습니다. 마이그레이션을 다시 실행해주세요.');
  }
}

// 브라우저 콘솔에서 사용할 수 있도록 window 객체에 추가
if (typeof window !== 'undefined') {
  (window as any).migrateToSupabase = migrateLocalStorageToSupabase;
  (window as any).validateMigration = validateMigration;
}
