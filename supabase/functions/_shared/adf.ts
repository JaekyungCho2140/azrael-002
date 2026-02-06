/**
 * ADF (Atlassian Document Format) 변환 유틸리티
 * 참조: https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
 *
 * 지원 마크업:
 *  - 테이블 (||헤더|| / |데이터|)
 *  - 체크박스 ([ ] / [x])
 *  - 구분선 (---, ***, ___)
 *  - 글머리 기호 (- item, * item)
 */

export interface ADFNode {
  type: string;
  attrs?: Record<string, any>;
  content?: ADFNode[];
  text?: string;
  marks?: { type: string }[];
}

/**
 * 테이블 마크업 행들을 ADF table 노드로 변환
 * 형식:
 *   ||헤더1|헤더2|헤더3||  (헤더 행: 파이프 2개로 시작/끝)
 *   |내용1|내용2|내용3|    (데이터 행: 파이프 1개로 시작/끝)
 *
 * @param tableLines - 테이블 마크업 행 배열
 * @returns ADF table 노드 또는 null
 */
function parseTableMarkup(tableLines: string[]): ADFNode | null {
  if (tableLines.length === 0) return null;

  const tableRows: ADFNode[] = [];
  let headerColumnCount = -1; // 첫 헤더 행의 컬럼 수 (미확정: -1)

  for (const line of tableLines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // 헤더 행 후보: ||...||
    const looksLikeHeader = trimmedLine.startsWith('||') && trimmedLine.endsWith('||');

    // 데이터 행으로 해석했을 때의 셀 수 (|...|)
    const dataInner = trimmedLine.slice(1, -1);
    const dataCells = dataInner.split('|').map(c => c.trim());
    const dataColumnCount = dataCells.length;

    // 실제 헤더인지 판별:
    // - 헤더 형식(||...||)이고
    // - 아직 첫 헤더가 없거나, 데이터 행으로 해석했을 때 컬럼 수가 기존 헤더와 불일치
    let isHeader: boolean;
    if (looksLikeHeader) {
      if (headerColumnCount === -1) {
        // 첫 행: 헤더로 확정
        isHeader = true;
      } else {
        // 후속 행: 데이터 행 해석의 컬럼 수가 헤더와 일치하면 데이터 행
        isHeader = dataColumnCount !== headerColumnCount;
      }
    } else {
      isHeader = false;
    }

    let cells: string[];
    if (isHeader) {
      // ||헤더1|헤더2|| → ['헤더1', '헤더2']
      const inner = trimmedLine.slice(2, -2); // 앞뒤 || 제거
      cells = inner.split('|').map(c => c.trim());
      // 첫 헤더 행이면 컬럼 수 확정
      if (headerColumnCount === -1) {
        headerColumnCount = cells.length;
      }
    } else if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      // |내용1|내용2| → ['내용1', '내용2']
      cells = dataCells;
      // 헤더 없이 데이터 행만 있는 경우 컬럼 수 확정
      if (headerColumnCount === -1) {
        headerColumnCount = cells.length;
      }
    } else {
      continue; // 유효하지 않은 행
    }

    // 빈 셀 배열이면 스킵
    if (cells.length === 0 || (cells.length === 1 && cells[0] === '')) continue;

    const cellNodes: ADFNode[] = cells.map(cellText => ({
      type: isHeader ? 'tableHeader' : 'tableCell',
      attrs: {},
      content: [
        {
          type: 'paragraph',
          content: cellText ? [
            {
              type: 'text',
              text: cellText,
              ...(isHeader ? { marks: [{ type: 'strong' }] } : {}),
            },
          ] : [],
        },
      ],
    }));

    tableRows.push({
      type: 'tableRow',
      content: cellNodes,
    });
  }

  if (tableRows.length === 0) return null;

  return {
    type: 'table',
    attrs: {
      isNumberColumnEnabled: false,
      layout: 'default',
    },
    content: tableRows,
  };
}

/**
 * 테이블 마크업 행인지 확인
 * @param line - 검사할 행
 * @returns 테이블 행이면 true
 */
function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  // ||...|| (헤더) 또는 |...| (데이터) 형식
  return (trimmed.startsWith('||') && trimmed.endsWith('||')) ||
         (trimmed.startsWith('|') && trimmed.endsWith('|') && !trimmed.startsWith('||'));
}

