# JIRA Subtask issuetype 형식 확인

**목적**: 수동 생성된 Subtask의 issuetype 구조 확인

---

## 브라우저 Console에서 실행

1. https://azrael-002.vercel.app 접속 (로그인)
2. **F12** → **Console**
3. 아래 코드 실행:

```javascript
(async () => {
  const jiraConfig = JSON.parse(localStorage.getItem('azrael:jiraConfig'));
  const issueKeys = ['L10NM4-2162', 'L10NM4-2163', 'L10NM4-2164', 'L10NM4-2165'];

  console.log('=== Checking Subtask issuetype format ===\n');

  for (const key of issueKeys) {
    const response = await fetch(
      'https://vgoqkyqqkieogrtnmsva.supabase.co/functions/v1/jira-get-issue',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnb3FreXFxa2llb2dydG5tc3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3NTQ0NDUsImV4cCI6MjA1MjMzMDQ0NX0.TvPxERKGzLEVtpZvr1iUrgpMNx53DpqjdslRZWLRcJM',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          issueKey: key,
          email: 'jkcho@wemade.com',
          apiToken: jiraConfig.apiToken
        })
      }
    );

    const data = await response.json();

    console.log(`${key}:`);
    console.log(`  Summary: ${data.fields?.summary}`);
    console.log(`  IssueType ID: ${data.fields?.issuetype?.id}`);
    console.log(`  IssueType Name: ${data.fields?.issuetype?.name}`);
    console.log(`  IssueType Subtask: ${data.fields?.issuetype?.subtask}`);
    console.log('');
  }

  console.log('완료!');
})();
```

---

## 예상 출력

```
=== Checking Subtask issuetype format ===

L10NM4-2162:
  Summary: Subtask 번역
  IssueType ID: 10634
  IssueType Name: 번역
  IssueType Subtask: true

L10NM4-2163:
  Summary: Subtask 검수
  IssueType ID: 10635
  IssueType Name: 검수
  IssueType Subtask: true

L10NM4-2164:
  Summary: Subtask Side Project(하위)
  IssueType ID: 10640
  IssueType Name: Side Project(하위)
  IssueType Subtask: true

L10NM4-2165:
  Summary: Subtask PM(하위)
  IssueType ID: 10638
  IssueType Name: PM(하위)
  IssueType Subtask: true
```

---

## 확인 사항

1. **ID가 일치하는가?**
   - 번역: 10634 ✅
   - 검수: 10635 ✅
   - PM(하위): 10638 ✅

2. **name 형식은?**
   - 괄호 포함 여부
   - 공백 여부
   - 특수 문자

3. **id vs name**
   - 둘 다 반환되는가?
   - API 호출 시 어느 것을 사용해야 하는가?

---

**결과를 알려주세요!**
