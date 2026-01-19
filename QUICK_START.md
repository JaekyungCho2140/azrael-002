# Azrael Phase 0.5 & Phase 1 즉시 시작 가이드

**상태**: 🟢 Supabase 배포 완료, 로컬 테스트 가능!
**소요 시간**: 5분

---

## 🚀 즉시 시작 (Edge Functions 환경 변수만 설정하면 모든 기능 사용 가능)

### Step 1: Edge Functions 환경 변수 설정 (2분) 🔴 필수

1. **Supabase Dashboard 접속**:
   https://supabase.com/dashboard/project/vgoqkyqqkieogrtnmsva/functions

2. **Settings/Secrets 클릭**

3. **환경 변수 3개 추가**:
   - Name: `JIRA_URL`
     Value: `https://wemade.atlassian.net`
   
   - Name: `JIRA_CUSTOM_FIELD_START`
     Value: `customfield_10569`
   
   - Name: `JIRA_CUSTOM_FIELD_END`
     Value: `customfield_10570`

4. **저장** (각 변수마다)

---

### Step 2: 개발 서버 시작 (1분)

```bash
cd /Users/jaekyungcho/Repository/azrael-002
npm run dev
```

브라우저 자동 열림: http://localhost:3000

---

### Step 3: JIRA 연동 테스트 (2분)

1. 로그인 (Google OAuth)
2. **설정** 클릭
3. **JIRA 연동** 탭 선택
4. **JIRA API Token 생성**:
   - https://id.atlassian.com/manage-profile/security/api-tokens
   - "Create API token" → Label: "Azrael" → 복사
5. Azrael에 Token 붙여넣기
6. **[연동 테스트]** 클릭
7. ✅ "JIRA 연동 성공!" 메시지 확인

---

## 🎯 사용 가능한 모든 기능

### Phase 0.5 기능 (즉시 사용 가능)

1. **하위 일감 템플릿 설정**:
   - 설정 → 업무 단계 관리
   - REGULAR [편집] → ▶ 하위 일감 템플릿
   - [+ 하위 일감 추가] → 번역, 검수 등 추가
   - 각 하위 일감마다 Offset, 시각, JIRA Summary 템플릿 설정
   - **최대 9개** 하위 일감

2. **테이블 "JIRA 담당자" 컬럼**:
   - 테이블 2/3에 새 컬럼 표시
   - 셀 클릭 → Account ID 입력
   - Enter → 저장

3. **JIRA Summary 템플릿**:
   - 프로젝트 편집 → Epic, 헤즈업 템플릿
   - 업무 단계 편집 → Task, Subtask 템플릿
   - 변수 사용: {date}, {taskName}, {subtaskName}

---

### Phase 1 기능 (환경 변수 설정 후 사용 가능)

4. **JIRA 일감 자동 생성**:
   - 메인 화면 → 업데이트일 입력 → [계산]
   - [📋 JIRA 생성] 클릭
   - 미리보기 확인 (Epic, Tasks, Subtasks)
   - [JIRA 생성] → 자동 생성 (3-5초)
   - JIRA에서 확인

5. **JIRA 일감 자동 업데이트**:
   - 업데이트일 변경 → [계산]
   - [🔄 JIRA 업데이트] 클릭 (Epic 생성 후 활성화)
   - 확인 → 자동 업데이트 (2-3초)
   - 신규 Task도 자동 추가

---

## 📱 테스트 시나리오 (5분)

### 시나리오 1: 하위 일감 템플릿 (2분)

```
설정 → 업무 단계 관리 → M4/GL 선택
→ REGULAR [편집]
→ ▶ 하위 일감 템플릿 (펼침)
→ [+ 하위 일감 추가]
→ 배치명: "번역", Offset: 10/9, 시각: 09:00-12:00
→ [저장]
→ ✅ "저장되었습니다"
```

---

### 시나리오 2: JIRA 생성 (3분)

```
메인 화면
→ 프로젝트: M4/GL
→ 업데이트일: 2026-02-10
→ [계산]
→ ✅ 테이블 3개 표시
→ [📋 JIRA 생성]
→ ✅ 미리보기: Epic + Tasks + Subtasks
→ [JIRA 생성]
→ ⏳ 3-5초 대기
→ ✅ "JIRA 일감이 생성되었습니다! Epic: M4L10N-XX"
→ JIRA 확인: https://wemade.atlassian.net/browse/M4L10N-XX
```

---

## 🎊 완료!

**배포 완료 항목**:
- ✅ Supabase 마이그레이션 (7개 적용)
- ✅ Edge Functions 배포 (jira-create, jira-update)
- ✅ Git 커밋 (902e4b6)

**남은 작업**:
- ⏳ Edge Functions 환경 변수 설정 (2분) 🔴
- ⏳ Git 푸시 (수동, 1분)
- ⏳ Vercel 배포 (자동 or 수동)

**즉시 사용 가능**:
- Phase 0.5 모든 기능 ✅
- Phase 1 기능 (환경 변수 설정 후) ⏳

---

**다음 단계**: Edge Functions 환경 변수 3개 설정 → 모든 기능 사용 가능!
