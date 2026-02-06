import { useState, useEffect } from 'react';
import { Button } from '../Button';

interface SettingsJiraTabProps {
  currentUserEmail: string;
}

export function SettingsJiraTab({ currentUserEmail }: SettingsJiraTabProps) {
  const [jiraApiToken, setJiraApiToken] = useState('');
  const [jiraAccountId, setJiraAccountId] = useState('');
  const [showJiraToken, setShowJiraToken] = useState(false);
  const [jiraConnectionStatus, setJiraConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [jiraErrorMessage, setJiraErrorMessage] = useState('');

  // JIRA 설정 로드
  useEffect(() => {
    const savedJiraConfig = localStorage.getItem('azrael:jiraConfig');
    if (savedJiraConfig) {
      try {
        const config = JSON.parse(savedJiraConfig);
        setJiraApiToken(config.apiToken || '');
        setJiraAccountId(config.accountId || '');
        if (config.accountId) {
          setJiraConnectionStatus('success');
        }
      } catch (err) {
        console.error('Failed to load JIRA config:', err);
      }
    }
  }, []);

  // JIRA 연동 테스트 (Phase 1) - Edge Function 사용 (CORS 우회)
  const handleTestJiraConnection = async () => {
    if (!jiraApiToken.trim()) {
      alert('JIRA API Token을 입력해주세요.');
      return;
    }

    setJiraConnectionStatus('testing');
    setJiraErrorMessage('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/jira-test-connection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: currentUserEmail,
          apiToken: jiraApiToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Edge Function 호출 실패 (${response.status}): ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'JIRA 연동 실패');
      }

      const accountId = result.accountId;

      if (!accountId) {
        throw new Error('Account ID를 찾을 수 없습니다.');
      }

      localStorage.setItem('azrael:jiraConfig', JSON.stringify({
        apiToken: jiraApiToken,
        accountId: accountId,
      }));

      setJiraAccountId(accountId);
      setJiraConnectionStatus('success');
      alert(`JIRA 연동 성공!\n계정: ${result.email || currentUserEmail}\nAccount ID: ${accountId}`);
    } catch (err: any) {
      setJiraConnectionStatus('error');
      setJiraErrorMessage(err.message || 'JIRA 연동 실패');
      alert(`JIRA 연동 실패: ${err.message}`);
    }
  };

  const handleSaveJiraConfig = () => {
    if (!jiraAccountId) {
      alert('먼저 [연동 테스트]를 실행하여 Account ID를 가져와주세요.');
      return;
    }

    localStorage.setItem('azrael:jiraConfig', JSON.stringify({
      apiToken: jiraApiToken,
      accountId: jiraAccountId,
    }));

    alert('JIRA 설정이 저장되었습니다.');
  };

  return (
    <div>
      <h3>JIRA 연동 설정</h3>

      <div className="form-group" style={{ marginTop: '1.5rem', maxWidth: '500px' }}>
        <label className="form-label">JIRA API Token</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type={showJiraToken ? 'text' : 'password'}
            className="form-input"
            value={jiraApiToken}
            onChange={(e) => setJiraApiToken(e.target.value)}
            placeholder="JIRA API Token 입력"
            autoComplete="off"
            style={{ flex: 1 }}
          />
          <Button
            variant="ghost"
            onClick={() => setShowJiraToken(!showJiraToken)}
            style={{ padding: '0 1rem' }}
          >
            {showJiraToken ? '👁️ 숨김' : '👁️ 표시'}
          </Button>
        </div>
        <small style={{ color: 'var(--azrael-gray-500)', fontSize: 'var(--text-xs)', display: 'block', marginTop: '0.5rem' }}>
          JIRA → 프로필 → 보안 → API 토큰에서 생성
        </small>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Button
          onClick={handleTestJiraConnection}
          disabled={jiraConnectionStatus === 'testing'}
        >
          {jiraConnectionStatus === 'testing' ? '테스트 중...' : '🔗 연동 테스트'}
        </Button>
        <Button
          variant="secondary"
          onClick={handleSaveJiraConfig}
          disabled={!jiraAccountId}
        >
          💾 저장
        </Button>
      </div>

      {jiraConnectionStatus === 'success' && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: 'var(--azrael-success-light)',
          border: '1px solid var(--azrael-success)',
          borderRadius: '8px',
          color: 'var(--azrael-success-dark)'
        }}>
          <div style={{ fontWeight: 'var(--weight-semibold)', marginBottom: '0.5rem' }}>
            ✅ JIRA 연동 성공!
          </div>
          <div style={{ fontSize: 'var(--text-sm)' }}>
            <div>계정: {currentUserEmail}</div>
            <div>Account ID: {jiraAccountId}</div>
          </div>
        </div>
      )}

      {jiraConnectionStatus === 'error' && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: 'var(--azrael-error-light)',
          border: '1px solid var(--azrael-error)',
          borderRadius: '8px',
          color: 'var(--azrael-error-dark)'
        }}>
          <div style={{ fontWeight: 'var(--weight-semibold)', marginBottom: '0.5rem' }}>
            ❌ JIRA 연동 실패
          </div>
          <div style={{ fontSize: 'var(--text-sm)' }}>
            {jiraErrorMessage}
          </div>
        </div>
      )}
    </div>
  );
}
