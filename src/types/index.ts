/**
 * Azrael TypeScript Type Definitions
 * 참조: prd/Azrael-PRD-Shared.md §2 공통 데이터 구조
 */

/**
 * Project (프로젝트)
 * 참조: Azrael-PRD-Shared.md §2.1
 */
export interface Project {
  id: string;                    // 고유 ID (예: "M4_GL", "NC_GL_1week")
  name: string;                  // 표시 이름 (예: "M4/GL", "NC/GL (1주)")
  headsUpOffset: number;         // 헤즈업 Offset (영업일)
  iosReviewOffset?: number;      // iOS 심사일 Offset (영업일, 선택적)
  showIosReviewDate: boolean;    // iOS 심사일 표시 여부
  templateId: string;            // 업무 단계 템플릿 ID
  disclaimer: string;            // 테이블 하단 Disclaimer 메모 (최대 6줄/600자, HTML)
  jiraProjectKey?: string;       // JIRA 프로젝트 키 (Phase 1, 예: "L10NM4")
  jiraEpicTemplate?: string;     // JIRA Epic Summary 템플릿 (Phase 0.5)
  jiraHeadsupTemplate?: string;  // JIRA 헤즈업 Task Summary 템플릿 (Phase 0.5)
  jiraHeadsupDescription?: string; // JIRA 헤즈업 Task 설명 (ADF 테이블 마크업 지원)
  jiraTaskIssueType?: string;    // JIRA Task 이슈 타입 (Phase 1.5, 기본값: "PM(표준)")
  // isDeletable는 런타임 계산 필드 (저장 안 함)
}

/**
 * WorkTemplate (업무 단계 템플릿)
 * 참조: Azrael-PRD-Shared.md §2.2
 */
export interface WorkTemplate {
  id: string;                    // 템플릿 ID (프로젝트별)
  projectId: string;             // 연결된 프로젝트 ID
  stages: WorkStage[];           // 업무 단계 배열
}

/**
 * WorkStage (업무 단계)
 * 참조: Azrael-PRD-Shared.md §2.2
 * 수정: 마감과 테이블 전달에 각각 다른 Offset 사용
 */
export interface WorkStage {
  id: string;                    // 업무 단계 ID
  name: string;                  // 배치 이름 (예: "정기", "REGULAR", "번역", "검수")
  startOffsetDays: number;       // 마감(시작일시) 역산 영업일
  endOffsetDays: number;         // 테이블 전달(종료일시) 역산 영업일
  startTime: string;             // 기본 시작 시각 (HH:MM, 24시간제)
  endTime: string;               // 기본 종료 시각 (HH:MM, 24시간제)
  order: number;                 // 표시 순서 (DECIMAL 5,1: 1.0, 1.1, 1.2...)
  parentStageId?: string;        // 하위 일감의 경우 부모 Stage ID
  depth: number;                 // 0=부모, 1=자식 (최대 1)
  tableTargets: ('table1' | 'table2' | 'table3')[]; // 표시할 테이블 위치
  jiraSummaryTemplate?: string;  // JIRA Summary 템플릿 (Phase 0.5, 예: "{date} 업데이트 {taskName}")
  jiraSubtaskIssueType?: string; // JIRA Subtask 이슈 타입 (Phase 1.5, 하위 일감만, 기본값: name)
  
  // Phase 1.7: 부가 정보 (모든 업데이트일 공통 적용)
  description: string;           // 모든 테이블 공통 - "설명" 컬럼
  assignee: string;              // T1 전용 - "담당자" 컬럼
  jiraDescription: string;       // T2/T3 전용 - "JIRA 설명" 컬럼
  jiraAssigneeId: string | null; // T2/T3 전용 - JIRA 담당자 Account ID
}

/**
 * ScheduleEntry (일정 엔트리)
 * 참조: Azrael-PRD-Shared.md §2.3
 */
