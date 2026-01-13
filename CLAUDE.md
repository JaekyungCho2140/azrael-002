# Azrael - L10n 일정 관리 도구

## 스택
React 18 + TypeScript + Vite | LocalStorage 전용 (서버 없음)
Frappe Gantt, Event Calendar, html2canvas

## 명령어
```bash
npm dev        # 개발 서버
npm build      # 프로덕션 빌드  
npm test       # Vitest
npm typecheck  # tsc --noEmit
```

## 아키텍처
```
src/
├── components/   # UI 컴포넌트
├── hooks/        # useLocalStorage, useProjects
├── lib/          # 순수 함수 (businessDays, storage)
└── types/        # PRD Shared.md §2 인터페이스
```

## 핵심 규칙
- 개발 로드맵인 plan.md 파일을 읽고, 로드맵에 따라 진행 상황을 표시하며 작업 진행
- lib/ 함수는 순수 함수로 작성 (LocalStorage 직접 접근 금지)
- Date 직렬화: JSON.parse 후 Date 필드 수동 복원 필수
- "마감" = startDateTime (종료 아님!) ← PRD 용어 주의
- 구현은 plan.md 파일의 순서에 따라, 작업 완료 후에는 잊지 말고 체크 표시
- 정보 수집 후 → Serena의 think_about_collected_information 호출
- 코드 작성 전 → Serena의 think_about_task_adherence 호출
- 작업 완료 시 → Serena의 think_about_whether_you_are_done 호출

## PRD 참조 (Source of Truth)
- 데이터 구조: `Azrael-PRD-Shared.md` §2
- 계산 로직: `Azrael-PRD-Shared.md` §3
- UI 명세: `Azrael-PRD-Phase0.md`
- 디자인: 'Azrael-PRD-Design.md'

## 테스트
- Vitest + React Testing Library
- Playwright MCP를 활용해 최대한 자동 테스트
- LocalStorage는 jsdom mock으로 자동화
- OAuth, 이미지 복사는 수동 검증 필요