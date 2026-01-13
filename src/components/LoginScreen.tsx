/**
 * Login Screen Component
 * 참조: prd/Azrael-PRD-Phase0.md §2 로그인 및 인증
 * 참조: prd/Azrael-PRD-Design.md §7.1 로그인 화면
 */

import { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import './LoginScreen.css';

interface LoginScreenProps {
  onLogin: (email: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  // 개발 모드: 자동 로그인
  useEffect(() => {
    const devMode = import.meta.env.VITE_DEV_MODE === 'true';
    if (devMode) {
      const devEmail = import.meta.env.VITE_DEV_EMAIL || 'dev@azrael.local';
      console.log('🔧 개발 모드: 자동 로그인 -', devEmail);
      setTimeout(() => onLogin(devEmail), 500); // 0.5초 딜레이 (로그인 화면 확인용)
    }
  }, [onLogin]);

  const handleLogin = () => {
    // 개발 단계: 간단한 이메일 입력 검증
    // TODO: 실제 Gmail OAuth 구현 필요
    if (!email) {
      setError('이메일을 입력해주세요.');
      return;
    }

    // 개발 모드: 화이트리스트 검증 건너뛰기
    const devMode = import.meta.env.VITE_DEV_MODE === 'true';
    if (devMode) {
      console.log('🔧 개발 모드: 화이트리스트 검증 건너뛰기');
      onLogin(email);
      return;
    }

    // 화이트리스트 검증 (프로덕션)
    const allowedUsers = import.meta.env.VITE_ALLOWED_USERS?.split(',') || [];
    if (!allowedUsers.includes(email)) {
      setError('접근 권한이 없습니다. 관리자에게 문의하세요.');
      return;
    }

    onLogin(email);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* 고양이 일러스트 */}
        <div className="cat-logo">
          🐱
        </div>

        {/* 로고 */}
        <h1 className="login-title">Azrael</h1>
        <p className="login-subtitle">L10n 일정 관리 도구</p>

        {/* 로그인 폼 (개발용 - 실제로는 Gmail OAuth) */}
        <div className="login-form">
          <Input
            type="email"
            placeholder="이메일을 입력하세요"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          />

          {error && <p className="login-error">{error}</p>}

          <Button onClick={handleLogin} style={{ width: '100%', marginTop: '1rem' }}>
            🔐 로그인
          </Button>
        </div>

        <p className="login-note">회사 계정만 접근 가능합니다.</p>
      </div>
    </div>
  );
}
