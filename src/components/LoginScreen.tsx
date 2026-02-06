/**
 * Login Screen Component
 * 참조: prd/Azrael-PRD-Phase0.md §2 로그인 및 인증
 * 참조: prd/Azrael-PRD-Design.md §7.1 로그인 화면
 *
 * Phase 3.5: Google OAuth + Supabase Auth 통합
 */

import { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { signInWithGoogleToken, supabase } from '../lib/supabase';
import './LoginScreen.css';

interface LoginScreenProps {
  onLogin: (email: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError('');

    try {
      // 1. Google ID Token 추출
      const idToken = credentialResponse.credential;

      if (!idToken) {
        throw new Error('Google 인증 토큰을 받지 못했습니다.');
      }

      // 2. Supabase 세션 생성
      const { session } = await signInWithGoogleToken(idToken);
      const email = session?.user?.email;

      if (!email) {
        throw new Error('이메일 정보를 가져올 수 없습니다.');
      }

      // 3. 화이트리스트 검증
      const allowedUsers = import.meta.env.VITE_ALLOWED_USERS?.split(',') || [];
      if (!allowedUsers.includes(email)) {
        console.error('❌ 화이트리스트 검증 실패:', email);
        setError(`접근 권한이 없습니다 (${email}). 관리자에게 문의하세요.`);
        await supabase.auth.signOut();
        return;
      }

      // 4. 로그인 완료
      onLogin(email);
    } catch (err: any) {
      console.error('❌ 로그인 실패:', err);
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error('❌ Google 로그인 실패');
    setError('Google 로그인에 실패했습니다.');
  };

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">⚠️ 설정 오류</h1>
          <p className="login-error">
            Google Client ID가 설정되지 않았습니다.<br />
            .env 파일을 확인해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="login-container">
        <div className="login-card">
          {/* 고양이 일러스트 */}
          <div className="cat-logo">
            🐱
          </div>

          {/* 로고 */}
          <h1 className="login-title">Azrael</h1>
          <p className="login-subtitle">L10n 일정 관리 도구</p>

          {/* Google 로그인 버튼 */}
          <div className="login-form" style={{ marginTop: '2rem' }}>
            {error && <p className="login-error">{error}</p>}

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <p>로그인 중...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  text="signin_with"
                  shape="rectangular"
                  size="large"
                  theme="filled_blue"
                  useOneTap={false}
                />
              </div>
            )}
          </div>

          <p className="login-note">회사 계정만 접근 가능합니다.</p>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
