# Azrael Phase 0.5 & Phase 1 배포 가이드

**대상**: Azrael 관리자 (jkcho@wemade.com)
**소요 시간**: 25-40분
**난이도**: 중급

---

## 📋 배포 전 체크리스트

- [ ] Supabase 계정 로그인 확인
- [ ] Supabase CLI 설치 확인 (`supabase --version`)
- [ ] JIRA API Token 준비 (https://id.atlassian.com/manage-profile/security/api-tokens)
- [ ] 인터넷 연결 확인

---

## 🚀 배포 단계

### Step 1: Supabase CLI 설치 (최초 1회)

```bash
# Supabase CLI 설치
npm install -g supabase

# 버전 확인
supabase --version
```

**예상 시간**: 2분

---

### Step 2: Supabase 프로젝트 링크

```bash
# 프로젝트 디렉토리로 이동
cd /Users/jaekyungcho/Repository/azrael-002

# Supabase 프로젝트 링크
supabase link --project-ref vgoqkyqqkieogrtnmsva
```

**프롬프트 응답**:
- Password for postgres database: [Supabase 프로젝트 DB 비밀번호 입력]

**예상 시간**: 1분

---

### Step 3: 마이그레이션 배포

```bash
# 마이그레이션 파일 확인
ls supabase/migrations/

# 출력 예상:
# 001_initial_schema.sql
# 002_phase0_5_and_phase1_jira_integration.sql

# 마이그레이션 배포
supabase db push
```

**성공 메시지**:
```
Applying migration 002_phase0_5_and_phase1_jira_integration.sql...
Finished supabase db push.
```

**검증**:
```bash
# Supabase Dashboard → Database → Tables 확인
# - jira_epic_mappings (신규)
# - jira_task_mappings (신규)
# - work_stages.jira_summary_template (신규 컬럼)
```

**예상 시간**: 2분

**오류 발생 시**:
- "Cannot find project ref": Step 2 다시 실행
- "Migration already applied": 정상 (이미 배포됨)

---

### Step 4: Edge Functions 환경 변수 설정

**Supabase Dashboard 접속**:
1. https://supabase.com/dashboard/project/vgoqkyqqkieogrtnmsva
2. Edge Functions → Secrets
3. [Add New Secret] 클릭

**환경 변수 추가** (3개):

| Name | Value |
|------|-------|
| JIRA_URL | https://wemade.atlassian.net |
| JIRA_CUSTOM_FIELD_START | customfield_10569 |
| JIRA_CUSTOM_FIELD_END | customfield_10570 |

4. 각 변수마다 [Add Secret] 클릭

**예상 시간**: 2분

---

### Step 5: Edge Functions 배포

```bash
# jira-create 함수 배포
supabase functions deploy jira-create

# jira-update 함수 배포
supabase functions deploy jira-update

# 배포 확인
supabase functions list
```

**성공 메시지**:
```
Deploying Function (project-ref: vgoqkyqqkieogrtnmsva)
  jira-create (deploy-id: xxx)
  jira-update (deploy-id: yyy)
Deployed Functions.
```

**예상 시간**: 3분

**오류 발생 시**:
- "Function not found": 파일 경로 확인
  - `supabase/functions/jira-create/index.ts`
  - `supabase/functions/jira-update/index.ts`

---

## ✅ 배포 검증

### 1. Supabase 테이블 확인

**Supabase Dashboard → Database → Tables**:
- [ ] jira_epic_mappings 테이블 존재
- [ ] jira_task_mappings 테이블 존재
- [ ] work_stages.order 타입이 numeric(5,1)
- [ ] work_stages.jira_summary_template 컬럼 존재
- [ ] projects.jira_project_key 컬럼 존재

### 2. Edge Functions 확인

**Supabase Dashboard → Edge Functions**:
- [ ] jira-create 함수 배포됨 (상태: Active)
- [ ] jira-update 함수 배포됨 (상태: Active)
- [ ] Secrets 3개 설정됨

### 3. 개발 서버 테스트

```bash
# 개발 서버 시작
npm run dev

# 브라우저 열기
# http://localhost:3000
```

**확인 사항**:
- [ ] 로그인 성공
- [ ] 설정 → JIRA 연동 탭 표시
- [ ] 설정 → 업무 단계 편집 → 하위 일감 템플릿 아코디언 표시
- [ ] 테이블 2/3 "JIRA 담당자" 컬럼 표시
- [ ] 메인 화면 [JIRA 생성] / [JIRA 업데이트] 버튼 표시

---

## 🧪 기능 테스트

### Test 1: JIRA 연동 (5분)

1. 설정 → JIRA 연동
2. JIRA API Token 생성:
   - https://id.atlassian.com/manage-profile/security/api-tokens
   - [Create API token]
   - Label: "Azrael"
   - 토큰 복사
3. Azrael에서 API Token 입력
4. [연동 테스트] 클릭
5. ✅ "JIRA 연동 성공!" 메시지 확인
6. Account ID 표시 확인

---

### Test 2: 하위 일감 템플릿 (5분)

1. 설정 → 업무 단계 관리
2. M4/GL 선택
3. REGULAR [편집]
4. ▶ 하위 일감 템플릿 클릭
5. [+ 하위 일감 추가]
6. 배치명: "번역"
7. 시작 Offset: 10, 종료: 9
8. 시각: 09:00 - 12:00
9. 테이블: T2, T3 체크
10. [저장]
11. ✅ "저장되었습니다" 메시지 확인
12. 모달 다시 열어서 하위 일감 확인

---

### Test 3: JIRA 생성 E2E (10분) ⭐ **핵심**

1. 메인 화면
2. 프로젝트: M4/GL
3. 업데이트일: 2026-02-10
4. [계산]
5. ✅ 테이블 3개 표시 확인
6. [📋 JIRA 생성] (활성화됨)
7. ✅ 미리보기 모달 확인:
   - Epic: 260210 업데이트
   - Task: 260210 업데이트 일정 헤즈업
   - Task: 260210 업데이트 REGULAR
   - Sub-task: 260210 업데이트 REGULAR 번역
8. [JIRA 생성]
9. ⏳ 대기 (3-5초)
10. ✅ "JIRA 일감이 생성되었습니다!" 메시지
11. Epic Key 복사 (예: M4L10N-45)
12. JIRA 확인: https://wemade.atlassian.net/browse/M4L10N-45
13. ✅ Epic, Tasks, Subtasks 생성 확인

---

### Test 4: JIRA 업데이트 (5분)

1. 업데이트일 변경: 2026-02-15
2. [계산]
3. [🔄 JIRA 업데이트] (활성화됨)
4. ✅ "업데이트: X개, 신규 생성: Y개" 확인
5. [확인]
6. ⏳ 대기 (2-3초)
7. ✅ "JIRA 일감이 업데이트되었습니다!" 메시지
8. JIRA 확인: Epic 및 Tasks 날짜 변경됨

---

## ⚠️ 문제 해결

### 문제 1: Supabase 링크 실패
**에러**: "Cannot find project ref"
**해결**:
```bash
supabase logout
supabase login
supabase link --project-ref vgoqkyqqkieogrtnmsva
```

---

### 문제 2: 마이그레이션 실패
**에러**: "relation already exists"
**원인**: 테이블이 이미 존재
**해결**: 정상 (이미 배포됨), 무시하고 진행

---

### 문제 3: Edge Function 배포 실패
**에러**: "No such file or directory"
**해결**:
```bash
# 파일 존재 확인
ls supabase/functions/jira-create/index.ts
ls supabase/functions/jira-update/index.ts

# 없으면: Git에서 다시 pull
git pull origin main
```

---

### 문제 4: JIRA 생성 실패
**에러**: "JIRA API 호출 실패 (401)"
**원인**: API Token 만료 또는 잘못됨
**해결**:
1. 설정 → JIRA 연동
2. 새 API Token 생성
3. [연동 테스트] 다시 실행

---

### 문제 5: "다른 사용자가 생성 중"
**원인**: 동시 생성 방지 (정상 동작)
**해결**: 10초 후 다시 시도

---

## 📞 지원

**문제 발생 시**:
1. 에러 메시지 복사
2. 브라우저 Console 확인 (F12)
3. Supabase Dashboard → Edge Functions → Logs 확인
4. GitHub Issue 또는 Claude Code에 문의

---

**배포 완료 후**: Phase 2 (이메일 생성) 또는 Phase 3 (슬랙 연동) 기획 시작

---

**행운을 빕니다! 🍀**
