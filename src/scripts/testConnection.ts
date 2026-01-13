/**
 * Supabase 연결 테스트 스크립트
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// .env 파일 로드
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('🔧 환경 변수:');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Service Key: ${supabaseServiceKey.substring(0, 50)}...`);
console.log('');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function testConnection() {
  console.log('🔍 Supabase 연결 테스트...\n');

  try {
    // 1. Projects 테이블 조회
    console.log('1. Projects 테이블 조회...');
    const { data, error, count } = await supabase
      .from('projects')
      .select('*', { count: 'exact' });

    if (error) {
      console.error('   ❌ Error:', error);
      throw error;
    }

    console.log(`   ✅ 성공! ${count}개 행 조회됨`);
    console.log(`   데이터:`, data);
    console.log('');

    // 2. 테스트 삽입
    console.log('2. 테스트 데이터 삽입...');
    const testId = `TEST_${Date.now()}`;
    const { error: insertError } = await supabase.from('projects').insert({
      id: testId,
      name: 'Test Project',
      heads_up_offset: 10,
      show_ios_review_date: false,
      template_id: `template_${testId}`,
      disclaimer: '',
      created_by: 'test@azrael.local',
    });

    if (insertError) {
      console.error('   ❌ Insert Error:', insertError);
      throw insertError;
    }

    console.log('   ✅ 삽입 성공!');
    console.log('');

    // 3. 테스트 삭제
    console.log('3. 테스트 데이터 삭제...');
    const { error: deleteError } = await supabase.from('projects').delete().eq('id', testId);

    if (deleteError) {
      console.error('   ❌ Delete Error:', deleteError);
      throw deleteError;
    }

    console.log('   ✅ 삭제 성공!');
    console.log('');

    console.log('🎉 모든 테스트 통과! Supabase 연결이 정상입니다.');
  } catch (err: any) {
    console.error('\n❌ 연결 테스트 실패:');
    console.error('   Message:', err.message);
    console.error('   Code:', err.code);
    console.error('   Cause:', err.cause);
    console.error('   Stack:', err.stack);
    process.exit(1);
  }
}

testConnection();
