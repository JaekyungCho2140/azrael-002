# Azrael PRD - Phase 3: 슬랙 연동 (개요)

**작성일**: 2026-01-09
**버전**: 0.1 (개요)
**참조**: [Azrael-PRD-Master.md](./Azrael-PRD-Master.md) | [Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md) | [Azrael-PRD-Phase0.md](./Azrael-PRD-Phase0.md)

---

## 📋 문서 상태

**현재 상태**: 개요만 작성 (Phase 0-2 완료 후 상세 설계 예정)
**상세 설계 시점**: Phase 0-2 사용자 피드백 반영 후

---

## 1. Phase 3 목적

Phase 0에서 계산된 일정 테이블을 기반으로 **슬랙 채널에 메시지 및 리플라이를 자동 발신**합니다.

**주요 가치**:
- 팀 내부 일정 공유를 슬랙으로 자동화
- 업데이트일별 스레드로 체계적 관리
- 리마인더 기능으로 마감일 알림

---

## 2. 기능 개요

### 2.1. 슬랙 메시지 발신

**입력**: 테이블 1 (일정표)
**출력**: 슬랙 채널 메시지 + 리플라이

**메시지 구조**:
```
📅 [26-02-10 업데이트 일정]

헤즈업: 01/28(화)
iOS 심사일: 02/03(월)

[일정 요약]
1. 정기: 01/10(금) ~ 01/15(수)
2. 1차: 01/20(월) ~ 01/25(토)
3. 2차: 02/01(일) ~ 02/05(목)

※ Disclaimer: {내용}

🔗 자세히 보기: [Azrael 링크]
```

**리플라이**:
- 각 업무 단계별 상세 정보를 스레드에 리플라이
- 마감일 D-3, D-1 자동 리마인더 (선택)

### 2.2. 슬랙 채널 선택

**설정**: 프로젝트별 기본 슬랙 채널 설정
**예시**:
- M4/GL → `#l10n-mir4`
- NC/GL → `#l10n-nightcrows`
- 월말정산 → `#l10n-general`

### 2.3. 슬랙 인증

**방법**: Slack App + OAuth
**권한**:
- `chat:write` (메시지 발신)
- `chat:write.public` (공개 채널 발신)

**설정**:
- Slack App 생성 (회사 Workspace)
- Bot Token 발급 → `.env` 또는 설정 화면에 저장

### 2.4. UI 플로우

```
[테이블 1]
  ↓
[슬랙 발신] 버튼
  ↓
[슬랙 설정 확인] (최초 1회)
  ├─ Bot Token 입력
  └─ 채널 선택
  ↓
[메시지 미리보기]
  ├─ 채널: #l10n-mir4
  ├─ 메시지 내용
  └─ 리플라이 미리보기
  ↓
[발신] 또는 [취소]
  ↓
Slack API 호출 → 메시지 발신
  ↓
[성공] → 슬랙 메시지 링크 표시
```

---

## 3. 기술 스택 (예상)

| 기술 | 용도 | 비고 |
|------|------|------|
| Slack Web API | 메시지 발신 | https://api.slack.com/web |
| Slack Bolt SDK | Slack App 개발 (선택) | https://slack.dev/bolt-js/ |
| Axios 또는 Fetch | HTTP 클라이언트 | Slack API 호출 |

---

## 4. 미결정 사항 (Phase 0-2 완료 후 결정)

| 항목 | 옵션 | 결정 시점 |
|------|------|----------|
| 메시지 형식 | Block Kit vs Markdown | Phase 0 피드백 후 |
| 리플라이 자동 생성 | 업무별 리플라이 vs 요약만 | Phase 0 피드백 후 |
| 리마인더 기능 | D-3, D-1 자동 알림 vs 수동 | Phase 0 피드백 후 |
| 멘션 기능 | 담당자 자동 멘션 여부 | Phase 0 피드백 후 |
| 메시지 업데이트 | 일정 변경 시 기존 메시지 수정 vs 신규 발신 | Phase 0 피드백 후 |

---

## 5. 예상 사용자 스토리

**스토리 1**: 슬랙 메시지 자동 발신
- **As a** L10n 팀원
- **I want to** 계산된 일정을 슬랙 채널에 자동으로 공유하고 싶다
- **So that** 팀원들이 슬랙에서 바로 일정을 확인할 수 있다

**스토리 2**: 마감일 리마인더
- **As a** L10n 팀장
- **I want to** 마감일 3일 전과 1일 전에 자동 리마인더를 받고 싶다
- **So that** 중요한 마감을 놓치지 않을 수 있다

---

## 6. 성공 지표 (예상)

- [ ] 슬랙 메시지 발신 시간 95% 단축 (수동 5분 → 자동 15초)
- [ ] 팀원 슬랙 확인율 100% (이메일 대비 높은 확인율)
- [ ] 리마인더로 인한 마감 지연 50% 감소

---

## 7. 슬랙 메시지 예시 (Block Kit)

```json
{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "📅 26-02-10 업데이트 일정"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*헤즈업:*\n01/28(화)"
        },
        {
          "type": "mrkdwn",
          "text": "*iOS 심사일:*\n02/03(월)"
        }
      ]
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*일정 요약*\n1. 정기: 01/10(금) ~ 01/15(수)\n2. 1차: 01/20(월) ~ 01/25(토)\n3. 2차: 02/01(일) ~ 02/05(목)"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "※ Disclaimer: 긴급 변경 시 사전 공지 필요"
        }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "🔗 Azrael에서 자세히 보기"
          },
          "url": "https://azrael.company.com/..." ← Q8: Phase 0 완료 후 배포 URL 확정
        }
      ]
    }
  ]
}
```

---

## 8. 다음 단계

1. **Phase 0-2 완료 및 사용자 피드백 수집**
2. **슬랙 사용 패턴 분석**: 현재 L10n팀의 슬랙 채널 구조 파악
3. **Slack App 설계**: Bot 생성 및 권한 설정
4. **메시지 템플릿 설계**: Block Kit 또는 Markdown 템플릿 제작
5. **Phase 3 상세 PRD 작성**

---

## 9. 참조 문서

- **Master**: [Azrael-PRD-Master.md](./Azrael-PRD-Master.md)
- **Shared**: [Azrael-PRD-Shared.md](./Azrael-PRD-Shared.md)
- **Phase 0**: [Azrael-PRD-Phase0.md](./Azrael-PRD-Phase0.md)
- **Phase 1**: [Azrael-PRD-Phase1.md](./Azrael-PRD-Phase1.md)
- **Phase 2**: [Azrael-PRD-Phase2.md](./Azrael-PRD-Phase2.md)

---

**문서 종료**