export interface ScheduleEntry {
  id: string;                    // 엔트리 ID
  index: number;                 // 인덱스 (자동 계산)
  stageId: string;               // WorkStage ID
  stageName: string;             // 배치 이름
  startDateTime: Date;           // 계산된 시작일시
  endDateTime: Date;             // 계산된 종료일시
  description: string;           // 모든 테이블 공통 - "설명" 컬럼 (편집 가능)
  assignee?: string;             // 테이블 1 전용 - "담당자" 컬럼 (편집 가능)
  jiraDescription?: string;      // 테이블 2/3 전용 - "JIRA 설명" 컬럼 (편집 가능)
  jiraAssignee?: string;         // 테이블 2/3 전용 - "JIRA 담당자" (Phase 0.5, JIRA Account ID)
  parentId?: string;             // 부모 엔트리 ID (하위 일감)
  children?: ScheduleEntry[];    // 하위 일감 배열
  isManualEdit: boolean;         // 수동 편집 여부 (Phase 0에서는 false)
}

/**
 * CalculationResult (계산 결과)
 * 참조: Azrael-PRD-Shared.md §2.4
 */
export interface CalculationResult {
  projectId: string;             // 프로젝트 ID (타입 정보 포함)
  updateDate: Date;              // 업데이트일
  headsUpDate: Date;             // 계산된 헤즈업 날짜
  iosReviewDate?: Date;          // 계산된 iOS 심사일
  table1Entries: ScheduleEntry[]; // 테이블 1 엔트리
  table2Entries: ScheduleEntry[]; // 테이블 2 (Ext.) 엔트리
  table3Entries: ScheduleEntry[]; // 테이블 3 (Int.) 엔트리
  calculatedAt: Date;            // 계산 시각
}

/**
 * Holiday (공휴일)
 * 참조: Azrael-PRD-Shared.md §2.5
 */
export interface Holiday {
  date: Date;                    // 공휴일 날짜
  name: string;                  // 공휴일 이름 (예: "신정", "설날")
  isManual: boolean;             // 수동 추가 여부 (API vs 수동)
}

/**
 * UserState (사용자 상태)
 * 참조: Azrael-PRD-Shared.md §2.6
 */
export interface UserState {
  email: string;                 // 사용자 이메일
  lastProjectId: string;         // 마지막 사용 프로젝트 ID
  hasCompletedOnboarding: boolean; // 온보딩 완료 여부
  showVisualization?: boolean;   // 간트 차트/캘린더 뷰 표시 여부 (기본값: true)
}

/**
 * JiraConfig (JIRA 연동 설정)
 * Phase 1: LocalStorage에 저장 (개인 데이터)
 */
export interface JiraConfig {
  apiToken: string;              // JIRA API Token (평문 저장)
  accountId: string;             // 현재 사용자 JIRA Account ID (자동 조회)
}

/**
 * JiraAssignee (JIRA 담당자 매핑)
 * Phase 1.7: Supabase 테이블로 관리
 */
export interface JiraAssignee {
  id: string;                    // UUID
  name: string;                  // 한글 이름 (드롭다운 표시용)
  jiraAccountId: string;         // JIRA Account ID (API 호출용)
  orderIndex: number;            // 드롭다운 정렬 순서
  isActive: boolean;             // 활성 상태
}

// ============================================================
// Phase 2: 이메일 생성 타입
// 참조: Azrael-PRD-Phase2.md §4.1, §4.3
// ============================================================

/**
 * 테이블 타입
 * 참조: Azrael-PRD-Phase2.md §2.1 테이블 명칭 표
 */
export type TableType = 'table1' | 'table2' | 'table3';

/**
 * 템플릿 카테고리 (라디오 선택용)
 * 참조: Azrael-PRD-Phase2.md §4.3 EmailTemplateSelector
 */
export type TemplateCategory = 'basic' | 'detailed' | 'custom';

/**
 * EmailTemplate (이메일 템플릿)
 * 참조: Azrael-PRD-Phase2.md §4.1
 * 저장: Supabase email_templates 테이블 (프로젝트별 관리)
 */
export interface EmailTemplate {
  id: string;                    // UUID
  projectId: string;             // 소속 프로젝트 ID
  name: string;                  // 템플릿 이름 (프로젝트 내 UNIQUE, 최대 50자)
  subjectTemplate: string;       // 제목 템플릿 (변수 치환 지원)
  bodyTemplate: string;          // 본문 템플릿 (HTML, 변수/조건부 블록 지원)
  isBuiltIn: boolean;            // 기본 제공 템플릿 여부 (true=삭제 불가)
  createdAt: string;             // ISO 8601 문자열 (Supabase JSON 응답은 항상 string)
  createdBy: string | null;      // 생성자 이메일 ('SYSTEM' 또는 사용자 이메일)
  updatedAt: string;             // ISO 8601 문자열
}

