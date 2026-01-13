/**
 * App Component
 * 전체 애플리케이션 진입점
 */

import { useEffect, useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { MainScreen } from './components/MainScreen';
import { ResolutionWarning } from './components/ResolutionWarning';
import { Toast } from './components/Toast';
import { initializeDefaultData, getUserState, saveUserState } from './lib/storage';
import { useProjects } from './hooks/useProjects';
import { useToast } from './hooks/useToast';
import { UserState } from './types';

type AppScreen = 'login' | 'onboarding' | 'main';

function App() {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [userState, setUserState] = useState<UserState | null>(null);
  const { projects, templates, addProject, updateProject, deleteProject, setTemplates } = useProjects();
  const { toasts, removeToast } = useToast();

  // 초기 데이터 생성
  useEffect(() => {
    initializeDefaultData();
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
        lastProjectId: projects[0]?.id || '',
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
  const handleLogout = () => {
    setUserState(null);
    setScreen('login');
  };

  // 화면 렌더링
  let content;

  if (screen === 'login') {
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
          templates={templates}
          onProjectChange={handleProjectChange}
          onAddProject={addProject}
          onUpdateProject={updateProject}
          onDeleteProject={deleteProject}
          onUpdateTemplates={setTemplates}
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
