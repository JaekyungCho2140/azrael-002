# JIRA 이슈 타입 ID 조회 가이드

**목적**: L10NM4 프로젝트의 정확한 이슈 타입 ID 확인

---

## 방법 1: 브라우저 Console에서 조회 (권장, 1분)

1. https://azrael-002.vercel.app 접속 (로그인 상태)
2. **F12** → **Console** 탭
3. 아래 코드 복사 & 붙여넣기 → Enter:

```javascript
(async () => {
  const jiraConfig = JSON.parse(localStorage.getItem('azrael:jiraConfig'));

  const response = await fetch(
    'https://vgoqkyqqkieogrtnmsva.supabase.co/functions/v1/jira-get-issue-types',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnb3FreXFxa2llb2dydG5tc3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3NTQ0NDUsImV4cCI6MjA1MjMzMDQ0NX0.TvPxERKGzLEVtpZvr1iUrgpMNx53DpqjdslRZWLRcJM',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectKey: 'L10NM4',
        email: 'jkcho@wemade.com',
        apiToken: jiraConfig.apiToken
      })
    }
  );

  const data = await response.json();
  console.log('=== L10NM4 Issue Types ===');

  if (data.projects && data.projects[0]) {
    const project = data.projects[0];
    console.log('Project:', project.name);
    console.log('\nIssue Types:');

    project.issuetypes.forEach(type => {
      console.log(`  - ${type.name}: ID ${type.id}`);
      if (type.subtask) {
        console.log(`    (Subtask)`);
      }
    });
  } else {
    console.error('Error:', data);
  }

  return data;
})();
```

4. 출력 결과에서 다음을 찾기:
   - **Epic**: ID
   - **PM(표준)**: ID
   - **PM(하위)**: ID
   - **번역**: ID
   - **검수**: ID

---

## 예상 출력:

```
=== L10NM4 Issue Types ===
Project: L10n_M4
Issue Types:
  - Epic: ID 10000
  - PM(표준): ID 10001
  - PM(하위): ID 10002
    (Subtask)
  - 번역: ID 10003
    (Subtask)
  - 검수: ID 10004
    (Subtask)
```

---

## 다음 단계

ID를 확인한 후:
1. Edge Function을 수정하여 `issuetype: { id: 'XXX' }` 사용
2. 또는 설정 기능 추가 (이슈 타입 ID 매핑)

---

**Sources**:
- [JIRA REST API examples](https://developer.atlassian.com/server/jira/platform/jira-rest-api-examples/)
- [The Jira Cloud platform REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/)
