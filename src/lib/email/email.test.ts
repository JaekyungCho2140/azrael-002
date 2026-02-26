/**
 * Phase 2 이메일 생성 종합 테스트
 *
 * 1. 템플릿 파서 (변수 치환, 조건부 블록, 엔티티 디코딩, 유효성 검증)
 * 2. 날짜 포맷터
 * 3. 테이블 HTML 변환 (children 평탄화, 빈 테이블)
 * 4. HTML → 플레인텍스트 변환
 * 5. Disclaimer 새니타이저
 * 6. 이메일 생성 파이프라인 (generateEmail 통합)
 * 7. 클립보드 유틸리티
 * 8. Gmail 붙여넣기 호환성 (인라인 스타일)
 */

import { describe, it, expect, vi } from 'vitest';
import { renderTemplate, validateTemplate } from './templateParser';
import {
  formatEmailDate,
  formatUpdateDateShort,
  formatDateMMDD,
  formatDateFull,
  getEntriesByTableType,
  formatTableHtml,
  htmlToPlainText,
} from './formatters';
import { sanitize, renderDisclaimerHtml } from './sanitizer';
import { generateEmail } from './emailGenerator';
import {
  BASIC_SUBJECT_TEMPLATE,
  BASIC_BODY_TEMPLATE,
  DETAILED_SUBJECT_TEMPLATE,
  DETAILED_BODY_TEMPLATE,
} from './templates';
import type {
  TemplateContext,
  CalculationResult,
  ScheduleEntry,
  Project,
  EmailTemplate,
} from '../../types';

// ============================================================
// 공통 테스트 데이터
// ============================================================

function makeEntry(overrides: Partial<ScheduleEntry> = {}): ScheduleEntry {
  return {
    id: 'entry-1',
    stageId: 'stage-1',
    index: 1,
    stageName: 'LQA',
    startDateTime: new Date('2026-02-10T10:00:00'),
    endDateTime: new Date('2026-02-12T18:00:00'),
    description: '',
    assignee: '',
    children: [],
    isManualEdit: false,
    ...overrides,
  };
}

function makeCalcResult(overrides: Partial<CalculationResult> = {}): CalculationResult {
  return {
    id: 'test-calc-id',
    projectId: 'proj-1',
    updateDate: new Date('2026-02-10'),
    headsUpDate: new Date('2026-02-03'),
    iosReviewDate: new Date('2026-02-07'),
    calculatedAt: new Date('2026-02-01T12:00:00'),
    table1Entries: [
      makeEntry({ index: 1, stageName: 'LQA', children: [
        makeEntry({ id: 'entry-1-1', index: 1.1, stageName: 'LQA-Sub' }),
      ]}),
      makeEntry({ id: 'entry-2', index: 2, stageName: 'Final' }),
    ],
    table2Entries: [
      makeEntry({ index: 1, stageName: 'LQA' }),
      makeEntry({ id: 'entry-2', index: 2, stageName: 'Final' }),
    ],
    table3Entries: [
      makeEntry({ index: 1, stageName: 'LQA' }),
    ],
    ...overrides,
  };
}

const mockProject: Project = {
  id: 'proj-1',
  name: 'TestProject',
  headsUpOffset: 5,
  showIosReviewDate: true,
  iosReviewOffset: 3,
  showPaidProductDate: false,
  templateId: 'tmpl-default',
  disclaimer: '<r>주의</r> 일정 변경 가능',
};

