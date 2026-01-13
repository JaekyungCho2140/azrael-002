/**
 * CSV → Supabase 브라우저 임포트 스크립트
 *
 * 실행 방법:
 * 1. npm run dev
 * 2. 브라우저 콘솔 (F12)에서:
 *    import('./scripts/importFromCSVBrowser.js').then(m => m.importAllCSV());
 */

import { supabase } from '../lib/supabase';

interface ImportResult {
  projects: number;
  templates: number;
  stages: number;
  holidays: number;
  errors: string[];
}


/**
 * Projects 임포트
 */
async function importProjects(): Promise<number> {
  console.log('📦 Projects 임포트 중...');

  // Projects.csv 내용 하드코딩
  const projectsData = [
    { name: 'M4/GL', headsUpOffset: 18, showIos: true, iosOffset: 4 },
    { name: 'NC/GL (1주)', headsUpOffset: 7, showIos: true, iosOffset: 4 },
    { name: 'NC/GL (2주)', headsUpOffset: 13, showIos: true, iosOffset: 4 },
    { name: 'FB/GL (CDN)', headsUpOffset: 12, showIos: false, iosOffset: 0 },
    { name: 'FB/GL (APP)', headsUpOffset: 15, showIos: true, iosOffset: 4 },
    { name: 'FB/JP (CDN)', headsUpOffset: 12, showIos: false, iosOffset: 0 },
    { name: 'FB/JP (APP)', headsUpOffset: 15, showIos: true, iosOffset: 4 },
    { name: 'LY/GL', headsUpOffset: 7, showIos: true, iosOffset: 3 },
  ];

  const user = (await supabase.auth.getUser()).data.user;
  const userEmail = user?.email || 'browser-import@azrael.local';

  let count = 0;

  for (const proj of projectsData) {
    const id = proj.name.replace(/\//g, '_').replace(/\s*\(([^)]+)\)/, '_$1').replace(/\s+/g, '_');
    const templateId = `template_${id}`;

    const { error } = await supabase.from('projects').upsert(
      {
        id,
        name: proj.name,
        heads_up_offset: proj.headsUpOffset,
        ios_review_offset: proj.showIos ? proj.iosOffset : null,
        show_ios_review_date: proj.showIos,
        template_id: templateId,
        disclaimer: '',
        created_by: userEmail,
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error(`   ❌ ${proj.name}:`, error.message);
    } else {
      console.log(`   ✅ ${proj.name} (${id})`);
      count++;
    }
  }

  console.log(`   완료: ${count}/${projectsData.length}\n`);
  return count;
}

/**
 * Templates & Stages 임포트
 */
async function importTemplatesAndStages(): Promise<{ templates: number; stages: number }> {
  console.log('📦 Templates & Stages 임포트 중...');

  // index.csv 내용 하드코딩
  const stagesData = [
    // M4/GL
    { project: 'M4/GL', name: '정기', startOffset: 12, endOffset: 5, startTime: '15:00', endTime: '17:00', tables: ['table1'] },
    { project: 'M4/GL', name: '1차', startOffset: 10, endOffset: 5, startTime: '15:00', endTime: '17:00', tables: ['table1'] },
    { project: 'M4/GL', name: '2차', startOffset: 7, endOffset: 2, startTime: '15:00', endTime: '17:00', tables: ['table1'] },
    { project: 'M4/GL', name: 'REGULAR', startOffset: 12, endOffset: 6, startTime: '18:00', endTime: '11:00', tables: ['table2'] },
    { project: 'M4/GL', name: 'EXTRA0', startOffset: 10, endOffset: 6, startTime: '18:00', endTime: '11:00', tables: ['table2'] },
    { project: 'M4/GL', name: 'EXTRA1', startOffset: 7, endOffset: 2, startTime: '18:00', endTime: '11:00', tables: ['table2'] },

    // NC/GL (1주)
    { project: 'NC/GL (1주)', name: '정기', startOffset: 6, endOffset: 4, startTime: '15:00', endTime: '12:00', tables: ['table1'] },
    { project: 'NC/GL (1주)', name: '1차', startOffset: 4, endOffset: 2, startTime: '15:00', endTime: '12:00', tables: ['table1'] },
    { project: 'NC/GL (1주)', name: '2차', startOffset: 3, endOffset: 1, startTime: '15:00', endTime: '12:00', tables: ['table1'] },
    { project: 'NC/GL (1주)', name: 'REGULAR', startOffset: 6, endOffset: 4, startTime: '17:00', endTime: '10:00', tables: ['table2'] },
    { project: 'NC/GL (1주)', name: 'EXTRA0', startOffset: 4, endOffset: 2, startTime: '17:00', endTime: '10:00', tables: ['table2'] },
    { project: 'NC/GL (1주)', name: 'EXTRA1', startOffset: 3, endOffset: 1, startTime: '17:00', endTime: '10:00', tables: ['table2'] },

    // NC/GL (2주)
    { project: 'NC/GL (2주)', name: '정기', startOffset: 8, endOffset: 1, startTime: '11:00', endTime: '12:00', tables: ['table1'] },
    { project: 'NC/GL (2주)', name: '1차', startOffset: 8, endOffset: 4, startTime: '11:00', endTime: '12:00', tables: ['table1'] },
    { project: 'NC/GL (2주)', name: '2차', startOffset: 6, endOffset: 4, startTime: '11:00', endTime: '12:00', tables: ['table1'] },
    { project: 'NC/GL (2주)', name: 'REGULAR', startOffset: 8, endOffset: 1, startTime: '18:00', endTime: '10:00', tables: ['table2'] },
    { project: 'NC/GL (2주)', name: 'EXTRA0', startOffset: 8, endOffset: 4, startTime: '18:00', endTime: '10:00', tables: ['table2'] },
    { project: 'NC/GL (2주)', name: 'EXTRA1', startOffset: 6, endOffset: 4, startTime: '18:00', endTime: '10:00', tables: ['table2'] },
  ];

  // 프로젝트별로 stages 그룹화
  const stagesByProject: Record<string, any[]> = {};

  stagesData.forEach((stage) => {
    const projectId = stage.project.replace(/\//g, '_').replace(/\s*\(([^)]+)\)/, '_$1').replace(/\s+/g, '_');
    const templateId = `template_${projectId}`;

    if (!stagesByProject[templateId]) {
      stagesByProject[templateId] = [];
    }

    stagesByProject[templateId].push({
      id: `${templateId}_stage_${stagesByProject[templateId].length}`,
      template_id: templateId,
      name: stage.name,
      start_offset_days: stage.startOffset,
      end_offset_days: stage.endOffset,
      start_time: stage.startTime,
      end_time: stage.endTime,
      order: stagesByProject[templateId].length,
      parent_stage_id: null,
      depth: 0,
      table_targets: stage.tables,
    });
  });

  // 템플릿 삽입
  const templateIds = Object.keys(stagesByProject);
  let templateCount = 0;
  let stageCount = 0;

  for (const templateId of templateIds) {
    const stages = stagesByProject[templateId];
    const projectId = templateId.replace('template_', '');

    // 1. Template 삽입
    const { error: templateError } = await supabase.from('work_templates').upsert(
      { id: templateId, project_id: projectId },
      { onConflict: 'id' }
    );

    if (templateError) {
      console.error(`   ❌ Template ${templateId}:`, templateError.message);
      continue;
    }

    templateCount++;

    // 2. 기존 Stages 삭제
    await supabase.from('work_stages').delete().eq('template_id', templateId);

    // 3. 새 Stages 삽입
    if (stages.length > 0) {
      const { error: stageError } = await supabase.from('work_stages').insert(stages);

      if (stageError) {
        console.error(`   ❌ Stages for ${templateId}:`, stageError.message);
      } else {
        console.log(`   ✅ ${projectId}: ${stages.length}개 stage`);
        stageCount += stages.length;
      }
    }
  }

  console.log(`   완료: ${templateCount}개 템플릿, ${stageCount}개 stage\n`);
  return { templates: templateCount, stages: stageCount };
}

/**
 * Holidays 임포트
 */
async function importHolidays(): Promise<number> {
  console.log('📦 Holidays 임포트 중...');

  const holidaysData = [
    { name: '신정', date: '2026-01-01' },
    { name: '설 전날', date: '2026-02-16' },
    { name: '설', date: '2026-02-17' },
    { name: '설 다음날', date: '2026-02-18' },
    { name: '홈데이(WM)', date: '2026-02-19' },
    { name: '삼일절', date: '2026-03-01' },
    { name: '삼일절 대체공휴일', date: '2026-03-02' },
    { name: '국회의원선거일', date: '2026-04-15' },
    { name: '어린이날', date: '2026-05-05' },
    { name: '부처님오신날', date: '2026-05-24' },
    { name: '부처님오신날 대체공휴일', date: '2026-05-25' },
    { name: '현충일', date: '2026-06-06' },
    { name: '광복절', date: '2026-08-15' },
    { name: '광복절 대체공휴일', date: '2026-08-17' },
    { name: '홈데이(WM)', date: '2026-09-23' },
    { name: '추석 전날', date: '2026-09-24' },
    { name: '추석', date: '2026-09-25' },
    { name: '추석 다음날', date: '2026-09-26' },
    { name: '개천절', date: '2026-10-03' },
    { name: '개천절 대체공휴일', date: '2026-10-05' },
    { name: '한글날', date: '2026-10-09' },
    { name: '크리스마스', date: '2026-12-25' },
    { name: '홈데이(WM)', date: '2026-12-31' },
  ];

  const user = (await supabase.auth.getUser()).data.user;
  const userEmail = user?.email || 'browser-import@azrael.local';

  // 기존 데이터 삭제
  await supabase.from('holidays').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 새 데이터 삽입
  const holidays = holidaysData.map((h) => ({
    date: h.date,
    name: h.name,
    is_manual: true,
    created_by: userEmail,
  }));

  const { error } = await supabase.from('holidays').insert(holidays);

  if (error) {
    console.error(`   ❌ 실패:`, error.message);
    return 0;
  }

  console.log(`   ✅ ${holidays.length}개 공휴일 임포트 완료\n`);
  return holidays.length;
}

/**
 * 전체 임포트 실행
 */
export async function importAllCSV(): Promise<ImportResult> {
  console.log('🚀 CSV → Supabase 임포트 시작 (브라우저)\n');

  // 로그인 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    console.error('❌ 로그인이 필요합니다. Gmail OAuth로 먼저 로그인해주세요.');
    throw new Error('Not authenticated');
  }

  console.log(`✅ 인증 확인: ${user.email}\n`);

  const result: ImportResult = {
    projects: 0,
    templates: 0,
    stages: 0,
    holidays: 0,
    errors: [],
  };

  try {
    // 1. Projects
    result.projects = await importProjects();

    // 2. Templates & Stages
    const templatesResult = await importTemplatesAndStages();
    result.templates = templatesResult.templates;
    result.stages = templatesResult.stages;

    // 3. Holidays
    result.holidays = await importHolidays();

    // 결과
    console.log('🎉 임포트 완료!\n');
    console.log('📊 요약:');
    console.log(`   Projects: ${result.projects}개`);
    console.log(`   Templates: ${result.templates}개`);
    console.log(`   WorkStages: ${result.stages}개`);
    console.log(`   Holidays: ${result.holidays}개`);

    return result;
  } catch (err: any) {
    console.error('\n❌ 임포트 실패:', err.message);
    throw err;
  }
}

// window 객체에 함수 노출
if (typeof window !== 'undefined') {
  (window as any).importAllCSV = importAllCSV;
  console.log('✅ importAllCSV() 함수가 준비되었습니다.');
  console.log('💡 사용법: importAllCSV()');
}
