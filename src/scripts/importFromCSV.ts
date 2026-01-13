/**
 * CSV → Supabase 직접 임포트 스크립트
 * 참조: docs/Supabase-Migration-Plan.md Phase 4 (수정)
 *
 * 실행 방법:
 * npm run import-csv
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import * as fs from 'fs';
import * as path from 'path';

// .env 파일 로드
config();

// Supabase 연결 (환경 변수 로드)
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  console.error('');
  console.error('💡 .env 파일에 SUPABASE_SERVICE_ROLE_KEY를 추가해주세요.');
  console.error('   (Supabase 대시보드 → Settings → API → service_role key)');
  process.exit(1);
}

console.log('🔧 환경 변수 확인:');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Service Key: ${supabaseServiceKey.substring(0, 30)}...`);
console.log('');

// Service Role Key로 클라이언트 생성 (RLS 우회)
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

interface ImportResult {
  projects: number;
  templates: number;
  stages: number;
  holidays: number;
  errors: string[];
}

/**
 * Projects.csv 임포트
 */
async function importProjects(csvPath: string): Promise<number> {
  console.log('📦 Projects.csv 임포트 중...');

  const csvText = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvText
    .replace(/^\uFEFF/, '') // BOM 제거
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.trim());

  let count = 0;

  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split(',');
    if (columns.length < 4) continue;

    const name = columns[0].trim();
    const headsUpOffset = parseInt(columns[1].trim());
    const showIosReviewDate = columns[2].trim().toUpperCase() === 'TRUE';
    const iosReviewOffset = parseInt(columns[3].trim());

    // ID 생성: "M4/GL" → "M4_GL"
    const id = name.replace(/\//g, '_').replace(/\s*\(([^)]+)\)/, '_$1').replace(/\s+/g, '_');
    const templateId = `template_${id}`;

    try {
      const { error } = await supabase.from('projects').upsert(
        {
          id,
          name,
          heads_up_offset: headsUpOffset,
          ios_review_offset: showIosReviewDate ? iosReviewOffset : null,
          show_ios_review_date: showIosReviewDate,
          template_id: templateId,
          disclaimer: '',
          created_by: 'csv-import@azrael.local',
        },
        { onConflict: 'id' }
      );

      if (error) {
        console.error(`   ❌ ${name}: ${error.message}`);
      } else {
        console.log(`   ✅ ${name} (${id})`);
        count++;
      }
    } catch (err: any) {
      console.error(`   ❌ ${name} Exception:`, err.message);
      console.error(`      Cause:`, err.cause);
    }
  }

  console.log(`   완료: ${count}/${lines.length - 1}\n`);
  return count;
}

/**
 * index.csv 임포트 (Templates + Stages)
 */
async function importTemplatesAndStages(csvPath: string): Promise<{ templates: number; stages: number }> {
  console.log('📦 index.csv 임포트 중 (업무 단계)...');

  const csvText = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvText
    .replace(/^\uFEFF/, '') // BOM 제거
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.trim());

  // 프로젝트별로 stages 그룹화
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

    // 프로젝트 ID 변환
    const projectId = projectName.replace(/\//g, '_').replace(/\s*\(([^)]+)\)/, '_$1').replace(/\s+/g, '_');
    const templateId = `template_${projectId}`;

    // 테이블 타겟 파싱 ("T1" → "table1")
    const tableTargets = tableTargetsStr
      .split(/[,\s]+/)
      .map((t) => t.replace('T', 'table'))
      .filter((t) => ['table1', 'table2', 'table3'].includes(t));

    if (!stagesByProject[templateId]) {
      stagesByProject[templateId] = [];
    }

    stagesByProject[templateId].push({
      id: `${templateId}_stage_${stagesByProject[templateId].length}`,
      template_id: templateId,
      name: stageName,
      start_offset_days: startOffset,
      end_offset_days: endOffset,
      start_time: startTime,
      end_time: endTime,
      order: stagesByProject[templateId].length,
      parent_stage_id: null,
      depth: 0,
      table_targets: tableTargets,
    });
  }

  // 템플릿 삽입
  const templateIds = Object.keys(stagesByProject);
  let templateCount = 0;
  let stageCount = 0;

  for (const templateId of templateIds) {
    const stages = stagesByProject[templateId];
    const projectId = templateId.replace('template_', '');

    // 1. Template 삽입
    const { error: templateError } = await supabase.from('work_templates').upsert(
      {
        id: templateId,
        project_id: projectId,
      },
      { onConflict: 'id' }
    );

    if (templateError) {
      console.error(`   ❌ Template ${templateId}: ${templateError.message}`);
      continue;
    }

    templateCount++;

    // 2. 기존 Stages 삭제
    await supabase.from('work_stages').delete().eq('template_id', templateId);

    // 3. 새 Stages 삽입
    if (stages.length > 0) {
      const { error: stageError } = await supabase.from('work_stages').insert(stages);

      if (stageError) {
        console.error(`   ❌ Stages for ${templateId}: ${stageError.message}`);
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
 * Holidays.csv 임포트
 */
async function importHolidays(csvPath: string): Promise<number> {
  console.log('📦 Holidays.csv 임포트 중...');

  const csvText = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvText
    .replace(/^\uFEFF/, '') // BOM 제거
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.trim());

  const holidays = [];

  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split(',');
    if (columns.length < 3) continue;

    const name = columns[1].trim();
    const date = columns[2].trim(); // YYYY-MM-DD

    holidays.push({
      date,
      name,
      is_manual: true, // CSV 임포트는 수동으로 간주
      created_by: 'csv-import@azrael.local',
    });
  }

  // 기존 데이터 삭제 (중복 방지)
  await supabase.from('holidays').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 새 데이터 삽입
  const { error } = await supabase.from('holidays').insert(holidays);

  if (error) {
    console.error(`   ❌ 실패: ${error.message}`);
    return 0;
  }

  console.log(`   ✅ ${holidays.length}개 공휴일 임포트 완료\n`);
  return holidays.length;
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('🚀 CSV → Supabase 임포트 시작\n');

  const result: ImportResult = {
    projects: 0,
    templates: 0,
    stages: 0,
    holidays: 0,
    errors: [],
  };

  try {
    // 1. Projects 임포트
    result.projects = await importProjects(path.join(process.cwd(), 'Projects.csv'));

    // 2. Templates & Stages 임포트
    const templatesResult = await importTemplatesAndStages(path.join(process.cwd(), 'index.csv'));
    result.templates = templatesResult.templates;
    result.stages = templatesResult.stages;

    // 3. Holidays 임포트
    result.holidays = await importHolidays(path.join(process.cwd(), 'Holidays.csv'));

    // 최종 결과
    console.log('🎉 임포트 완료!\n');
    console.log('📊 요약:');
    console.log(`   Projects: ${result.projects}개`);
    console.log(`   Templates: ${result.templates}개`);
    console.log(`   WorkStages: ${result.stages}개`);
    console.log(`   Holidays: ${result.holidays}개`);
    console.log('');
    console.log('✅ Supabase에서 확인하세요:');
    console.log('   https://supabase.com/dashboard');
  } catch (err: any) {
    console.error('\n❌ 임포트 실패:', err.message);
    process.exit(1);
  }
}

// 스크립트 실행
main();