/**
 * 템플릿 변수 컨텍스트
 * 참조: Azrael-PRD-Phase2.md §2.5 파서 구현
 */
export type TemplateContext = Record<string, string | boolean | null | undefined>;

/**
 * EmailGenerationRequest (이메일 생성 요청)
 * 참조: Azrael-PRD-Phase2.md §4.1
 */
export interface EmailGenerationRequest {
  projectId: string;
  updateDate: Date;
  tableType: TableType;
  templateId: string;            // 기본 제공 또는 사용자 정의 템플릿 ID
}

/**
 * EmailGenerationResult (이메일 생성 결과)
 * 참조: Azrael-PRD-Phase2.md §4.1
 */
export interface EmailGenerationResult {
  subject: string;               // 생성된 제목 (플레인텍스트)
  bodyHtml: string;              // 생성된 본문 (HTML, juice 인라인 스타일 적용)
  bodyText: string;              // 생성된 본문 (플레인텍스트)
}

/**
 * 유효한 템플릿 변수 목록
 * 참조: Azrael-PRD-Phase2.md §2.4
 * ⚠️ §2.4 이메일 템플릿 변수 테이블과 동기화 필수
 */
export const VALID_TEMPLATE_VARIABLES = [
  'updateDate', 'updateDateShort', 'headsUp', 'iosReviewDate',
  'table', 'disclaimer', 'projectName', 'showIosReviewDate',
] as const;

/**
 * boolean 전용 변수 — 조건부 블록({{#if}})에서만 사용
 * 참조: Azrael-PRD-Phase2.md §2.4 (v2.7)
 */
export const BOOLEAN_ONLY_VARIABLES = ['showIosReviewDate'] as const;

/**
 * LocalStorage 키 상수
 */
export const STORAGE_KEYS = {
  PROJECTS: 'azrael:projects',
  TEMPLATES: 'azrael:templates',
  HOLIDAYS: 'azrael:holidays',
  USER_STATE: 'azrael:userState',
  JIRA_CONFIG: 'azrael:jiraConfig',  // Phase 1
  CALCULATION: (projectId: string) => `azrael:calculation:${projectId}`,
} as const;

/**
 * 기본 프로젝트 목록
 * 참조: Azrael-PRD-Shared.md §5.3
 */
export const DEFAULT_PROJECTS: Project[] = [
  { id: "M4_GL", name: "M4/GL", headsUpOffset: 10, showIosReviewDate: false, templateId: "template_M4_GL", disclaimer: "" },
  { id: "NC_GL_1week", name: "NC/GL (1주)", headsUpOffset: 7, showIosReviewDate: false, templateId: "template_NC_GL_1week", disclaimer: "" },
  { id: "NC_GL_2week", name: "NC/GL (2주)", headsUpOffset: 10, showIosReviewDate: false, templateId: "template_NC_GL_2week", disclaimer: "" },
  { id: "FB_GL_CDN", name: "FB/GL (CDN)", headsUpOffset: 10, showIosReviewDate: false, templateId: "template_FB_GL_CDN", disclaimer: "" },
  { id: "FB_GL_APP", name: "FB/GL (APP)", headsUpOffset: 10, showIosReviewDate: false, templateId: "template_FB_GL_APP", disclaimer: "" },
  { id: "FB_JP_CDN", name: "FB/JP (CDN)", headsUpOffset: 10, showIosReviewDate: false, templateId: "template_FB_JP_CDN", disclaimer: "" },
  { id: "FB_JP_APP", name: "FB/JP (APP)", headsUpOffset: 10, showIosReviewDate: false, templateId: "template_FB_JP_APP", disclaimer: "" },
  { id: "LY_GL", name: "LY/GL", headsUpOffset: 10, showIosReviewDate: false, templateId: "template_LY_GL", disclaimer: "" },
  { id: "MONTHLY", name: "월말정산", headsUpOffset: 5, showIosReviewDate: false, templateId: "template_MONTHLY", disclaimer: "" }
];