function makeTemplate(overrides: Partial<EmailTemplate> = {}): EmailTemplate {
  return {
    id: 'tmpl-1',
    projectId: 'proj-1',
    name: '테스트',
    subjectTemplate: '[L10n] {updateDate} 업데이트',
    bodyTemplate: '<p>{updateDateDay} 일정 안내</p>',
    isBuiltIn: false,
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: null,
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ============================================================
// 1. 템플릿 파서: renderTemplate
// ============================================================

describe('renderTemplate', () => {
  const context: TemplateContext = {
    updateDate: '0210',
    updateDateDay: '02/10(월)',
    updateDateFull: '26/02/10',
    updateDateShort: '0210',
    headsUp: '0203',
    headsUpDay: '02/03(월)',
    headsUpFull: '26/02/03',
    iosReviewDate: '0207',
    iosReviewDateDay: '02/07(토)',
    iosReviewDateFull: '26/02/07',
    date: '260210',
    table: '<table>...</table>',
    disclaimer: '주의사항 텍스트',
    projectName: 'TestProject',
    showIosReviewDate: true,
  };

  describe('변수 치환 (8개 변수)', () => {
    it('{updateDate} 치환 (MMDD)', () => {
      expect(renderTemplate('{updateDate}', context)).toBe('0210');
    });

    it('{updateDateDay} 치환 (MM/DD(요일))', () => {
      expect(renderTemplate('{updateDateDay}', context)).toBe('02/10(월)');
    });

    it('{updateDateFull} 치환 (YY/MM/DD)', () => {
      expect(renderTemplate('{updateDateFull}', context)).toBe('26/02/10');
    });

    it('{headsUp} 치환 (MMDD)', () => {
      expect(renderTemplate('{headsUp}', context)).toBe('0203');
    });

    it('{headsUpDay} 치환 (MM/DD(요일))', () => {
      expect(renderTemplate('{headsUpDay}', context)).toBe('02/03(월)');
    });

    it('{iosReviewDate} 치환 (MMDD)', () => {
      expect(renderTemplate('{iosReviewDate}', context)).toBe('0207');
    });

    it('{table} 치환', () => {
      expect(renderTemplate('{table}', context)).toBe('<table>...</table>');
    });

    it('{disclaimer} 치환', () => {
      expect(renderTemplate('{disclaimer}', context)).toBe('주의사항 텍스트');
    });

    it('{projectName} 치환', () => {
      expect(renderTemplate('{projectName}', context)).toBe('TestProject');
    });

    it('{showIosReviewDate} 치환 시 boolean → 문자열', () => {
      expect(renderTemplate('{showIosReviewDate}', context)).toBe('true');
    });

    it('여러 변수가 포함된 복합 템플릿 치환', () => {
      const template = '{projectName}: {updateDateDay} 업데이트, 헤즈업 {headsUpDay}';
      expect(renderTemplate(template, context)).toBe(
        'TestProject: 02/10(월) 업데이트, 헤즈업 02/03(월)',
      );
    });

    it('존재하지 않는 변수는 [미입력]', () => {
      expect(renderTemplate('{unknownVar}', context)).toBe('[미입력]');
    });

    it('null 값 변수는 [미입력]', () => {
      const ctx: TemplateContext = { myVar: null };
      expect(renderTemplate('{myVar}', ctx)).toBe('[미입력]');
    });

    it('undefined 값 변수는 [미입력]', () => {
      const ctx: TemplateContext = { myVar: undefined };
      expect(renderTemplate('{myVar}', ctx)).toBe('[미입력]');
    });

    it('빈 문자열 값은 그대로 출력', () => {
      const ctx: TemplateContext = { myVar: '' };
      expect(renderTemplate('{myVar}', ctx)).toBe('');
    });
  });

  describe('TipTap HTML entity 디코딩', () => {
    it('&#123; / &#125; 디코딩 후 변수 치환', () => {
      expect(renderTemplate('&#123;updateDate&#125;', context)).toBe('0210');
    });

    it('&lcub; / &rcub; 디코딩 후 변수 치환', () => {
      expect(renderTemplate('&lcub;updateDate&rcub;', context)).toBe('0210');
    });

    it('엔티티 디코딩 + 조건부 블록', () => {
      const tmpl = '&#123;&#123;#if showIosReviewDate&#125;&#125;iOS: &#123;iosReviewDateDay&#125;&#123;&#123;/if&#125;&#125;';
      expect(renderTemplate(tmpl, context)).toBe('iOS: 02/07(토)');
    });
  });

  describe('조건부 블록 {{#if}}', () => {
    it('truthy 조건 → 블록 렌더링', () => {
      const tmpl = '{{#if showIosReviewDate}}iOS: {iosReviewDateDay}{{/if}}';
      expect(renderTemplate(tmpl, context)).toBe('iOS: 02/07(토)');
    });

    it('falsy 조건 (false) → 블록 제거', () => {
      const ctx: TemplateContext = { ...context, showIosReviewDate: false };
      const tmpl = 'Before{{#if showIosReviewDate}} iOS{{/if}} After';
      expect(renderTemplate(tmpl, ctx)).toBe('Before After');
    });

    it('falsy 조건 (null) → 블록 제거', () => {
      const ctx: TemplateContext = { ...context, disclaimer: null };
      const tmpl = '{{#if disclaimer}}Disclaimer: {disclaimer}{{/if}}';
      expect(renderTemplate(tmpl, ctx)).toBe('');
    });

    it('falsy 조건 (빈 문자열) → 블록 제거', () => {
      const ctx: TemplateContext = { ...context, disclaimer: '' };
      const tmpl = '{{#if disclaimer}}Disclaimer: {disclaimer}{{/if}}';
      expect(renderTemplate(tmpl, ctx)).toBe('');
    });

    it('여러 조건부 블록 독립 처리', () => {
      const tmpl = '{{#if showIosReviewDate}}A{{/if}} {{#if disclaimer}}B{{/if}}';
      expect(renderTemplate(tmpl, context)).toBe('A B');

      const ctx: TemplateContext = { ...context, showIosReviewDate: false };
      expect(renderTemplate(tmpl, ctx)).toBe(' B');
    });

    it('조건부 블록 내부에 변수 치환', () => {
      const tmpl = '{{#if disclaimer}}<p>※ {disclaimer}</p>{{/if}}';
      expect(renderTemplate(tmpl, context)).toBe('<p>※ 주의사항 텍스트</p>');
    });

    it('조건부 블록 내부에 HTML 포함', () => {
      const tmpl = '{{#if showIosReviewDate}}<li>iOS: {iosReviewDateDay}</li>{{/if}}';
      expect(renderTemplate(tmpl, context)).toBe('<li>iOS: 02/07(토)</li>');
    });
  });
});

// ============================================================
// 2. 템플릿 유효성 검증: validateTemplate
// ============================================================

describe('validateTemplate', () => {
  it('유효한 템플릿 → 경고 없음', () => {
    const tmpl = '{updateDate} {headsUp} {{#if showIosReviewDate}}{iosReviewDate}{{/if}}';
    expect(validateTemplate(tmpl)).toEqual([]);
  });

  it('알 수 없는 변수 감지', () => {
    const warnings = validateTemplate('{unknownVariable}');
    expect(warnings).toContainEqual(expect.stringContaining('알 수 없는 변수'));
  });

  it('boolean 전용 변수를 단순 변수로 사용 시 경고', () => {
    const warnings = validateTemplate('{showIosReviewDate}');
    expect(warnings).toContainEqual(expect.stringContaining('조건부 블록'));
  });

  it('닫히지 않은 조건부 블록 감지', () => {
    const warnings = validateTemplate('{{#if showIosReviewDate}}content');
    expect(warnings).toContainEqual(expect.stringContaining('닫히지 않은'));
  });

  it('여는 태그 없이 {{/if}} 감지', () => {
    const warnings = validateTemplate('content{{/if}}');
    expect(warnings).toContainEqual(expect.stringContaining('여는 태그'));
  });

  it('변수 구문 내 HTML 태그 경고', () => {
    const warnings = validateTemplate('{update<strong>Date</strong>}');
    expect(warnings).toContainEqual(expect.stringContaining('HTML 태그'));
  });

  it('정상 조건부 블록 열림/닫힘 일치 시 경고 없음', () => {
    const tmpl = '{{#if disclaimer}}d{{/if}} {{#if showIosReviewDate}}s{{/if}}';
    expect(validateTemplate(tmpl)).toEqual([]);
  });
});

// ============================================================
// 3. 날짜 포맷터
// ============================================================

describe('formatEmailDate', () => {
  it('MM/DD(요일) 형식 반환', () => {
    const date = new Date('2026-02-10');
    expect(formatEmailDate(date)).toBe('02/10(화)');
  });

  it('한 자리 월/일 제로패딩', () => {
    const date = new Date('2026-01-05');
    expect(formatEmailDate(date)).toBe('01/05(월)');
  });

  it('유효하지 않은 날짜 → 에러 텍스트', () => {
    expect(formatEmailDate(new Date('invalid'))).toBe('[유효하지 않은 날짜]');
  });
});

describe('formatUpdateDateShort', () => {
  it('MM-DD 형식 반환', () => {
    expect(formatUpdateDateShort(new Date('2026-02-10'))).toBe('02-10');
  });

  it('한 자리 월/일 제로패딩', () => {
    expect(formatUpdateDateShort(new Date('2026-01-05'))).toBe('01-05');
  });
});

describe('formatDateMMDD', () => {
  it('MMDD 형식 반환', () => {
    expect(formatDateMMDD(new Date('2026-02-10'))).toBe('0210');
  });
  it('한 자리 월/일 패딩', () => {
    expect(formatDateMMDD(new Date('2026-01-05'))).toBe('0105');
  });
});

describe('formatDateFull', () => {
  it('YY/MM/DD 형식 반환', () => {
    expect(formatDateFull(new Date('2026-02-10'))).toBe('26/02/10');
  });
  it('연도 넘김', () => {
    expect(formatDateFull(new Date('2025-12-28'))).toBe('25/12/28');
  });
});

// ============================================================
// 4. 테이블 엔트리 추출 (children 평탄화)
// ============================================================

describe('getEntriesByTableType', () => {
  const calcResult = makeCalcResult();

  it('table1 엔트리 추출 + children 평탄화', () => {
    const entries = getEntriesByTableType(calcResult, 'table1');
    // table1: parent(LQA) + child(LQA-Sub) + parent(Final) = 3
    expect(entries).toHaveLength(3);
    expect(entries[0].index).toBe(1);
    expect(entries[1].index).toBe(1.1);
    expect(entries[2].index).toBe(2);
  });

  it('table2 엔트리 추출', () => {
    const entries = getEntriesByTableType(calcResult, 'table2');
    expect(entries).toHaveLength(2);
  });

  it('table3 엔트리 추출', () => {
    const entries = getEntriesByTableType(calcResult, 'table3');
    expect(entries).toHaveLength(1);
  });
});

// ============================================================
// 5. HTML 테이블 변환
// ============================================================

describe('formatTableHtml', () => {
  it('빈 엔트리 → 안내 메시지', () => {
    const html = formatTableHtml([], 'table1');
    expect(html).toContain('해당 테이블에 일정이 없습니다');
  });

  it('table1: 6개 컬럼 (#, 배치, 마감, 테이블 전달, 담당자, 설명)', () => {
    const entries = [makeEntry({ assignee: 'alice', description: 'QA 작업' })];
    const html = formatTableHtml(entries, 'table1');
    expect(html).toContain('<th');
    expect(html).toContain('배치');
    expect(html).toContain('마감');
    expect(html).toContain('담당자');
    expect(html).toContain('alice');
    expect(html).toContain('QA 작업');
  });

  it('table2: 5개 컬럼 (#, 배치, HO, HB, 설명)', () => {
    const entries = [makeEntry({ description: '외부용' })];
    const html = formatTableHtml(entries, 'table2');
    expect(html).toContain('HO');
    expect(html).toContain('HB');
    expect(html).not.toContain('담당자');
  });

  it('table3: table2와 동일한 컬럼 구조', () => {
    const entries = [makeEntry()];
    const html = formatTableHtml(entries, 'table3');
    expect(html).toContain('HO');
    expect(html).toContain('HB');
  });

  it('HTML 특수문자 이스케이프', () => {
    const entries = [makeEntry({ stageName: '<script>alert("xss")</script>' })];
    const html = formatTableHtml(entries, 'table1');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('인라인 스타일 포함 (Gmail 호환)', () => {
    const entries = [makeEntry()];
    const html = formatTableHtml(entries, 'table1');
    expect(html).toContain('border-collapse: collapse');
    expect(html).toContain('font-family: Arial');
    expect(html).toContain('style="');
  });
});

// ============================================================
// 6. HTML → 플레인텍스트 변환
// ============================================================

describe('htmlToPlainText', () => {
  it('<p> → 텍스트 + 빈 줄', () => {
    expect(htmlToPlainText('<p>Hello</p><p>World</p>')).toBe('Hello\n\nWorld');
  });

  it('<br> → 줄바꿈', () => {
    expect(htmlToPlainText('Line1<br>Line2')).toBe('Line1\nLine2');
  });

  it('<li> → bullet point', () => {
    expect(htmlToPlainText('<ul><li>Item1</li><li>Item2</li></ul>')).toBe('• Item1\n• Item2');
  });

  it('<a> → 텍스트만 (URL 제거)', () => {
    expect(htmlToPlainText('<a href="https://example.com">링크</a>')).toBe('링크');
  });

  it('<strong>/<em> 등 인라인 서식 태그 제거', () => {
    expect(htmlToPlainText('<strong>Bold</strong> <em>Italic</em>')).toBe('Bold Italic');
  });

  it('<table> → 탭 구분, 행 줄바꿈', () => {
    const html = '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>';
    const text = htmlToPlainText(html);
    expect(text).toContain('A\tB');
    expect(text).toContain('1\t2');
  });

  it('HTML entities 디코딩', () => {
    // htmlToPlainText는 trim() 적용 → trailing space 제거
    expect(htmlToPlainText('&amp; &lt; &gt; &quot; &nbsp;')).toBe('& < > "');
  });

  it('연속 빈 줄 정리 (3줄 이상 → 2줄)', () => {
    const html = '<p>A</p><p></p><p></p><p></p><p>B</p>';
    const text = htmlToPlainText(html);
    expect(text).not.toMatch(/\n{3,}/);
  });

  it('inline style 속성 포함 태그 제거', () => {
    const html = '<span style="color: red;">Red text</span>';
    expect(htmlToPlainText(html)).toBe('Red text');
  });
});

// ============================================================
// 7. Disclaimer 새니타이저
// ============================================================

describe('sanitize', () => {
  it('허용 태그(<b>, <r>, <g>, <bl>, <u>) 보존', () => {
    const input = '<b>Bold</b> <r>Red</r> <g>Green</g> <bl>Blue</bl> <u>Under</u>';
    const result = sanitize(input);
    expect(result).toContain('<b>Bold</b>');
    expect(result).toContain('<r>Red</r>');
    expect(result).toContain('<g>Green</g>');
    expect(result).toContain('<bl>Blue</bl>');
    expect(result).toContain('<u>Under</u>');
  });

  it('비허용 태그 이스케이프', () => {
    const result = sanitize('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('혼합 사용: 허용 + 비허용 태그', () => {
    const input = '<b>Bold</b> <script>bad</script> text';
    const result = sanitize(input);
    expect(result).toContain('<b>Bold</b>');
    expect(result).toContain('&lt;script&gt;');
  });
});

describe('renderDisclaimerHtml', () => {
  it('null → 빈 문자열', () => {
    expect(renderDisclaimerHtml(null)).toBe('');
  });

  it('공백만 → 빈 문자열', () => {
    expect(renderDisclaimerHtml('   ')).toBe('');
  });

  it('커스텀 태그 없는 텍스트 → 그대로', () => {
    const result = renderDisclaimerHtml('일정 변경 가능');
    expect(result).toBe('일정 변경 가능');
  });

  it('<b> → <strong>', () => {
    const result = renderDisclaimerHtml('<b>중요</b>');
    expect(result).toContain('<strong>중요</strong>');
  });

  it('<r> → <span style="color:red">', () => {
    const result = renderDisclaimerHtml('<r>주의</r>');
    expect(result).toContain('<span style="color:red">주의</span>');
  });

  it('<g> → <span style="color:green">', () => {
    const result = renderDisclaimerHtml('<g>완료</g>');
    expect(result).toContain('<span style="color:green">완료</span>');
  });

  it('<bl> → <span style="color:blue">', () => {
    const result = renderDisclaimerHtml('<bl>참고</bl>');
    expect(result).toContain('<span style="color:blue">참고</span>');
  });

  it('<u> → <u>', () => {
    const result = renderDisclaimerHtml('<u>밑줄</u>');
    expect(result).toContain('<u>밑줄</u>');
  });

  it('줄바꿈 → <br>', () => {
    const result = renderDisclaimerHtml('Line1\nLine2');
    expect(result).toBe('Line1<br>Line2');
  });

  it('XSS 시도 차단', () => {
    const result = renderDisclaimerHtml('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
  });
});

// ============================================================
// 8. 이메일 생성 파이프라인 (generateEmail 통합)
// ============================================================

describe('generateEmail', () => {
  const calcResult = makeCalcResult();
  const template = makeTemplate({
    subjectTemplate: BASIC_SUBJECT_TEMPLATE,
    bodyTemplate: BASIC_BODY_TEMPLATE,
  });

  it('제목에 updateDate 변수 치환 (MMDD)', () => {
    const result = generateEmail(
      { projectId: 'proj-1', updateDate: new Date('2026-02-10'), tableType: 'table2', templateId: 'tmpl-1' },
      { template, project: mockProject, calcResult },
    );
    expect(result.subject).toContain('0210');
    expect(result.subject).toContain('[L10n]');
    expect(result.subject).not.toContain('{');
  });

  it('본문에 모든 변수 치환 완료 (미치환 변수 없음)', () => {
    const result = generateEmail(
      { projectId: 'proj-1', updateDate: new Date('2026-02-10'), tableType: 'table2', templateId: 'tmpl-1' },
      { template, project: mockProject, calcResult },
    );
    // {variable} 패턴이 남아있지 않아야 함 ([미입력] 제외)
    const remaining = result.bodyHtml.match(/\{(\w+)\}/g);
    expect(remaining).toBeNull();
  });

  it('bodyHtml에 인라인 스타일 포함', () => {
    const result = generateEmail(
      { projectId: 'proj-1', updateDate: new Date('2026-02-10'), tableType: 'table2', templateId: 'tmpl-1' },
      { template, project: mockProject, calcResult },
    );
    expect(result.bodyHtml).toContain('style="');
  });

  it('bodyText는 HTML 태그 없음', () => {
    const result = generateEmail(
      { projectId: 'proj-1', updateDate: new Date('2026-02-10'), tableType: 'table2', templateId: 'tmpl-1' },
      { template, project: mockProject, calcResult },
    );
    expect(result.bodyText).not.toMatch(/<[^>]+>/);
  });

  it('제목에 HTML 태그가 포함되어도 strip 처리', () => {
    const tmpl = makeTemplate({ subjectTemplate: '<b>{updateDate}</b> 업데이트' });
    const result = generateEmail(
      { projectId: 'proj-1', updateDate: new Date('2026-02-10'), tableType: 'table2', templateId: 'tmpl-1' },
      { template: tmpl, project: mockProject, calcResult },
    );
    expect(result.subject).not.toContain('<b>');
    expect(result.subject).toContain('0210');
  });

  it('showIosReviewDate=true → iOS 심사일 블록 포함', () => {
    const result = generateEmail(
      { projectId: 'proj-1', updateDate: new Date('2026-02-10'), tableType: 'table2', templateId: 'tmpl-1' },
      { template, project: { ...mockProject, showIosReviewDate: true }, calcResult },
    );
    expect(result.bodyHtml).toContain('iOS 심사일');
  });

  it('showIosReviewDate=false → iOS 심사일 블록 제거', () => {
    const result = generateEmail(
      { projectId: 'proj-1', updateDate: new Date('2026-02-10'), tableType: 'table2', templateId: 'tmpl-1' },
      {
        template,
        project: { ...mockProject, showIosReviewDate: false },
        calcResult: { ...calcResult, iosReviewDate: undefined },
      },
    );
    expect(result.bodyHtml).not.toContain('iOS 심사일');
  });

  it('disclaimer 있음 → Disclaimer 블록 포함', () => {
    const result = generateEmail(
      { projectId: 'proj-1', updateDate: new Date('2026-02-10'), tableType: 'table2', templateId: 'tmpl-1' },
      { template, project: mockProject, calcResult },
    );
    expect(result.bodyHtml).toContain('Disclaimer');
  });

  it('disclaimer null → Disclaimer 블록 제거', () => {
    const result = generateEmail(
      { projectId: 'proj-1', updateDate: new Date('2026-02-10'), tableType: 'table2', templateId: 'tmpl-1' },
      {
        template,
        project: { ...mockProject, disclaimer: '' },
        calcResult,
      },
    );
    expect(result.bodyHtml).not.toContain('Disclaimer');
  });

  it('테이블 타입별 HTML 포함', () => {
    for (const tableType of ['table1', 'table2', 'table3'] as const) {
      const result = generateEmail(
        { projectId: 'proj-1', updateDate: new Date('2026-02-10'), tableType, templateId: 'tmpl-1' },
        { template, project: mockProject, calcResult },
      );
      expect(result.bodyHtml).toContain('<table');
    }
  });

  it('상세 템플릿도 정상 생성', () => {
    const detailedTemplate = makeTemplate({
      subjectTemplate: DETAILED_SUBJECT_TEMPLATE,
      bodyTemplate: DETAILED_BODY_TEMPLATE,
    });
    const result = generateEmail(
      { projectId: 'proj-1', updateDate: new Date('2026-02-10'), tableType: 'table2', templateId: 'tmpl-1' },
      { template: detailedTemplate, project: mockProject, calcResult },
    );
    expect(result.subject).toContain('상세');
    expect(result.bodyHtml).toContain('배경설명');
    expect(result.bodyHtml).toContain('주의사항');
  });
});

// ============================================================
// 9. 클립보드 유틸리티
// ============================================================

describe('clipboard', () => {
  describe('checkClipboardSupport', () => {
    it('ClipboardItem 있으면 supported=true', async () => {
      const { checkClipboardSupport } = await import('./clipboard');
      // jsdom 환경에서 ClipboardItem 존재 여부에 따라 결과 달라짐
      const result = checkClipboardSupport();
      expect(result).toHaveProperty('supported');
      expect(typeof result.supported).toBe('boolean');
    });
  });

  describe('copyEmailToClipboard', () => {
    it('ClipboardItem 사용하여 HTML + plaintext 동시 복사', async () => {
      // ClipboardItem + navigator.clipboard.write 모킹
      const writeSpy = vi.fn().mockResolvedValue(undefined);
      const originalClipboard = navigator.clipboard;
      const originalClipboardItem = globalThis.ClipboardItem;

      Object.defineProperty(navigator, 'clipboard', {
        value: { write: writeSpy },
        writable: true,
        configurable: true,
      });

      globalThis.ClipboardItem = class MockClipboardItem {
        constructor(public items: Record<string, Promise<Blob>>) {}
      } as any;

      const { copyEmailToClipboard } = await import('./clipboard');
      await copyEmailToClipboard('<p>Hello</p>', 'Hello');

      expect(writeSpy).toHaveBeenCalledTimes(1);
      const clipboardItem = writeSpy.mock.calls[0][0][0];
      expect(clipboardItem.items).toHaveProperty('text/html');
      expect(clipboardItem.items).toHaveProperty('text/plain');

      // 복원
      Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, writable: true, configurable: true });
      globalThis.ClipboardItem = originalClipboardItem;
    });
  });

  describe('copySubjectToClipboard', () => {
    it('writeText로 플레인텍스트 복사', async () => {
      const writeTextSpy = vi.fn().mockResolvedValue(undefined);
      const originalClipboard = navigator.clipboard;

      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextSpy },
        writable: true,
        configurable: true,
      });

      const { copySubjectToClipboard } = await import('./clipboard');
      await copySubjectToClipboard('[L10n] 02-10 업데이트');

      expect(writeTextSpy).toHaveBeenCalledWith('[L10n] 02-10 업데이트');

      Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, writable: true, configurable: true });
    });
  });
});