/**
 * 체크박스 행인지 확인
 * 형식: [ ] 미완료 항목  또는  [x] 완료 항목
 */
function isCheckboxLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('[ ] ') || trimmed.startsWith('[x] ') || trimmed.startsWith('[X] ');
}

/**
 * 체크박스 행들을 ADF taskList 노드로 변환
 */
function parseCheckboxLines(lines: string[]): ADFNode {
  let idCounter = 0;
  const items: ADFNode[] = lines.map(line => {
    const trimmed = line.trim();
    const isDone = trimmed.startsWith('[x] ') || trimmed.startsWith('[X] ');
    const text = trimmed.slice(4); // '[ ] ' 또는 '[x] ' 제거
    idCounter++;
    return {
      type: 'taskItem',
      attrs: {
        localId: `task-${Date.now()}-${idCounter}`,
        state: isDone ? 'DONE' : 'TODO',
      },
      content: text ? [{ type: 'text', text }] : [],
    };
  });

  return {
    type: 'taskList',
    attrs: { localId: `tasklist-${Date.now()}` },
    content: items,
  };
}

function isHorizontalRule(line: string): boolean {
  return /^[-*_]{3,}$/.test(line.trim());
}

function isBulletLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('- ') || trimmed.startsWith('* ');
}

function parseBulletLines(lines: string[]): ADFNode {
  const items: ADFNode[] = lines.map(line => {
    const text = line.trim().slice(2);
    return {
      type: 'listItem',
      content: [{
        type: 'paragraph',
        content: text ? [{ type: 'text', text }] : [],
      }],
    };
  });
  return {
    type: 'bulletList',
    content: items,
  };
}

/**
 * 평문 텍스트를 ADF (Atlassian Document Format)로 변환
 * 지원 마크업: 테이블, 체크박스, 구분선(---), 글머리 기호(- / *)
 *
 * @param text 평문 텍스트 (줄바꿈, 마크업 포함 가능)
 * @returns ADF JSON 객체
 */
export function textToADF(text: string): ADFNode | null {
  if (!text || text.trim() === '') {
    return null;
  }

  const lines = text.split('\n');
  const content: ADFNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // 체크박스 블록 감지
    if (isCheckboxLine(trimmedLine)) {
      const checkboxLines: string[] = [];
      while (i < lines.length) {
        const currentLine = lines[i].trim();
        if (isCheckboxLine(currentLine)) {
          checkboxLines.push(currentLine);
          i++;
        } else if (currentLine === '') {
          i++;
          break;
        } else {
          break;
        }
      }
      content.push(parseCheckboxLines(checkboxLines));
    }
    // 테이블 시작 감지
    else if (isTableLine(trimmedLine)) {
      const tableLines: string[] = [];
      while (i < lines.length) {
        const currentLine = lines[i].trim();
        if (isTableLine(currentLine)) {
          tableLines.push(currentLine);
          i++;
        } else if (currentLine === '') {
          i++;
          break;
        } else {
          break;
        }
      }

      const tableNode = parseTableMarkup(tableLines);
      if (tableNode) {
        content.push(tableNode);
      }
    }
    // 구분선 감지 (---, ***, ___)
    else if (isHorizontalRule(trimmedLine)) {
      content.push({ type: 'rule' });
      i++;
    }
    // 글머리 기호 블록 감지 (- item, * item)
    else if (isBulletLine(trimmedLine)) {
      const bulletLines: string[] = [];
      while (i < lines.length) {
        const currentLine = lines[i].trim();
        if (isBulletLine(currentLine)) {
          bulletLines.push(currentLine);
          i++;
        } else if (currentLine === '') {
          i++;
          break;
        } else {
          break;
        }
      }
      content.push(parseBulletLines(bulletLines));
    } else {
      // 일반 텍스트 (paragraph)
      content.push({
        type: 'paragraph',
        content: trimmedLine ? [{ type: 'text', text: line }] : [],
      });
      i++;
    }
  }

  // content가 비어있으면 null 반환
  if (content.length === 0) {
    return null;
  }

  return {
    type: 'doc',
    version: 1,
    content,
  };
}
