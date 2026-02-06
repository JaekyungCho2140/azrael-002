# Azrael 빠른 시작 가이드

**최종 업데이트**: 2026-02-06 (Phase 2 + 코드 품질 개선)
**배포**: https://azrael-002.vercel.app
**소요 시간**: 5분

---

## 사전 준비 완료 상태

### Supabase
- 마이그레이션 9개 실행 완료
- Edge Functions (jira-create, jira-update, jira-check) 배포 완료
- jira_assignees 데이터 (5명) 저장 완료

### 프론트엔드
- Vercel 배포 완료 (커밋: 695223d)

**모든 기능 즉시 사용 가능!**

---

## 즉시 시작

### 1. 라이브 환경 접속 (1분)

https://azrael-002.vercel.app

**로그인**: L10n팀 Google 계정
- jkcho@wemade.com
- mine@wemade.com
- srpark@wemade.com
- garden0130@wemade.com
- hkkim@wemade.com

### 2. JIRA 연동 설정 (2분)

1. **설정** → **JIRA 연동** 탭
2. **JIRA API Token 생성**:
   - https://id.atlassian.com/manage-profile/security/api-tokens
   - "Create API token" → Label: "Azrael" → 복사
3. Azrael에 Token 붙여넣기
4. **[연동 테스트]** 클릭
5. "JIRA 연동 성공!" 확인

### 3. 프로젝트 JIRA 키 설정 (1분)

1. **설정** → **프로젝트 관리**
2. 프로젝트 선택 (예: M4/GL) → **[편집]**
3. **JIRA 프로젝트 키** 입력 (예: L10NM4)
4. **[저장]**

### 4. 일정 계산 및 JIRA 생성 (1분)

1. **메인 화면** 이동
2. 프로젝트: **M4/GL** 선택
3. 업데이트일: **2026-02-10** 입력
4. **[계산]** 클릭 → 테이블 3개 표시
5. **[JIRA 생성]** 클릭 → 미리보기 확인
6. **[생성]** 클릭 → 3-5초 대기
7. "JIRA 일감이 생성되었습니다!"

---

## Phase 2 기능 사용

### 이메일 생성 및 복사

1. 일정 계산이 완료된 상태에서 **"이메일 복사"** 버튼 클릭
2. 이메일 생성 모달에서:
   - **테이블 선택**: Table 1 / Table 2 / Table 3
   - **템플릿 선택**: 기본 제공 또는 사용자 정의 템플릿
3. 미리보기 확인 후 **"클립보드 복사"** 클릭
4. 이메일 클라이언트 (Outlook, Gmail)에서 Ctrl+V 붙여넣기

### 이메일 템플릿 관리

1. **설정** → **이메일 템플릿** 탭
2. 프로젝트 선택 후 **"+ 새 템플릿"** 클릭
3. 리치 텍스트 에디터로 이메일 본문 작성
4. 변수 사용: `{{updateDate}}`, `{{table}}`, `{{disclaimer}}` 등
5. 조건부 블록: `{{#if showIosReviewDate}}...{{/if}}`

### 유료화 상품 협의 일정

1. **설정** → **프로젝트 관리** → 프로젝트 **[편집]**
2. **"유료화 상품 협의 일정 표시"** 체크
3. **Offset** 값 입력 (영업일 수)
4. **[저장]** 후 재계산
5. 날짜 요약 섹션에 유료화 상품 협의 일정 표시
6. Disclaimer에 `{paidProductDate}` 변수 사용 가능

### 부가 정보 설정 (설정 > 업무 단계)

1. **설정** → **업무 단계** 탭
2. "REGULAR" **[편집]** 클릭
3. **입력 필드**:
   - **설명**: "정기 업데이트 번역 작업"
   - **JIRA 설명**: "Regular update translation task"
   - **JIRA 담당자**: 드롭다운에서 선택 (조재경, 김민혜 등)
4. **[저장]**

### 하위 일감 JIRA 담당자 설정

1. **하위 일감 템플릿** 아코디언 펼치기
2. "번역" 하위 일감:
   - **JIRA 설명**: "Translation review"
   - **JIRA 담당자**: 김민혜
3. **[저장]**

### 계산 및 확인

1. 메인 화면 → 계산
2. T2/T3 테이블 확인:
   - JIRA 담당자 열에 **"조재경"**, **"김민혜"** 등 이름 표시
   - 하위 일감도 담당자 표시

---

## 이미지 복사

### T1 테이블
- **복사 범위**: 모든 열 (#, 배치, 마감, 테이블 전달, 설명, 담당자)

### T2/T3 테이블
- **복사 범위**: #, 배치, HO, HB, 설명만
- **제외**: JIRA 설명, JIRA 담당자

---

## 설명란 서식 태그

T1 테이블 설명란과 Disclaimer에서 아래 서식 태그를 사용할 수 있습니다:

| 태그 | 효과 | 예시 |
|------|------|------|
| `<b>텍스트</b>` | **굵게** | `<b>중요</b>` |
| `<r>텍스트</r>` | 빨간색 | `<r>긴급</r>` |
| `<g>텍스트</g>` | 초록색 | `<g>완료</g>` |
| `<bl>텍스트</bl>` | 파란색 | `<bl>참고</bl>` |
| `<u>텍스트</u>` | 밑줄 | `<u>주의</u>` |

---

## 개발 환경 (로컬)

### 1. Repository 클론

```bash
git clone https://github.com/JaekyungCho2140/azrael-002.git
cd azrael-002
npm install
```

### 2. 개발 서버

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 3. 테스트

```bash
npm test           # 단위 테스트 (110개)
npm run typecheck  # TypeScript 타입 체크
npm run build      # 프로덕션 빌드
```

### 4. Edge Functions 로컬 테스트 (선택)

```bash
supabase functions serve jira-create
```

---

## 배포 정보

**프로덕션**: https://azrael-002.vercel.app
**Git**: https://github.com/JaekyungCho2140/azrael-002

**최신 버전**:
- 프론트엔드: 695223d (2026-02-06)
- Edge Functions: jira-create, jira-update, jira-check
- DB: 9개 마이그레이션 완료

---

## 완료 체크리스트

### 사용자
- [ ] 라이브 환경 접속
- [ ] JIRA API Token 설정
- [ ] 프로젝트 JIRA 키 설정
- [ ] 일정 계산 및 JIRA 생성 테스트
- [ ] 이메일 생성 및 복사 테스트

### 개발자
- [ ] Git 클론 및 의존성 설치
- [ ] 환경 변수 설정
- [ ] 개발 서버 실행 (포트 3000)
- [ ] Supabase 마이그레이션 확인 (9개)
- [ ] 단위 테스트 통과 확인 (110/110)

---

**모든 기능 사용 가능!**