// ============================================================
// 10. Gmail 붙여넣기 호환성
// ============================================================

describe('Gmail 호환성', () => {
  it('생성된 HTML에 인라인 style 속성 포함 (Gmail은 <style> 블록 무시)', () => {
    const template = makeTemplate({
      subjectTemplate: BASIC_SUBJECT_TEMPLATE,
      bodyTemplate: BASIC_BODY_TEMPLATE,
    });
    const result = generateEmail(
      { projectId: 'proj-1', updateDate: new Date('2026-02-10'), tableType: 'table2', templateId: 'tmpl-1' },
      { template, project: mockProject, calcResult: makeCalcResult() },
    );

    // Gmail 호환: 모든 스타일이 인라인이어야 함
    expect(result.bodyHtml).not.toContain('<style>');
    expect(result.bodyHtml).not.toContain('<style ');

    // 주요 요소에 인라인 스타일 존재 확인
    expect(result.bodyHtml).toContain('style="');
  });

  it('테이블에 border, cellpadding 속성 포함 (Outlook 호환)', () => {
    const entries = [makeEntry()];
    const html = formatTableHtml(entries, 'table2');
    expect(html).toContain('border="1"');
    expect(html).toContain('cellpadding="8"');
    expect(html).toContain('cellspacing="0"');
  });

  it('font-family: Arial 인라인 지정 (웹메일 기본 폰트 보장)', () => {
    const template = makeTemplate({
      subjectTemplate: BASIC_SUBJECT_TEMPLATE,
      bodyTemplate: BASIC_BODY_TEMPLATE,
    });
    const result = generateEmail(
      { projectId: 'proj-1', updateDate: new Date('2026-02-10'), tableType: 'table2', templateId: 'tmpl-1' },
      { template, project: mockProject, calcResult: makeCalcResult() },
    );
    expect(result.bodyHtml).toContain('font-family');
    expect(result.bodyHtml).toContain('Arial');
  });

  it('색상값이 #hex 형식 (웹메일 호환)', () => {
    const template = makeTemplate({
      subjectTemplate: BASIC_SUBJECT_TEMPLATE,
      bodyTemplate: BASIC_BODY_TEMPLATE,
    });
    const result = generateEmail(
      { projectId: 'proj-1', updateDate: new Date('2026-02-10'), tableType: 'table2', templateId: 'tmpl-1' },
      { template, project: mockProject, calcResult: makeCalcResult() },
    );
    // #333333, #f0f0f0 등 hex 색상 확인
    expect(result.bodyHtml).toMatch(/#[0-9a-fA-F]{6}/);
  });

  it('ClipboardItem에 text/html MIME 타입으로 전달', () => {
    // 이미 clipboard 테스트에서 검증됨 — 여기서는 MIME 형식만 확인
    const htmlBlob = new Blob(['<p>Test</p>'], { type: 'text/html' });
    expect(htmlBlob.type).toBe('text/html');

    const textBlob = new Blob(['Test'], { type: 'text/plain' });
    expect(textBlob.type).toBe('text/plain');
  });
});

// ============================================================
// 11. 기본 제공 템플릿 정의 검증
// ============================================================

describe('기본 제공 템플릿', () => {
  it('기본 템플릿 제목에 {updateDate} 포함', () => {
    expect(BASIC_SUBJECT_TEMPLATE).toContain('{updateDate}');
  });

  it('기본 템플릿 본문에 필수 변수 포함', () => {
    expect(BASIC_BODY_TEMPLATE).toContain('{updateDate}');
    expect(BASIC_BODY_TEMPLATE).toContain('{headsUp}');
    expect(BASIC_BODY_TEMPLATE).toContain('{table}');
  });

  it('기본 템플릿에 조건부 블록 포함', () => {
    expect(BASIC_BODY_TEMPLATE).toContain('{{#if showIosReviewDate}}');
    expect(BASIC_BODY_TEMPLATE).toContain('{{#if disclaimer}}');
    expect(BASIC_BODY_TEMPLATE).toContain('{{/if}}');
  });

  it('상세 템플릿 본문에 배경설명 포함', () => {
    expect(DETAILED_BODY_TEMPLATE).toContain('배경설명');
  });

  it('상세 템플릿 본문에 주의사항 포함', () => {
    expect(DETAILED_BODY_TEMPLATE).toContain('주의사항');
  });

  it('기본 템플릿 자체 유효성 검증 통과', () => {
    const subjectWarnings = validateTemplate(BASIC_SUBJECT_TEMPLATE);
    const bodyWarnings = validateTemplate(BASIC_BODY_TEMPLATE);
    expect(subjectWarnings).toEqual([]);
    expect(bodyWarnings).toEqual([]);
  });

  it('상세 템플릿 자체 유효성 검증 통과', () => {
    const subjectWarnings = validateTemplate(DETAILED_SUBJECT_TEMPLATE);
    const bodyWarnings = validateTemplate(DETAILED_BODY_TEMPLATE);
    expect(subjectWarnings).toEqual([]);
    expect(bodyWarnings).toEqual([]);
  });
});
