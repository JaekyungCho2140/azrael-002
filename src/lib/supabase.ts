/**
 * Supabase Client 초기화
 * 참조: docs/Supabase-Migration-Plan.md
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check .env file.'
  );
}

/**
 * Supabase 클라이언트
 * - RLS 정책 적용됨
 * - 인증된 사용자만 데이터 접근 가능
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Gmail OAuth 토큰으로 Supabase 세션 생성
 * @param googleToken Gmail OAuth access token
 */
export async function signInWithGoogleToken(googleToken: string) {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: googleToken,
  });

  if (error) {
    console.error('Supabase sign-in failed:', error);
    throw error;
  }

  return data;
}

/**
 * 현재 로그인한 사용자 이메일 가져오기
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email || null;
}

/**
 * 로그아웃
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Supabase sign-out failed:', error);
    throw error;
  }
}
