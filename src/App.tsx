/**
 * App Component
 * 전체 애플리케이션 진입점
 *
 * Phase 3.5: Supabase Auth 세션 관리 추가
 */

import { useEffect, useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { MainScreen } from './components/MainScreen';
import { ResolutionWarning } from './components/ResolutionWarning';
import { Toast } from './components/Toast';
import { initializeDefaultData, getUserState, saveUserState } from './lib/storage';
import { supabase } from './lib/supabase';
import { useProjects, useTemplates } from './hooks/useSupabase';
import { useToast } from './hooks/useToast';
import { UserState } from './types';
import type { Session } from '@supabase/supabase-js';

type AppScreen = 'login' | 'onboarding' | 'main';

function App() {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [userState, setUserState] = useState<UserState | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Supabase 데이터 조회 (세션이 있을 때만 실행!)
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useProjects(!!session);
  const { data: templates, isLoading: templatesLoading, error: templatesError } = useTemplates(!!session);

  const { toasts, removeToast } = useToast();

  // 초기 데이터 생성
  useEffect(() => {
    initializeDefaultData();
  }, []);

  // Supabase 세션 상태 관리
  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoadingSession(false);

      // 세션이 있으면 자동 로그인 처리
      if (session?.user?.email) {
        handleLogin(session.user.email);
      }
    });

    // 세션 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);

        // 로그아웃 이벤트 처리
        if (_event === 'SIGNED_OUT') {
          setUserState(null);
          setScreen('login');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // 로그인 처리
  const handleLogin = (email: string) => {
    const state = getUserState();

    if (state && state.hasCompletedOnboarding) {
      // 기존 사용자 - 메인 화면으로
      setUserState(state);
      setScreen('main');
    } else {
      // 신규 사용자 - 온보딩으로
      const newState: UserState = {
        email,
        lastProjectId: projects?.[0]?.id || '',
        hasCompletedOnboarding: false
      };
      setUserState(newState);
      saveUserState(newState);
      setScreen('onboarding');
    }
  };

  // 온보딩 완료
  const handleOnboardingComplete = (selectedProjectId: string) => {
    if (!userState) return;

    const updatedState: UserState = {
      ...userState,
      lastProjectId: selectedProjectId,
      hasCompletedOnboarding: true
    };
    setUserState(updatedState);
    saveUserState(updatedState);
    setScreen('main');
  };

  // 프로젝트 변경
  const handleProjectChange = (projectId: string) => {
    if (!userState) return;

    const updatedState: UserState = {
      ...userState,
      lastProjectId: projectId
    };
    setUserState(updatedState);
    saveUserState(updatedState);
  };

  // 로그아웃
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // 상태는 onAuthStateChange에서 자동 처리됨
    } catch (err: any) {
      console.error('❌ 로그아웃 실패:', err);
      alert('로그아웃에 실패했습니다.');
    }
  };

  // 세션 또는 데이터 로딩 중
  if (isLoadingSession || projectsLoading || templatesLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <p>데이터를 불러오는 중...</p>
      </div>
    );
  }

  // 데이터 로드 오류
  if (projectsError || templatesError) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h2>⚠️ 데이터 로드 실패</h2>
        <p style={{ color: 'var(--azrael-gray-600)' }}>
          {projectsError?.message || templatesError?.message || '알 수 없는 오류가 발생했습니다.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          🔄 새로고침
        </button>
      </div>
    );
  }

  // 로그인되지 않은 상태
  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // 데이터 없음 확인
  if (!projects || projects.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h2>📦 프로젝트 데이터가 없습니다</h2>
        <p style={{ color: 'var(--azrael-gray-600)' }}>
          Supabase에 프로젝트가 없습니다.<br />
          CSV 임포트를 실행해주세요.
        </p>
      </div>
    );
  }

  // 화면 렌더링
  let content;

  if (screen === 'login') {
    // 세션은 있지만 아직 handleLogin이 호출되지 않음
    content = <LoginScreen onLogin={handleLogin} />;
  } else if (screen === 'onboarding') {
    content = (
      <OnboardingScreen
        projects={projects}
        onComplete={handleOnboardingComplete}
      />
    );
  } else {
    const currentProject = projects.find(p => p.id === userState?.lastProjectId);
    if (!currentProject) {
      content = <div>프로젝트를 찾을 수 없습니다.</div>;
    } else {
      content = (
        <MainScreen
          currentProject={currentProject}
          projects={projects}
          templates={templates || []}
          onProjectChange={handleProjectChange}
          onLogout={handleLogout}
        />
      );
    }
  }

  return (
    <>
      <ResolutionWarning />
      {content}

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
}

export default App;
