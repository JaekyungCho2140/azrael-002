/**
 * Google Apps Script 프로젝트의 메인 엔트리포인트 파일
 * - onOpen: 시트가 열릴 때 커스텀 메뉴 추가
 * - 향후 JIRA 연동, 데이터 처리 등 주요 함수가 추가될 예정
 */

/**
 * Google Sheets가 열릴 때 자동으로 실행되는 트리거 함수
 * Consolidated to show both JIRA and Calendar menus.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();

  // JIRA 일감 생성 메뉴와 하위 기능들을 추가
  ui.createMenu('JIRA 일감 생성')
    .addItem('JIRA 자격증명 입력', 'showJiraCredentialDialog')
    .addItem('JIRA 일감 자동 생성', 'createJiraIssues')
    .addSeparator()
    .addItem('권한 테스트 (UI 모드)', 'testJiraPermissionsWithUI')
    .addSeparator()
    .addItem('🔍 로그 확인', 'viewJiraLogs')
    .addItem('📄 로그 시트로 저장', 'exportJiraLogsToSheet')
    .addItem('🗑️ 로그 초기화', 'clearJiraLogs')
    .addSeparator()
    .addItem('도움말', 'showHelpDialog')
    .addToUi();

  // 자동 캘린더 메뉴 추가
  ui.createMenu('자동 캘린더')
    .addItem('GO!', 'visualizeCalendarFlow')
    .addItem('제거', 'removeVisualizerContents')
    .addToUi();
}

/**
 * JIRA API 자격증명을 안전하게 저장하는 함수
 * - PropertiesService.getUserProperties()를 사용
 * - email, apiToken을 저장
 * @param {string} email - JIRA 이메일
 * @param {string} apiToken - JIRA API 토큰
 * @returns {Object} { success: boolean, message: string }
 */
function saveJiraCredentials(email, apiToken) {
  try {
    var userProps = PropertiesService.getUserProperties();
    userProps.setProperty('JIRA_EMAIL', email);
    userProps.setProperty('JIRA_API_TOKEN', apiToken);
    return { success: true, message: '저장되었습니다!' };
  } catch (e) {
    // PERMISSION_DENIED 오류에 대한 명확한 안내
    if (e.message && e.message.indexOf('PERMISSION_DENIED') !== -1) {
      return {
        success: false,
        message: '권한 오류: Apps Script 권한 승인이 필요합니다.\n\n해결 방법:\n1. 확장 프로그램 → Apps Script 메뉴 열기\n2. saveJiraCredentials 함수 실행\n3. 권한 승인 완료 후 다시 시도'
      };
    }
    return { success: false, message: '저장 실패: ' + e.message };
  }
}

/**
 * 저장된 JIRA API 자격증명을 불러오는 함수
 * @returns {Object} { email, apiToken }
 */
function getJiraCredentials() {
  var userProps = PropertiesService.getUserProperties();
  return {
    email: userProps.getProperty('JIRA_EMAIL'),
    apiToken: userProps.getProperty('JIRA_API_TOKEN')
  };
}

/**
 * JIRA 자격증명 입력 UI를 표시하는 함수
 * - Google Sheets의 사이드바로 입력 폼 제공
 */
function showJiraCredentialDialog() {
  var html = HtmlService.createHtmlOutputFromFile('JiraCredentialForm')
    .setTitle('JIRA 자격증명 입력')
    .setWidth(350);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * 권한 테스트 함수 (매개변수 없이 실행 가능)
 * - PropertiesService 권한 확인용
 * - Apps Script 에디터에서 이 함수를 실행하여 권한 승인
 */
function testJiraPermissions() {
  try {
    // PropertiesService 접근 테스트
    var userProps = PropertiesService.getUserProperties();
    userProps.setProperty('TEST_PERMISSION', 'success');
    var testValue = userProps.getProperty('TEST_PERMISSION');

    // 테스트 속성 삭제
    userProps.deleteProperty('TEST_PERMISSION');

    // 성공 메시지 (로그만 사용)
    Logger.log('✅ 권한 테스트 성공!');
    Logger.log('PropertiesService 접근이 가능합니다.');
    Logger.log('이제 JIRA 자격증명을 저장할 수 있습니다.');

    return { success: true, message: '권한 테스트 성공' };
  } catch (e) {
    Logger.log('❌ 권한 테스트 실패: ' + e.message);
    Logger.log('권한 승인이 필요합니다.');

    return { success: false, message: e.message };
  }
}

/**
 * UI 모드 권한 테스트 함수 (Google Sheets 메뉴에서 실행)
 * - HTML 사이드바 컨텍스트에서의 권한 승인용
 */
function testJiraPermissionsWithUI() {
  try {
    // PropertiesService 접근 테스트
    var userProps = PropertiesService.getUserProperties();
    userProps.setProperty('TEST_PERMISSION', 'success');
    var testValue = userProps.getProperty('TEST_PERMISSION');

    // 테스트 속성 삭제
    userProps.deleteProperty('TEST_PERMISSION');

    // 성공 메시지
    SpreadsheetApp.getUi().alert(
      '✅ 권한 테스트 성공!\n\n' +
      'PropertiesService 접근이 가능합니다.\n' +
      '이제 JIRA 자격증명 입력 메뉴를 사용할 수 있습니다.'
    );
  } catch (e) {
    // 실패 메시지
    SpreadsheetApp.getUi().alert(
      '❌ 권한 오류\n\n' +
      e.message + '\n\n' +
      '이 메뉴를 다시 실행하여 권한을 승인해주세요.'
    );
  }
}

/**
 * JIRA 일감 자동 생성 기능 (시트명에 따라 작명 규칙/종속 구조/필드맵핑 분기)
 */
function createJiraIssues() {
  var ui = SpreadsheetApp.getUi();
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var sheetName = sheet.getName();
    var accountId = getJiraAccountId();
    var yyyymmdd = getBaseDateFromSheet(sheet); // YYYY-MM-DD
    var yymmdd = convertToYYMMDD(yyyymmdd);
    if (!yymmdd) throw '기준 날짜 형식이 올바르지 않습니다.';

    if (sheetName === 'L10NM4') {
      createJiraIssues_L10NM4(sheet, yymmdd, accountId);
    } else if (sheetName === 'L10NNC') {
      createJiraIssues_L10NNC(sheet, yymmdd, accountId);
    } else if (sheetName === 'L10NFB') {
      createJiraIssues_L10NFB(sheet, yymmdd, accountId);
    } else if (sheetName === 'L10NLY') {
      createJiraIssues_L10NLY(sheet, yymmdd, accountId);
    } else if (sheetName === 'L10N') {
      createJiraIssues_L10N(sheet, yymmdd, accountId);
    } else {
      ui.alert('지원하지 않는 시트입니다. (L10NM4, L10NNC, L10NFB, L10NLY, L10N만 지원)');
    }
  } catch (e) {
    showJiraErrorNotification(e.message ? e.message : e);
  }
}

// 공통: 시트에서 기준 날짜(YYYY-MM-DD) 읽기
function getBaseDateFromSheet(sheet) {
  // L10NM4: C1, L10NNC: C1, L10NFB: C1 (모두 동일)
  var value = sheet.getRange('C1').getValue();
  if (typeof value === 'string' && value.match(/\d{4}-\d{2}-\d{2}/)) return value;
  if (value instanceof Date) {
    var yyyy = value.getFullYear();
    var mm = ('0' + (value.getMonth() + 1)).slice(-2);
    var dd = ('0' + value.getDate()).slice(-2);
    return yyyy + '-' + mm + '-' + dd;
  }
  return null;
}

// ADF 변환 함수: 굵게, 이탤릭, 링크, 리스트, 테이블 지원
function toADFDescription(text) {
  if (typeof text !== 'string') {
    if (text === undefined || text === null) text = '';
    else if (typeof text === 'object') text = '';
    else text = String(text);
  }
  var lines = text.split('\n');
  var content = [];
  var i = 0;
  while (i < lines.length) {
    var line = lines[i].replace(/\r/g, '').trim();
    // 테이블
    if (line.startsWith('||')) {
      var tableRows = [];
      var headerLine = line;
      var headerCells = headerLine.split('||'); // 빈 셀도 포함
      // 첫 번째와 마지막이 빈 문자열일 수 있으니 제거
      if (headerCells[0] === '') headerCells.shift();
      if (headerCells[headerCells.length-1] === '') headerCells.pop();
      var headerRow = {
        type: 'tableRow',
        content: headerCells.map(cell => ({
          type: 'tableHeader',
          content: [{ type: 'paragraph', content: parseInlineMarks(cell.trim()) }]
        }))
      };
      tableRows.push(headerRow);
      i++;
      // 바디
      while (i < lines.length && lines[i].replace(/\r/g, '').trim().startsWith('|') && !lines[i].replace(/\r/g, '').trim().startsWith('||')) {
        var bodyLine = lines[i].replace(/\r/g, '').trim();
        var bodyCells = bodyLine.split('|'); // 빈 셀도 포함
        if (bodyCells[0] === '') bodyCells.shift();
        if (bodyCells[bodyCells.length-1] === '') bodyCells.pop();
        var bodyRow = {
          type: 'tableRow',
          content: bodyCells.map(cell => ({
            type: 'tableCell',
            content: [{ type: 'paragraph', content: parseInlineMarks(cell.trim()) }]
          }))
        };
        tableRows.push(bodyRow);
        i++;
      }
      content.push({
        type: 'table',
        content: tableRows // tableBody 래퍼 제거, tableRows를 직접 할당
      });
      continue;
    }
    // 순서 없는 리스트
    if (line.match(/^([-*]) /)) {
      var items = [];
      while (i < lines.length && lines[i].trim().match(/^([-*]) /)) {
        var itemText = lines[i].trim().replace(/^([-*]) /, '');
        items.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: parseInlineMarks(itemText)
          }]
        });
        i++;
      }
      content.push({
        type: 'bulletList',
        content: items
      });
      continue;
    }
    // 순서 있는 리스트
    if (line.match(/^\d+\. /)) {
      var items = [];
      while (i < lines.length && lines[i].trim().match(/^\d+\. /)) {
        var itemText = lines[i].trim().replace(/^\d+\. /, '');
        items.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: parseInlineMarks(itemText)
          }]
        });
        i++;
      }
      content.push({
        type: 'orderedList',
        content: items
      });
      continue;
    }
    // 일반 문단: 각 줄을 별도의 paragraph로 분리
    if (line === '') {
      content.push({ type: 'paragraph', content: [{ type: 'text', text: '' }] });
    } else {
      content.push({
        type: 'paragraph',
        content: parseInlineMarks(line)
      });
    }
    i++;
  }
  // table만 content에 존재하면 맨 앞에 빈 paragraph 추가
  if (
    content.length === 1 &&
    content[0].type === 'table'
  ) {
    content.unshift({ type: 'paragraph', content: [{ type: 'text', text: '' }] });
  }
  return {
    type: 'doc',
    version: 1,
    content: content
  };
}

// 인라인 마크업(굵게, 이탤릭, 링크) 변환
function parseInlineMarks(text) {
  if (!text) return [{ type: 'text', text: '' }];
  var result = [];
  var regex = /\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|_(.+?)_|\[(.+?)\]\((.+?)\)|([^*_\[]+)/g;
  var match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      // **굵게**
      result.push({ type: 'text', text: match[1], marks: [{ type: 'strong' }] });
    } else if (match[2]) {
      // *굵게*
      result.push({ type: 'text', text: match[2], marks: [{ type: 'strong' }] });
    } else if (match[3]) {
      // __이탤릭__
      result.push({ type: 'text', text: match[3], marks: [{ type: 'em' }] });
    } else if (match[4]) {
      // _이탤릭_
      result.push({ type: 'text', text: match[4], marks: [{ type: 'em' }] });
    } else if (match[5] && match[6]) {
      // [텍스트](url)
      result.push({
        type: 'text',
        text: match[5],
        marks: [{ type: 'link', attrs: { href: match[6] } }]
      });
    } else if (match[7]) {
      // 일반 텍스트
      result.push({ type: 'text', text: match[7] });
    }
  }
  // content가 비어있으면 빈 텍스트 노드라도 반환
  if (result.length === 0) {
    result.push({ type: 'text', text: '' });
  }
  return result;
}

/**
 * REGULAR, EXTRA0, EXTRA1 Task 설명에 포함할 3x3 테이블 생성 함수
 * - 헤더: 요청일, 요청자, 비고
 * - 빈 데이터 행 2개 추가
 * @returns {string} ADF 테이블을 위한 텍스트 형식
 */
function createTaskDescriptionTable() {
  var tableText = '||요청일||요청자||비고||\n';
  tableText += '| | | |\n';
  tableText += '| | | |';
  return tableText;
}

/**
 * JIRA Epic 생성에 필요한 payload 구조를 생성하는 함수
 * @param {string} projectKey - JIRA 프로젝트 키
 * @param {string} summary - Epic summary(예: 'YYMMDD 업데이트')
 * @param {string} startDate - 시작일(ISO8601)
 * @param {string} dueDate - 종료일(ISO8601)
 * @param {string} assignee - 담당자(옵션)
 * @param {string} reporter - 보고자(옵션)
 * @param {string} description - Epic description(옵션)
 * @returns {Object} JIRA Epic 생성용 payload
 */
function buildEpicPayload(projectKey, summary, startDate, dueDate, assignee, reporter, description) {
  // 날짜 형식 검증 추가
  debugDateTime(startDate, 'customfield_10569 (시작일)', summary);
  debugDateTime(dueDate, 'customfield_10570 (기한)', summary);
  
  var fields = {
    project: { key: projectKey },
    summary: summary,
    issuetype: { id: '10000' },
    customfield_10569: startDate,
    customfield_10570: dueDate,
    assignee: assignee ? { id: assignee } : undefined,
    reporter: reporter ? { id: reporter } : undefined
  };
  if (
    description &&
    description.content &&
    description.content.length > 0 &&
    // 모든 블록이 빈 paragraph만 있는 경우만 제외
    !description.content.every(
      p => p.type === 'paragraph' && (!p.content || p.content.every(t => !t.text || t.text.trim() === ''))
    )
  ) {
    fields.description = description;
  }
  return { fields: fields };
}

/**
 * JIRA Task 생성에 필요한 payload 구조를 생성하는 함수
 * @param {string} projectKey - JIRA 프로젝트 키
 * @param {string} summary - Task summary(예: 'YYMMDD REGULAR')
 * @param {string} epicKey - 상위 Epic 이슈 키
 * @param {string} startDate - 시작일(ISO8601)
 * @param {string} dueDate - 종료일(ISO8601)
 * @param {string} assignee - 담당자(옵션)
 * @param {string} reporter - 보고자(옵션)
 * @param {string} issueTypeId - 이슈 타입 ID(예: '10637')
 * @param {string} description - Task description(옵션)
 * @returns {Object} JIRA Task 생성용 payload
 */
function buildTaskPayload(projectKey, summary, epicKey, startDate, dueDate, assignee, reporter, issueTypeId, description) {
  // 날짜 형식 검증 추가
  debugDateTime(startDate, 'customfield_10569 (시작일)', summary);
  debugDateTime(dueDate, 'customfield_10570 (기한)', summary);
  
  var fields = {
    project: { key: projectKey },
    summary: summary,
    issuetype: { id: issueTypeId },
    customfield_10569: startDate,
    customfield_10570: dueDate,
    assignee: assignee ? { id: assignee } : undefined,
    reporter: reporter ? { id: reporter } : undefined,
    parent: epicKey ? { key: epicKey } : undefined
  };
  if (
    description &&
    description.content &&
    description.content.length > 0 &&
    // 모든 블록이 빈 paragraph만 있는 경우만 제외
    !description.content.every(
      p => p.type === 'paragraph' && (!p.content || p.content.every(t => !t.text || t.text.trim() === ''))
    )
  ) {
    fields.description = description;
  }
  return { fields: fields };
}

/**
 * JIRA Subtask 생성에 필요한 payload 구조를 생성하는 함수
 * @param {string} projectKey - JIRA 프로젝트 키
 * @param {string} summary - Subtask summary(예: 'YYMMDD REGULAR HO&HB')
 * @param {string} parentKey - 상위 Task 이슈 키
 * @param {string} startDate - 시작일(ISO8601)
 * @param {string} dueDate - 종료일(ISO8601)
 * @param {string} assignee - 담당자(옵션)
 * @param {string} reporter - 보고자(옵션)
 * @param {string} issueTypeId - Subtask 이슈 타입 ID(예: '10638')
 * @param {string} description - Subtask description(옵션)
 * @returns {Object} JIRA Subtask 생성용 payload
 */
function buildSubtaskPayload(projectKey, summary, parentKey, startDate, dueDate, assignee, reporter, issueTypeId, description) {
  // 날짜 형식 검증 추가
  debugDateTime(startDate, 'customfield_10569 (시작일)', summary);
  debugDateTime(dueDate, 'customfield_10570 (기한)', summary);
  
  var fields = {
    project: { key: projectKey },
    summary: summary,
    issuetype: { id: issueTypeId },
    customfield_10569: startDate,
    customfield_10570: dueDate,
    assignee: assignee ? { id: assignee } : undefined,
    reporter: reporter ? { id: reporter } : undefined,
    parent: { key: parentKey }
  };
  if (
    description &&
    description.content &&
    description.content.length > 0 &&
    // 모든 블록이 빈 paragraph만 있는 경우만 제외
    !description.content.every(
      p => p.type === 'paragraph' && (!p.content || p.content.every(t => !t.text || t.text.trim() === ''))
    )
  ) {
    fields.description = description;
  }
  return { fields: fields };
}

/**
 * JIRA에 Epic/Task/Subtask를 생성하는 함수 (공통)
 * @param {Object} payload - buildEpicPayload/buildTaskPayload/buildSubtaskPayload로 생성한 payload
 * @returns {Object} JIRA API 응답(성공 시 이슈 정보)
 * @throws {Error} 생성 실패 시 에러
 */
function createEpicInJira(payload) {
  var endpoint = '/rest/api/3/issue';
  try {
    var res = jiraApiRequest(endpoint, 'POST', payload, null);
    jiraLog('info', '이슈 생성 성공: ' + (res && res.key ? res.key : JSON.stringify(res)));
    return res;
  } catch (e) {
    jiraLog('error', '이슈 생성 실패: ' + e.message);
    throw new Error('이슈 생성 실패: ' + e.message);
  }
}

/**
 * JIRA API 요청을 재시도하며, 에러 발생 시 의미 있는 메시지와 함께 로그를 남김
 * @param {string} endpoint
 * @param {string} method
 * @param {Object} [payload]
 * @param {Object} [headers]
 * @param {number} [retry] - 재시도 횟수(기본 1회)
 * @returns {Object}
 */
function jiraApiRequestWithRetry(endpoint, method, payload, headers, retry) {
  retry = retry || 1;
  for (var i = 0; i <= retry; i++) {
    try {
      return jiraApiRequest(endpoint, method, payload, headers);
    } catch (e) {
      jiraLog('error', 'API 요청 실패(' + endpoint + '): ' + e.message);
      if (i === retry) {
        throw new Error('JIRA API 요청 실패: ' + e.message);
      }
      Utilities.sleep(1000); // 1초 대기 후 재시도
    }
  }
}

// L10NM4 자동 생성 로직 (기존 구조 개선)
function createJiraIssues_L10NM4(sheet, yymmdd, accountId) {
  var ui = SpreadsheetApp.getUi();
  var createdIssues = [];
  // 1. Epic 생성
  var epicSummary = yymmdd + ' 업데이트';
  var epicStart = parseDateWithTime(sheet.getRange('C2').getValue(), yymmdd, '09:30');
  var epicDue = parseAndConvertDateTime(sheet.getRange('D9').getValue(), Number('20' + yymmdd.slice(0,2)));
  var epicPayload = buildEpicPayload(sheet.getName(), epicSummary, epicStart, epicDue, accountId, accountId, '');
  var epicRes = createEpicInJira(epicPayload);
  if (!epicRes || !epicRes.key) throw 'Epic 생성 실패';
  createdIssues.push({key: epicRes.key, summary: epicSummary});
  var epicKey = storeEpicId(epicRes, false); // 알림 X

  // 2. 일정 헤즈업 Task
  var t1Summary = yymmdd + ' 업데이트 일정 헤즈업';
  var t1Start = parseDateWithTime(sheet.getRange('C2').getValue(), yymmdd, '09:30');
  var t1Due = parseDateWithTime(sheet.getRange('C2').getValue(), yymmdd, '18:30');
  var t1Payload = buildTaskPayload(sheet.getName(), t1Summary, epicKey, t1Start, t1Due, accountId, accountId, '10637', '');
  var t1Res = createEpicInJira(t1Payload);
  if (!t1Res || !t1Res.key) throw '일정 헤즈업 Task 생성 실패';
  createdIssues.push({key: t1Res.key, summary: t1Summary});

  // 3. REGULAR Task 및 Subtasks
  var t2Summary = yymmdd + ' 업데이트 REGULAR';
  var t2Start = parseAndConvertDateTime(sheet.getRange('C7').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t2Due = parseAndConvertDateTime(sheet.getRange('D7').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t2Payload = buildTaskPayload(sheet.getName(), t2Summary, epicKey, t2Start, t2Due, accountId, accountId, '10637', toADFDescription(createTaskDescriptionTable()));
  var t2Res = createEpicInJira(t2Payload);
  if (!t2Res || !t2Res.key) throw 'REGULAR Task 생성 실패';
  createdIssues.push({key: t2Res.key, summary: t2Summary});
  // REGULAR Subtasks
  createSubtask_L10NM4(sheet, yymmdd, t2Res.key, accountId, 'REGULAR', createdIssues, '');

  // 4. EXTRA0 Task 및 Subtasks
  var t3Summary = yymmdd + ' 업데이트 EXTRA0';
  var t3Start = parseAndConvertDateTime(sheet.getRange('C8').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t3Due = parseAndConvertDateTime(sheet.getRange('D8').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t3Payload = buildTaskPayload(sheet.getName(), t3Summary, epicKey, t3Start, t3Due, accountId, accountId, '10637', toADFDescription(createTaskDescriptionTable()));
  var t3Res = createEpicInJira(t3Payload);
  if (!t3Res || !t3Res.key) throw 'EXTRA0 Task 생성 실패';
  createdIssues.push({key: t3Res.key, summary: t3Summary});
  createSubtask_L10NM4(sheet, yymmdd, t3Res.key, accountId, 'EXTRA0', createdIssues, '');

  // 5. EXTRA1 Task 및 Subtasks
  var t4Summary = yymmdd + ' 업데이트 EXTRA1';
  var t4Start = parseAndConvertDateTime(sheet.getRange('C9').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t4Due = parseAndConvertDateTime(sheet.getRange('D9').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t4Payload = buildTaskPayload(sheet.getName(), t4Summary, epicKey, t4Start, t4Due, accountId, accountId, '10637', toADFDescription(createTaskDescriptionTable()));
  var t4Res = createEpicInJira(t4Payload);
  if (!t4Res || !t4Res.key) throw 'EXTRA1 Task 생성 실패';
  createdIssues.push({key: t4Res.key, summary: t4Summary});
  createSubtask_L10NM4(sheet, yymmdd, t4Res.key, accountId, 'EXTRA1', createdIssues, '');

  // 모든 생성 완료 후 한 번만 알림
  showAllIssuesCreatedNotification(createdIssues);
}

function createSubtask_L10NM4(sheet, yymmdd, parentKey, accountId, type, createdIssues, description) {
  var year = Number('20' + yymmdd.slice(0,2));
  if (type === 'REGULAR') {
    // HO&HB
    var s1Summary = yymmdd + ' 업데이트 REGULAR HO&HB';
    var s1Start = parseAndConvertDateTime(sheet.getRange('C16').getValue(), year);
    var s1Due = parseAndConvertDateTime(sheet.getRange('D16').getValue(), year);
    var s1Payload = buildSubtaskPayload(sheet.getName(), s1Summary, parentKey, s1Start, s1Due, accountId, accountId, '10638', description);
    var s1Res = createEpicInJira(s1Payload);
    if (s1Res && s1Res.key) createdIssues.push({key: s1Res.key, summary: s1Summary});
    // DELIVERY
    var s2Summary = yymmdd + ' 업데이트 REGULAR DELIVERY';
    var s2Start = parseAndConvertDateTime(sheet.getRange('D7').getValue(), year);
    var s2Due = parseAndConvertDateTime(sheet.getRange('D7').getValue(), year);
    var s2Payload = buildSubtaskPayload(sheet.getName(), s2Summary, parentKey, s2Start, s2Due, accountId, accountId, '10638', description);
    var s2Res = createEpicInJira(s2Payload);
    if (s2Res && s2Res.key) createdIssues.push({key: s2Res.key, summary: s2Summary});
  } else if (type === 'EXTRA0') {
    // HO&HB
    var s1Summary = yymmdd + ' 업데이트 EXTRA0 HO&HB';
    var s1Start = parseAndConvertDateTime(sheet.getRange('C17').getValue(), year);
    var s1Due = parseAndConvertDateTime(sheet.getRange('D17').getValue(), year);
    var s1Payload = buildSubtaskPayload(sheet.getName(), s1Summary, parentKey, s1Start, s1Due, accountId, accountId, '10638', description);
    var s1Res = createEpicInJira(s1Payload);
    if (s1Res && s1Res.key) createdIssues.push({key: s1Res.key, summary: s1Summary});
    // DELIVERY
    var s2Summary = yymmdd + ' 업데이트 EXTRA0 DELIVERY';
    var s2Start = parseAndConvertDateTime(sheet.getRange('D8').getValue(), year);
    var s2Due = parseAndConvertDateTime(sheet.getRange('D8').getValue(), year);
    var s2Payload = buildSubtaskPayload(sheet.getName(), s2Summary, parentKey, s2Start, s2Due, accountId, accountId, '10638', description);
    var s2Res = createEpicInJira(s2Payload);
    if (s2Res && s2Res.key) createdIssues.push({key: s2Res.key, summary: s2Summary});
  } else if (type === 'EXTRA1') {
    // HO&HB
    var s1Summary = yymmdd + ' 업데이트 EXTRA1 HO&HB';
    var s1Start = parseAndConvertDateTime(sheet.getRange('C18').getValue(), year);
    var s1Due = parseAndConvertDateTime(sheet.getRange('D18').getValue(), year);
    var s1Payload = buildSubtaskPayload(sheet.getName(), s1Summary, parentKey, s1Start, s1Due, accountId, accountId, '10638', description);
    var s1Res = createEpicInJira(s1Payload);
    if (s1Res && s1Res.key) createdIssues.push({key: s1Res.key, summary: s1Summary});
    // DELIVERY
    var s2Summary = yymmdd + ' 업데이트 EXTRA1 DELIVERY';
    var s2Start = parseAndConvertDateTime(sheet.getRange('D9').getValue(), year);
    var s2Due = parseAndConvertDateTime(sheet.getRange('D9').getValue(), year);
    var s2Payload = buildSubtaskPayload(sheet.getName(), s2Summary, parentKey, s2Start, s2Due, accountId, accountId, '10638', description);
    var s2Res = createEpicInJira(s2Payload);
    if (s2Res && s2Res.key) createdIssues.push({key: s2Res.key, summary: s2Summary});
  }
}

// 모든 생성 완료 후 한 번만 알림
function showAllIssuesCreatedNotification(issues) {
  var ui = SpreadsheetApp.getUi();
  var msg = '모든 JIRA 일감이 성공적으로 생성되었습니다.\n\n';
  msg += '생성된 일감 목록 (' + issues.length + '개):\n';
  issues.forEach(function(issue, idx) {
    msg += (idx+1) + '. [' + issue.key + '] ' + issue.summary + '\n';
    msg += '   링크: https://wemade.atlassian.net/browse/' + issue.key + '\n';
  });
  ui.alert(msg);
}

// 날짜+시간 조합 (예: 05/21(수) + 09:30 → 2025-05-21T09:30:00.000+0900)
function parseDateWithTime(dateStr, yymmdd, timeStr) {
  // dateStr: MM/DD(요일) 또는 YYYY-MM-DD
  var year = Number('20' + yymmdd.slice(0,2));
  var mm, dd;
  var match = dateStr.match(/^(\d{1,2})\/(\d{1,2})/);
  if (match) {
    mm = match[1];
    dd = match[2];
  } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    var parts = dateStr.split('-');
    year = Number(parts[0]);
    mm = parts[1];
    dd = parts[2];
  } else {
    return '';
  }
  // timeStr: HH:mm
  var tMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  var hh = tMatch ? ('0' + tMatch[1]).slice(-2) : '00';
  var min = tMatch ? ('0' + tMatch[2]).slice(-2) : '00';
  // ISO 8601 포맷 (JIRA 요구)
  var yyyy = year;
  var MM = ('0' + mm).slice(-2);
  var DD = ('0' + dd).slice(-2);
  var HH = hh;
  var MIN = min;
  var SS = '00';
  var SSS = '000';
  var offsetStr = '+0900';
  return `${yyyy}-${MM}-${DD}T${HH}:${MIN}:${SS}.${SSS}${offsetStr}`;
}

// L10NNC 자동 생성 로직
function createJiraIssues_L10NNC(sheet, yymmdd, accountId) {
  var ui = SpreadsheetApp.getUi();
  var createdIssues = [];
  var milestone = sheet.getRange('G2').getValue();
  // 1. Epic 생성
  var epicSummary = `${yymmdd} ${milestone} 업데이트`;
  var epicStart = safeParseDateWithTime(sheet.getRange('C2').getValue(), yymmdd, '09:30');
  var epicDue = safeParseAndConvertDateTime(sheet.getRange('D7').getValue(), Number('20' + yymmdd.slice(0,2)));
  var epicPayload = buildEpicPayload(sheet.getName(), epicSummary, epicStart, epicDue, accountId, accountId, '');
  var epicRes = createEpicInJira(epicPayload);
  if (!epicRes || !epicRes.key) throw 'Epic 생성 실패';
  createdIssues.push({key: epicRes.key, summary: epicSummary});
  var epicKey = storeEpicId(epicRes, false); // 알림 X

  // 2. 일정 헤즈업 Task
  var t1Summary = `${yymmdd} ${milestone} 업데이트 일정 헤즈업`;
  var t1Start = safeParseDateWithTime(sheet.getRange('C2').getValue(), yymmdd, '09:30');
  var t1Due = safeParseDateWithTime(sheet.getRange('C2').getValue(), yymmdd, '18:30');
  var t1Payload = buildTaskPayload(sheet.getName(), t1Summary, epicKey, t1Start, t1Due, accountId, accountId, '10637', '');
  var t1Res = createEpicInJira(t1Payload);
  if (!t1Res || !t1Res.key) throw '일정 헤즈업 Task 생성 실패';
  createdIssues.push({key: t1Res.key, summary: t1Summary});

  // 3. REGULAR Task 및 Subtasks
  var t2Summary = `${yymmdd} ${milestone} 업데이트 REGULAR`;
  var t2Start = safeParseAndConvertDateTime(sheet.getRange('C6').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t2Due = safeParseAndConvertDateTime(sheet.getRange('D6').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t2Payload = buildTaskPayload(sheet.getName(), t2Summary, epicKey, t2Start, t2Due, accountId, accountId, '10637', toADFDescription(createTaskDescriptionTable()));
  var t2Res = createEpicInJira(t2Payload);
  if (!t2Res || !t2Res.key) throw 'REGULAR Task 생성 실패';
  createdIssues.push({key: t2Res.key, summary: t2Summary});
  createSubtask_L10NNC(sheet, yymmdd, t2Res.key, accountId, 'REGULAR', createdIssues, milestone, '');

  // 4. EXTRA0 Task 및 Subtasks
  var t3Summary = `${yymmdd} ${milestone} 업데이트 EXTRA0`;
  var t3Start = safeParseAndConvertDateTime(sheet.getRange('C7').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t3Due = safeParseAndConvertDateTime(sheet.getRange('D7').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t3Payload = buildTaskPayload(sheet.getName(), t3Summary, epicKey, t3Start, t3Due, accountId, accountId, '10637', toADFDescription(createTaskDescriptionTable()));
  var t3Res = createEpicInJira(t3Payload);
  if (!t3Res || !t3Res.key) throw 'EXTRA0 Task 생성 실패';
  createdIssues.push({key: t3Res.key, summary: t3Summary});
  createSubtask_L10NNC(sheet, yymmdd, t3Res.key, accountId, 'EXTRA0', createdIssues, milestone, '');


  showAllIssuesCreatedNotification(createdIssues);
}

function createSubtask_L10NNC(sheet, yymmdd, parentKey, accountId, type, createdIssues, milestone, description) {
  var year = Number('20' + yymmdd.slice(0,2));
  if (type === 'REGULAR') {
    // HO&HB
    var s1Summary = `${yymmdd} ${milestone} 업데이트 REGULAR HO&HB`;
    var s1Start = safeParseAndConvertDateTime(sheet.getRange('C13').getValue(), year);
    var s1Due = safeParseAndConvertDateTime(sheet.getRange('D13').getValue(), year);
    var s1Payload = buildSubtaskPayload(sheet.getName(), s1Summary, parentKey, s1Start, s1Due, accountId, accountId, '10638', description);
    var s1Res = createEpicInJira(s1Payload);
    if (s1Res && s1Res.key) createdIssues.push({key: s1Res.key, summary: s1Summary});
    // EN 검수 HO&HB
    var s3Summary = `${yymmdd} ${milestone} 업데이트 REGULAR EN 검수 HO&HB`;
    var s3Start = safeParseAndConvertDateTime(sheet.getRange('C18').getValue(), year);
    var s3Due = safeParseAndConvertDateTime(sheet.getRange('D18').getValue(), year);
    var s3Payload = buildSubtaskPayload(sheet.getName(), s3Summary, parentKey, s3Start, s3Due, accountId, accountId, '10638', description);
    var s3Res = createEpicInJira(s3Payload);
    if (s3Res && s3Res.key) createdIssues.push({key: s3Res.key, summary: s3Summary});
    // DELIVERY
    var s2Summary = `${yymmdd} ${milestone} 업데이트 REGULAR DELIVERY`;
    var s2Start = safeParseAndConvertDateTime(sheet.getRange('D6').getValue(), year);
    var s2Due = safeParseAndConvertDateTime(sheet.getRange('D6').getValue(), year);
    var s2Payload = buildSubtaskPayload(sheet.getName(), s2Summary, parentKey, s2Start, s2Due, accountId, accountId, '10638', description);
    var s2Res = createEpicInJira(s2Payload);
    if (s2Res && s2Res.key) createdIssues.push({key: s2Res.key, summary: s2Summary});
  } else if (type === 'EXTRA0') {
    // HO&HB
    var s1Summary = `${yymmdd} ${milestone} 업데이트 EXTRA0 HO&HB`;
    var s1Start = safeParseAndConvertDateTime(sheet.getRange('C14').getValue(), year);
    var s1Due = safeParseAndConvertDateTime(sheet.getRange('D14').getValue(), year);
    var s1Payload = buildSubtaskPayload(sheet.getName(), s1Summary, parentKey, s1Start, s1Due, accountId, accountId, '10638', description);
    var s1Res = createEpicInJira(s1Payload);
    if (s1Res && s1Res.key) createdIssues.push({key: s1Res.key, summary: s1Summary});
    // EN 검수 HO&HB
    var s3Summary = `${yymmdd} ${milestone} 업데이트 EXTRA0 EN 검수 HO&HB`;
    var s3Start = safeParseAndConvertDateTime(sheet.getRange('C19').getValue(), year);
    var s3Due = safeParseAndConvertDateTime(sheet.getRange('D19').getValue(), year);
    var s3Payload = buildSubtaskPayload(sheet.getName(), s3Summary, parentKey, s3Start, s3Due, accountId, accountId, '10638', description);
    var s3Res = createEpicInJira(s3Payload);
    if (s3Res && s3Res.key) createdIssues.push({key: s3Res.key, summary: s3Summary});
    // DELIVERY
    var s2Summary = `${yymmdd} ${milestone} 업데이트 EXTRA0 DELIVERY`;
    var s2Start = safeParseAndConvertDateTime(sheet.getRange('D7').getValue(), year);
    var s2Due = safeParseAndConvertDateTime(sheet.getRange('D7').getValue(), year);
    var s2Payload = buildSubtaskPayload(sheet.getName(), s2Summary, parentKey, s2Start, s2Due, accountId, accountId, '10638', description);
    var s2Res = createEpicInJira(s2Payload);
    if (s2Res && s2Res.key) createdIssues.push({key: s2Res.key, summary: s2Summary});
  } else if (type === 'EXTRA1') {
    // HO&HB
    var s1Summary = `${yymmdd} ${milestone} 업데이트 EXTRA1 HO&HB`;
    var s1Start = safeParseAndConvertDateTime(sheet.getRange('C18').getValue(), year);
    var s1Due = safeParseAndConvertDateTime(sheet.getRange('D18').getValue(), year);
    var s1Payload = buildSubtaskPayload(sheet.getName(), s1Summary, parentKey, s1Start, s1Due, accountId, accountId, '10638', description);
    var s1Res = createEpicInJira(s1Payload);
    if (s1Res && s1Res.key) createdIssues.push({key: s1Res.key, summary: s1Summary});
    // DELIVERY
    var s2Summary = `${yymmdd} ${milestone} 업데이트 EXTRA1 DELIVERY`;
    var s2Start = safeParseAndConvertDateTime(sheet.getRange('D9').getValue(), year);
    var s2Due = safeParseAndConvertDateTime(sheet.getRange('D9').getValue(), year);
    var s2Payload = buildSubtaskPayload(sheet.getName(), s2Summary, parentKey, s2Start, s2Due, accountId, accountId, '10638', description);
    var s2Res = createEpicInJira(s2Payload);
    if (s2Res && s2Res.key) createdIssues.push({key: s2Res.key, summary: s2Summary});
  }
}

// L10NLY 자동 생성 로직
function createJiraIssues_L10NLY(sheet, yymmdd, accountId) {
  var ui = SpreadsheetApp.getUi();
  var createdIssues = [];
  // 1. Epic 생성
  var epicSummary = `${yymmdd} 업데이트`;
  var epicStart = safeParseDateWithTime(sheet.getRange('C2').getValue(), yymmdd, '09:30');
  var epicDue = safeParseAndConvertDateTime(sheet.getRange('D9').getValue(), Number('20' + yymmdd.slice(0,2)));
  var epicPayload = buildEpicPayload(sheet.getName(), epicSummary, epicStart, epicDue, accountId, accountId, '');
  var epicRes = createEpicInJira(epicPayload);
  if (!epicRes || !epicRes.key) throw 'Epic 생성 실패';
  createdIssues.push({key: epicRes.key, summary: epicSummary});
  var epicKey = storeEpicId(epicRes, false); // 알림 X

  // 2. 일정 헤즈업 Task
  var t1Summary = `${yymmdd} 업데이트 일정 헤즈업`;
  var t1Start = safeParseDateWithTime(sheet.getRange('C2').getValue(), yymmdd, '09:30');
  var t1Due = safeParseDateWithTime(sheet.getRange('C2').getValue(), yymmdd, '18:30');
  var t1Payload = buildTaskPayload(sheet.getName(), t1Summary, epicKey, t1Start, t1Due, accountId, accountId, '10637', '');
  var t1Res = createEpicInJira(t1Payload);
  if (!t1Res || !t1Res.key) throw '일정 헤즈업 Task 생성 실패';
  createdIssues.push({key: t1Res.key, summary: t1Summary});

  // 3. REGULAR Task 및 Subtasks
  var t2Summary = `${yymmdd} 업데이트 REGULAR`;
  var t2Start = safeParseAndConvertDateTime(sheet.getRange('C6').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t2Due = safeParseAndConvertDateTime(sheet.getRange('D6').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t2Payload = buildTaskPayload(sheet.getName(), t2Summary, epicKey, t2Start, t2Due, accountId, accountId, '10637', toADFDescription(createTaskDescriptionTable()));
  var t2Res = createEpicInJira(t2Payload);
  if (!t2Res || !t2Res.key) throw 'REGULAR Task 생성 실패';
  createdIssues.push({key: t2Res.key, summary: t2Summary});
  createSubtask_L10NLY(sheet, yymmdd, t2Res.key, accountId, 'REGULAR', createdIssues, '');

  // 4. EXTRA0 Task 및 Subtasks
  var t3Summary = `${yymmdd} 업데이트 EXTRA0`;
  var t3Start = safeParseAndConvertDateTime(sheet.getRange('C7').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t3Due = safeParseAndConvertDateTime(sheet.getRange('D7').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t3Payload = buildTaskPayload(sheet.getName(), t3Summary, epicKey, t3Start, t3Due, accountId, accountId, '10637', toADFDescription(createTaskDescriptionTable()));
  var t3Res = createEpicInJira(t3Payload);
  if (!t3Res || !t3Res.key) throw 'EXTRA0 Task 생성 실패';
  createdIssues.push({key: t3Res.key, summary: t3Summary});
  createSubtask_L10NLY(sheet, yymmdd, t3Res.key, accountId, 'EXTRA0', createdIssues, '');

  // 5. EXTRA1 Task 및 Subtasks
  var t4Summary = `${yymmdd} 업데이트 EXTRA1`;
  var t4Start = safeParseAndConvertDateTime(sheet.getRange('C9').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t4Due = safeParseAndConvertDateTime(sheet.getRange('D9').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t4Payload = buildTaskPayload(sheet.getName(), t4Summary, epicKey, t4Start, t4Due, accountId, accountId, '10637', toADFDescription(createTaskDescriptionTable()));
  var t4Res = createEpicInJira(t4Payload);
  if (!t4Res || !t4Res.key) throw 'EXTRA1 Task 생성 실패';
  createdIssues.push({key: t4Res.key, summary: t4Summary});
  createSubtask_L10NLY(sheet, yymmdd, t4Res.key, accountId, 'EXTRA1', createdIssues, '');

  // 6. Ingame EN REV Task 및 Subtasks
  var t5Summary = `${yymmdd} 업데이트 Ingame EN REV`;
  var t5Start = safeParseAndConvertDateTime(sheet.getRange('C31').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t5Due = safeParseAndConvertDateTime(sheet.getRange('D31').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t5Payload = buildTaskPayload(sheet.getName(), t5Summary, epicKey, t5Start, t5Due, accountId, accountId, '10637', '');
  var t5Res = createEpicInJira(t5Payload);
  if (!t5Res || !t5Res.key) throw 'Ingame EN REV Task 생성 실패';
  createdIssues.push({key: t5Res.key, summary: t5Summary});
  createSubtask_L10NLY_IngameENREV(sheet, yymmdd, t5Res.key, accountId, createdIssues);

  showAllIssuesCreatedNotification(createdIssues);
}

function createSubtask_L10NLY(sheet, yymmdd, parentKey, accountId, type, createdIssues, description) {
  var year = Number('20' + yymmdd.slice(0,2));
  if (type === 'REGULAR') {
    // HO&HB
    var s1Summary = `${yymmdd} 업데이트 REGULAR HO&HB`;
    var s1Start = safeParseAndConvertDateTime(sheet.getRange('C17').getValue(), year);
    var s1Due = safeParseAndConvertDateTime(sheet.getRange('D17').getValue(), year);
    var s1Payload = buildSubtaskPayload(sheet.getName(), s1Summary, parentKey, s1Start, s1Due, accountId, accountId, '10638', description);
    var s1Res = createEpicInJira(s1Payload);
    if (s1Res && s1Res.key) createdIssues.push({key: s1Res.key, summary: s1Summary});
    // DELIVERY
    var s2Summary = `${yymmdd} 업데이트 REGULAR DELIVERY`;
    var s2Start = safeParseAndConvertDateTime(sheet.getRange('D6').getValue(), year);
    var s2Due = safeParseAndConvertDateTime(sheet.getRange('D6').getValue(), year);
    var s2Payload = buildSubtaskPayload(sheet.getName(), s2Summary, parentKey, s2Start, s2Due, accountId, accountId, '10638', description);
    var s2Res = createEpicInJira(s2Payload);
    if (s2Res && s2Res.key) createdIssues.push({key: s2Res.key, summary: s2Summary});
  } else if (type === 'EXTRA0') {
    // HO&HB
    var s1Summary = `${yymmdd} 업데이트 EXTRA0 HO&HB`;
    var s1Start = safeParseAndConvertDateTime(sheet.getRange('C18').getValue(), year);
    var s1Due = safeParseAndConvertDateTime(sheet.getRange('D18').getValue(), year);
    var s1Payload = buildSubtaskPayload(sheet.getName(), s1Summary, parentKey, s1Start, s1Due, accountId, accountId, '10638', description);
    var s1Res = createEpicInJira(s1Payload);
    if (s1Res && s1Res.key) createdIssues.push({key: s1Res.key, summary: s1Summary});
    // EN 검수 HO&HB
    var s3Summary = `${yymmdd} 업데이트 EXTRA0 EN 검수 HO&HB`;
    var s3Start = safeParseAndConvertDateTime(sheet.getRange('C23').getValue(), year);
    var s3Due = safeParseAndConvertDateTime(sheet.getRange('D23').getValue(), year);
    var s3Payload = buildSubtaskPayload(sheet.getName(), s3Summary, parentKey, s3Start, s3Due, accountId, accountId, '10638', description);
    var s3Res = createEpicInJira(s3Payload);
    if (s3Res && s3Res.key) createdIssues.push({key: s3Res.key, summary: s3Summary});
    // DELIVERY
    var s2Summary = `${yymmdd} 업데이트 EXTRA0 DELIVERY`;
    var s2Start = safeParseAndConvertDateTime(sheet.getRange('D7').getValue(), year);
    var s2Due = safeParseAndConvertDateTime(sheet.getRange('D7').getValue(), year);
    var s2Payload = buildSubtaskPayload(sheet.getName(), s2Summary, parentKey, s2Start, s2Due, accountId, accountId, '10638', description);
    var s2Res = createEpicInJira(s2Payload);
    if (s2Res && s2Res.key) createdIssues.push({key: s2Res.key, summary: s2Summary});
  } else if (type === 'EXTRA1') {
    // HO&HB
    var s1Summary = `${yymmdd} 업데이트 EXTRA1 HO&HB`;
    var s1Start = safeParseAndConvertDateTime(sheet.getRange('C19').getValue(), year);
    var s1Due = safeParseAndConvertDateTime(sheet.getRange('D19').getValue(), year);
    var s1Payload = buildSubtaskPayload(sheet.getName(), s1Summary, parentKey, s1Start, s1Due, accountId, accountId, '10638', description);
    var s1Res = createEpicInJira(s1Payload);
    if (s1Res && s1Res.key) createdIssues.push({key: s1Res.key, summary: s1Summary});
    // DELIVERY
    var s2Summary = `${yymmdd} 업데이트 EXTRA1 DELIVERY`;
    var s2Start = safeParseAndConvertDateTime(sheet.getRange('D9').getValue(), year);
    var s2Due = safeParseAndConvertDateTime(sheet.getRange('D9').getValue(), year);
    var s2Payload = buildSubtaskPayload(sheet.getName(), s2Summary, parentKey, s2Start, s2Due, accountId, accountId, '10638', description);
    var s2Res = createEpicInJira(s2Payload);
    if (s2Res && s2Res.key) createdIssues.push({key: s2Res.key, summary: s2Summary});
  }
}

// L10NLY Ingame EN REV Subtask 생성 로직
function createSubtask_L10NLY_IngameENREV(sheet, yymmdd, parentKey, accountId, createdIssues) {
  var year = Number('20' + yymmdd.slice(0,2));
  
  // 1. Ingame EN REV HO&HB
  var s1Summary = `${yymmdd} 업데이트 Ingame EN REV HO&HB`;
  var s1Start = safeParseAndConvertDateTime(sheet.getRange('C24').getValue(), year);
  var s1Due = safeParseAndConvertDateTime(sheet.getRange('D24').getValue(), year);
  var s1Payload = buildSubtaskPayload(sheet.getName(), s1Summary, parentKey, s1Start, s1Due, accountId, accountId, '10638', '');
  var s1Res = createEpicInJira(s1Payload);
  if (s1Res && s1Res.key) createdIssues.push({key: s1Res.key, summary: s1Summary});
  
  // 2. Ingame EN REV 수정 스트링 취합 (HO&HB 없음)
  var s2Summary = `${yymmdd} 업데이트 Ingame EN REV 수정 스트링 취합`;
  var s2Start = safeParseAndConvertDateTime(sheet.getRange('C25').getValue(), year);
  var s2Due = safeParseAndConvertDateTime(sheet.getRange('D25').getValue(), year);
  var s2Payload = buildSubtaskPayload(sheet.getName(), s2Summary, parentKey, s2Start, s2Due, accountId, accountId, '10638', '');
  var s2Res = createEpicInJira(s2Payload);
  if (s2Res && s2Res.key) createdIssues.push({key: s2Res.key, summary: s2Summary});
}

// L10NFB 자동 생성 로직
function createJiraIssues_L10NFB(sheet, yymmdd, accountId) {
  var ui = SpreadsheetApp.getUi();
  var createdIssues = [];
  var region = sheet.getRange('G2').getValue();
  var updateType = sheet.getRange('C2').getValue();
  // 1. Epic 생성
  var epicSummary = `${region} ${yymmdd} 업데이트 (${updateType})`;
  var epicStart = safeParseDateWithTime(sheet.getRange('C3').getValue(), yymmdd, '09:30');
  var epicDue = safeParseAndConvertDateTime(sheet.getRange('D9').getValue(), Number('20' + yymmdd.slice(0,2)));
  var epicPayload = buildEpicPayload(sheet.getName(), epicSummary, epicStart, epicDue, accountId, accountId, '');
  var epicRes = createEpicInJira(epicPayload);
  if (!epicRes || !epicRes.key) throw 'Epic 생성 실패';
  createdIssues.push({key: epicRes.key, summary: epicSummary});
  var epicKey = storeEpicId(epicRes, false); // 알림 X

  // 2. 일정 헤즈업 Task
  var t1Summary = `${region} ${yymmdd} 업데이트 (${updateType}) 일정 헤즈업`;
  var t1Start = safeParseDateWithTime(sheet.getRange('C3').getValue(), yymmdd, '09:30');
  var t1Due = safeParseDateWithTime(sheet.getRange('C3').getValue(), yymmdd, '18:30');
  var t1Payload = buildTaskPayload(sheet.getName(), t1Summary, epicKey, t1Start, t1Due, accountId, accountId, '10637', '');
  var t1Res = createEpicInJira(t1Payload);
  if (!t1Res || !t1Res.key) throw '일정 헤즈업 Task 생성 실패';
  createdIssues.push({key: t1Res.key, summary: t1Summary});

  // 3. REGULAR Task 및 Subtasks
  var t2Summary = `${region} ${yymmdd} 업데이트 (${updateType}) REGULAR`;
  var t2Start = safeParseAndConvertDateTime(sheet.getRange('C7').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t2Due = safeParseAndConvertDateTime(sheet.getRange('D7').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t2Payload = buildTaskPayload(sheet.getName(), t2Summary, epicKey, t2Start, t2Due, accountId, accountId, '10637', toADFDescription(createTaskDescriptionTable()));
  var t2Res = createEpicInJira(t2Payload);
  if (!t2Res || !t2Res.key) throw 'REGULAR Task 생성 실패';
  createdIssues.push({key: t2Res.key, summary: t2Summary});
  createSubtask_L10NFB(sheet, yymmdd, t2Res.key, accountId, 'REGULAR', createdIssues, region, updateType, '');

  // 4. EXTRA0 Task 및 Subtasks
  var t3Summary = `${region} ${yymmdd} 업데이트 (${updateType}) EXTRA0`;
  var t3Start = safeParseAndConvertDateTime(sheet.getRange('C8').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t3Due = safeParseAndConvertDateTime(sheet.getRange('D8').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t3Payload = buildTaskPayload(sheet.getName(), t3Summary, epicKey, t3Start, t3Due, accountId, accountId, '10637', toADFDescription(createTaskDescriptionTable()));
  var t3Res = createEpicInJira(t3Payload);
  if (!t3Res || !t3Res.key) throw 'EXTRA0 Task 생성 실패';
  createdIssues.push({key: t3Res.key, summary: t3Summary});
  createSubtask_L10NFB(sheet, yymmdd, t3Res.key, accountId, 'EXTRA0', createdIssues, region, updateType, '');

  // 5. EXTRA1 Task 및 Subtasks
  var t4Summary = `${region} ${yymmdd} 업데이트 (${updateType}) EXTRA1`;
  var t4Start = safeParseAndConvertDateTime(sheet.getRange('C9').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t4Due = safeParseAndConvertDateTime(sheet.getRange('D9').getValue(), Number('20' + yymmdd.slice(0,2)));
  var t4Payload = buildTaskPayload(sheet.getName(), t4Summary, epicKey, t4Start, t4Due, accountId, accountId, '10637', toADFDescription(createTaskDescriptionTable()));
  var t4Res = createEpicInJira(t4Payload);
  if (!t4Res || !t4Res.key) throw 'EXTRA1 Task 생성 실패';
  createdIssues.push({key: t4Res.key, summary: t4Summary});
  createSubtask_L10NFB(sheet, yymmdd, t4Res.key, accountId, 'EXTRA1', createdIssues, region, updateType, '');

  showAllIssuesCreatedNotification(createdIssues);
}

function createSubtask_L10NFB(sheet, yymmdd, parentKey, accountId, type, createdIssues, region, updateType, description) {
  var year = Number('20' + yymmdd.slice(0,2));
  if (type === 'REGULAR') {
    // HO&HB
    var s1Summary = `${region} ${yymmdd} 업데이트 (${updateType}) REGULAR HO&HB`;
    var s1Start = safeParseAndConvertDateTime(sheet.getRange('C16').getValue(), year);
    var s1Due = safeParseAndConvertDateTime(sheet.getRange('D16').getValue(), year);
    var s1Payload = buildSubtaskPayload(sheet.getName(), s1Summary, parentKey, s1Start, s1Due, accountId, accountId, '10638', description);
    var s1Res = createEpicInJira(s1Payload);
    if (s1Res && s1Res.key) createdIssues.push({key: s1Res.key, summary: s1Summary});
    // DELIVERY
    var s2Summary = `${region} ${yymmdd} 업데이트 (${updateType}) REGULAR DELIVERY`;
    var s2Start = safeParseAndConvertDateTime(sheet.getRange('D7').getValue(), year);
    var s2Due = safeParseAndConvertDateTime(sheet.getRange('D7').getValue(), year);
    var s2Payload = buildSubtaskPayload(sheet.getName(), s2Summary, parentKey, s2Start, s2Due, accountId, accountId, '10638', description);
    var s2Res = createEpicInJira(s2Payload);
    if (s2Res && s2Res.key) createdIssues.push({key: s2Res.key, summary: s2Summary});
  } else if (type === 'EXTRA0') {
    // HO&HB
    var s1Summary = `${region} ${yymmdd} 업데이트 (${updateType}) EXTRA0 HO&HB`;
    var s1Start = safeParseAndConvertDateTime(sheet.getRange('C17').getValue(), year);
    var s1Due = safeParseAndConvertDateTime(sheet.getRange('D17').getValue(), year);
    var s1Payload = buildSubtaskPayload(sheet.getName(), s1Summary, parentKey, s1Start, s1Due, accountId, accountId, '10638', description);
    var s1Res = createEpicInJira(s1Payload);
    if (s1Res && s1Res.key) createdIssues.push({key: s1Res.key, summary: s1Summary});
    // DELIVERY
    var s2Summary = `${region} ${yymmdd} 업데이트 (${updateType}) EXTRA0 DELIVERY`;
    var s2Start = safeParseAndConvertDateTime(sheet.getRange('D8').getValue(), year);
    var s2Due = safeParseAndConvertDateTime(sheet.getRange('D8').getValue(), year);
    var s2Payload = buildSubtaskPayload(sheet.getName(), s2Summary, parentKey, s2Start, s2Due, accountId, accountId, '10638', description);
    var s2Res = createEpicInJira(s2Payload);
    if (s2Res && s2Res.key) createdIssues.push({key: s2Res.key, summary: s2Summary});
  } else if (type === 'EXTRA1') {
    // HO&HB
    var s1Summary = `${region} ${yymmdd} 업데이트 (${updateType}) EXTRA1 HO&HB`;
    var s1Start = safeParseAndConvertDateTime(sheet.getRange('C18').getValue(), year);
    var s1Due = safeParseAndConvertDateTime(sheet.getRange('D18').getValue(), year);
    var s1Payload = buildSubtaskPayload(sheet.getName(), s1Summary, parentKey, s1Start, s1Due, accountId, accountId, '10638', description);
    var s1Res = createEpicInJira(s1Payload);
    if (s1Res && s1Res.key) createdIssues.push({key: s1Res.key, summary: s1Summary});
    // DELIVERY
    var s2Summary = `${region} ${yymmdd} 업데이트 (${updateType}) EXTRA1 DELIVERY`;
    var s2Start = safeParseAndConvertDateTime(sheet.getRange('D9').getValue(), year);
    var s2Due = safeParseAndConvertDateTime(sheet.getRange('D9').getValue(), year);
    var s2Payload = buildSubtaskPayload(sheet.getName(), s2Summary, parentKey, s2Start, s2Due, accountId, accountId, '10638', description);
    var s2Res = createEpicInJira(s2Payload);
    if (s2Res && s2Res.key) createdIssues.push({key: s2Res.key, summary: s2Summary});
  }
}

// L10NFB Epic/Task/Subtask 생성 시 날짜/시간 필드가 빈 값/잘못된 값이면 기본값(오늘 날짜+09:30)으로 대체
function safeParseDateWithTime(dateStr, yymmdd, timeStr) {
  var parsed = parseDateWithTime(dateStr, yymmdd, timeStr);
  if (!parsed || parsed === '') {
    var today = new Date();
    var yyyy = today.getFullYear();
    var MM = ('0' + (today.getMonth() + 1)).slice(-2);
    var DD = ('0' + today.getDate()).slice(-2);
    return `${yyyy}-${MM}-${DD}T09:30:00.000+0900`;
  }
  return parsed;
}
function safeParseAndConvertDateTime(dateStr, year) {
  var parsed = parseAndConvertDateTime(dateStr, year);
  if (!parsed || parsed === '') {
    var today = new Date();
    var MM = ('0' + (today.getMonth() + 1)).slice(-2);
    var DD = ('0' + today.getDate()).slice(-2);
    return `${today.getFullYear()}-${MM}-${DD}T09:30:00.000+0900`;
  }
  return parsed;
}

/**
 * 도움말 다이얼로그 표시
 */
function showHelpDialog() {
  SpreadsheetApp.getUi().alert('이 메뉴는 JIRA 일감 자동 생성 기능을 제공합니다.\n각 메뉴를 클릭해 기능을 확인하세요.');
}

/**
 * 현재 활성화된 시트의 이름을 반환하는 함수
 * @returns {string} 시트 이름 (예: 'L10NM4')
 */
function getActiveSheetName() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  return sheet.getName();
}

/**
 * 날짜(YYYY-MM-DD 문자열 또는 Date 객체)를 YYMMDD 문자열로 변환하는 함수
 * @param {string|Date} dateInput - 변환할 날짜 (예: '2024-06-01' 또는 Date 객체)
 * @returns {string|null} YYMMDD 형식의 문자열 (예: '240601'), 변환 불가 시 null
 */
function convertToYYMMDD(dateInput) {
  var dateObj;
  if (typeof dateInput === 'string') {
    // YYYY-MM-DD 형식 문자열 처리
    var match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      dateObj = new Date(match[1], match[2] - 1, match[3]);
    } else {
      return null;
    }
  } else if (dateInput instanceof Date) {
    dateObj = dateInput;
  } else {
    return null;
  }
  var yy = ('' + dateObj.getFullYear()).slice(-2);
  var mm = ('0' + (dateObj.getMonth() + 1)).slice(-2);
  var dd = ('0' + dateObj.getDate()).slice(-2);
  return yy + mm + dd;
}

/**
 * 지정된 셀 범위에서 날짜/시간 값을 읽어오는 함수
 * @param {string[]} ranges - 읽을 셀 범위 배열 (예: ['C7:D9', 'C16:D18'])
 * @returns {Array} 각 범위별 2차원 배열 값 (빈 셀은 null)
 */
function readDateTimeRanges(ranges) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var results = [];
  ranges.forEach(function(rangeStr) {
    var values = sheet.getRange(rangeStr).getValues();
    // 빈 셀은 null로 변환
    var cleaned = values.map(function(row) {
      return row.map(function(cell) {
        return cell === '' ? null : cell;
      });
    });
    results.push({ range: rangeStr, values: cleaned });
  });
  return results;
}

/**
 * 기준 연도(baseYear), 기준 월(baseMonth), 필드 월(fieldMonth)를 받아 연도 보정
 * - 예: 기준월이 1월, 필드월이 12월이면 baseYear-1 반환
 * @param {number} baseYear - 기준 연도 (예: 2024)
 * @param {number} baseMonth - 기준 월 (1~12)
 * @param {number} fieldMonth - 필드 월 (1~12)
 * @returns {number} 보정된 연도
 */
function getAdjustedYear(baseYear, baseMonth, fieldMonth) {
  if (baseMonth === 1 && fieldMonth === 12) {
    // 1월 기준, 12월 데이터는 전년도
    return baseYear - 1;
  }
  // 그 외에는 기준 연도 그대로 사용
  return baseYear;
}

/**
 * JIRA API와 통신하는 기본 HTTP 요청/응답 핸들러
 * @param {string} endpoint - JIRA REST API 엔드포인트 (예: '/rest/api/3/issue')
 * @param {string} method - HTTP 메서드 ('GET', 'POST', 'PUT', 'DELETE')
 * @param {Object} [payload] - POST/PUT 시 전송할 데이터 (객체)
 * @param {Object} [headers] - 추가 헤더(선택)
 * @returns {Object} JIRA API 응답(JSON 파싱 결과)
 * @throws {Error} 네트워크 오류, 응답 오류 등
 */
function jiraApiRequest(endpoint, method, payload, headers) {
  var creds = getJiraCredentials();
  if (!creds.email || !creds.apiToken) {
    throw new Error('JIRA 자격증명이 저장되어 있지 않습니다.');
  }
  var baseUrl = 'https://wemade.atlassian.net'; // TODO: 실제 JIRA 도메인으로 변경 필요
  var url = baseUrl + endpoint;
  var basicAuth = Utilities.base64Encode(creds.email + ':' + creds.apiToken);
  var options = {
    method: method,
    muteHttpExceptions: true,
    headers: Object.assign({
      'Authorization': 'Basic ' + basicAuth,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }, headers || {})
  };
  if (payload && (method === 'POST' || method === 'PUT')) {
    options.payload = JSON.stringify(payload);
    // 날짜/시간, description 로그 남기기
    try {
      var logObj = {
        endpoint: endpoint,
        summary: payload.fields && payload.fields.summary,
        startDate: payload.fields && payload.fields.customfield_10569,
        dueDate: payload.fields && payload.fields.customfield_10570,
        description: payload.fields && payload.fields.description
      };
      jiraLog('info', '[JIRA API PAYLOAD] ' + JSON.stringify(logObj));
    } catch (e) {}
  }
  var response = UrlFetchApp.fetch(url, options);
  var code = response.getResponseCode();
  var body = response.getContentText();
  if (code >= 200 && code < 300) {
    try {
      return JSON.parse(body);
    } catch (e) {
      return body;
    }
  } else {
    throw new Error('JIRA API 오류: ' + code + '\n' + body);
  }
}

/**
 * 저장된 JIRA 자격증명으로 인증이 정상적으로 동작하는지 테스트하는 함수
 * - JIRA 내 /myself API를 호출해 인증 확인
 * @returns {boolean} 인증 성공 시 true, 실패 시 false
 */
function jiraIsAuthenticated() {
  try {
    var res = jiraApiRequest('/rest/api/3/myself', 'GET');
    return !!res && !!res.accountId;
  } catch (e) {
    return false;
  }
}

/**
 * 인증 테스트 및 결과 메시지 표시용 함수 (UI 연동 예시)
 */
function jiraAuthTest() {
  var ui = SpreadsheetApp.getUi();
  if (jiraIsAuthenticated()) {
    ui.alert('JIRA 인증에 성공했습니다!');
  } else {
    ui.alert('JIRA 인증에 실패했습니다.\n이메일/토큰 또는 도메인을 확인하세요.');
  }
}

/**
 * JIRA 관련 에러 발생 시 사용자에게 명확한 메시지를 보여주는 함수
 * @param {string} errorMsg - 에러 메시지
 */
function showJiraErrorNotification(errorMsg) {
  var msg = '작업 중 오류가 발생했습니다.\n';
  msg += '원인: ' + errorMsg + '\n';
  msg += '\n주요 원인 예시:\n- JIRA 자격증명 오류(이메일/토큰/도메인)\n- 네트워크 문제\n- JIRA 권한 부족\n- 필수 입력값 누락\n\n문제가 반복되면 관리자에게 문의하세요.';
  SpreadsheetApp.getUi().alert(msg);
}

// JIRA accountId 조회 함수 추가
function getJiraAccountId() {
  var res = jiraApiRequest('/rest/api/3/myself', 'GET');
  if (res && res.accountId) return res.accountId;
  throw new Error('JIRA accountId를 가져올 수 없습니다.');
}

/**
 * (옵션) HTML에서 google.script.run.getJiraCredentials()로 자격증명 값을 불러올 수 있도록 공개
 */
function getJiraCredentialsForHtml() {
  return getJiraCredentials();
}

/**
 * JIRA API 통신 에러 및 정보 로그 기록 함수
 * - 로그는 Script Properties에 누적 저장(간단 예시)
 * @param {string} type - 'error' 또는 'info'
 * @param {string} message - 로그 메시지
 */
function jiraLog(type, message) {
  var props = PropertiesService.getScriptProperties();
  var key = 'JIRA_LOG_' + type.toUpperCase();
  var prev = props.getProperty(key) || '';
  var now = new Date().toISOString() + '\t' + type.toUpperCase() + '\t' + message;
  
  // 순환 버퍼: 최근 50개 로그만 유지
  var lines = prev.split('\n').filter(function(line) { return line.trim() !== ''; });
  lines.push(now);
  
  // 50개 초과 시 오래된 로그 제거
  if (lines.length > 50) {
    lines = lines.slice(lines.length - 50);
  }
  
  props.setProperty(key, lines.join('\n'));
}

/**
 * Epic 생성 후 응답에서 Epic ID를 추출해 Script Properties에 저장하는 함수
 * @param {Object} epicResponse - createEpicInJira의 응답 객체
 * @returns {string|null} Epic ID(이슈 키), 실패 시 null
 */
function storeEpicId(epicResponse, showNotification) {
  if (epicResponse && epicResponse.key) {
    var props = PropertiesService.getScriptProperties();
    props.setProperty('LAST_EPIC_ID', epicResponse.key);
    jiraLog('info', 'Epic ID 저장: ' + epicResponse.key);
    if (showNotification) {
      SpreadsheetApp.getUi().alert('Epic 생성 성공!\nEpic ID: ' + epicResponse.key + '\n링크: https://wemade.atlassian.net/browse/' + epicResponse.key);
    }
    return epicResponse.key;
  } else {
    jiraLog('error', 'Epic ID 추출 실패: ' + JSON.stringify(epicResponse));
    if (showNotification) {
      SpreadsheetApp.getUi().alert('Epic 생성은 되었으나, Epic ID 추출에 실패했습니다.');
    }
    return null;
  }
}

/**
 * Epic 생성 성공 시 Epic 링크를 포함한 사용자 성공 알림 팝업을 띄우는 함수
 * @param {string} epicKey - 생성된 Epic 이슈 키
 */
function showEpicSuccessNotification(epicKey) {
  var url = 'https://wemade.atlassian.net/browse/' + epicKey;
  SpreadsheetApp.getUi().alert('Epic 생성 성공!\nEpic ID: ' + epicKey + '\n링크: ' + url);
}

/**
 * 'MM/DD(요일) HH:MM' 형식의 문자열을 'YYYY-MM-DDTHH:mm:ss.sss+0900' 형식으로 변환
 * @param {string} src - 원본 문자열 (예: '12/31(일) 23:00')
 * @param {number} baseYear - 기준 연도 (예: 2024)
 * @returns {string} 변환된 날짜/시간 문자열 (예: '2024-12-31T23:00:00.000+0900'), 변환 불가 시 ''
 */
function parseAndConvertDateTime(src, baseYear) {
  // 정규식: MM/DD(요일) HH:MM
  var match = src.match(/^\s*(\d{1,2})\/(\d{1,2})\([^)]*\)\s+(\d{1,2}):(\d{2})\s*$/);
  if (!match) return '';
  var mm = ('0' + match[1]).slice(-2);
  var dd = ('0' + match[2]).slice(-2);
  var hh = ('0' + match[3]).slice(-2);
  var min = ('0' + match[4]).slice(-2);

  // Date 객체 생성
  var dateObj = new Date(baseYear + '-' + mm + '-' + dd + 'T' + hh + ':' + min + ':00');
  var yyyy = dateObj.getFullYear();
  var MM = ('0' + (dateObj.getMonth() + 1)).slice(-2);
  var DD = ('0' + dateObj.getDate()).slice(-2);
  var HH = ('0' + dateObj.getHours()).slice(-2);
  var MIN = ('0' + dateObj.getMinutes()).slice(-2);
  var SS = '00';
  var SSS = '000';
  var offsetStr = '+0900';
  return `${yyyy}-${MM}-${DD}T${HH}:${MIN}:${SS}.${SSS}${offsetStr}`;
}

// YYYY-MM-DD HH:MM 또는 Date 객체 + HH:MM → JIRA ISO8601 포맷 변환 함수
function parseYMDHMToJiraDateTime(dateTimeInput, timeStr) {
  // dateTimeInput: 'YYYY-MM-DD HH:MM' | 'YYYY-MM-DD' | Date 객체
  // timeStr: 'HH:MM' (옵션)
  if (!dateTimeInput) return '';
  if (dateTimeInput instanceof Date) {
    var yyyy = dateTimeInput.getFullYear();
    var MM = ('0' + (dateTimeInput.getMonth() + 1)).slice(-2);
    var dd = ('0' + dateTimeInput.getDate()).slice(-2);
    var HH = '00';
    var mm = '00';
    if (timeStr && typeof timeStr === 'string') {
      var tMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      if (tMatch) {
        HH = ('0' + tMatch[1]).slice(-2);
        mm = ('0' + tMatch[2]).slice(-2);
      }
    }
    return `${yyyy}-${MM}-${dd}T${HH}:${mm}:00.000+0900`;
  }
  if (typeof dateTimeInput === 'string') {
    // 'YYYY-MM-DD HH:MM' 또는 'YYYY-MM-DD' + timeStr
    var match = dateTimeInput.match(/^(\d{4})-(\d{2})-(\d{2})[ T]?(\d{2})?:?(\d{2})?$/);
    if (match) {
      var yyyy = match[1];
      var MM = match[2];
      var dd = match[3];
      var HH = match[4] || '00';
      var mm = match[5] || '00';
      // timeStr 우선 적용
      if (timeStr && typeof timeStr === 'string') {
        var tMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
        if (tMatch) {
          HH = ('0' + tMatch[1]).slice(-2);
          mm = ('0' + tMatch[2]).slice(-2);
        }
      }
      return `${yyyy}-${MM}-${dd}T${HH}:${mm}:00.000+0900`;
    }
  }
  return '';
}

// L10N 시트 자동 JIRA 일감 생성 함수
function createJiraIssues_L10N(sheet, yymmdd, accountId) {
  var ui = SpreadsheetApp.getUi();
  var createdIssues = [];
  // Epic 생성
  var epicSummary = sheet.getRange('A1').getValue();
  var epicStart = parseYMDHMToJiraDateTime(sheet.getRange('C2').getValue());
  var epicDueRaw = sheet.getRange('C1').getValue();
  var epicDue = parseYMDHMToJiraDateTime(epicDueRaw, '18:30');
  var epicAssignee = sheet.getRange('E2').getValue();
  var epicDescRaw = sheet.getRange('E3').getValue();
  var epicDesc = toADFDescription(epicDescRaw);
  // 빈 paragraph 제거
  epicDesc.content = epicDesc.content.filter(p => !(p.type === 'paragraph' && (!p.content || (p.content.length === 1 && p.content[0].text === ''))));
  if (!epicDue) {
    ui.alert('Epic의 기한(기한+시각)이 비어 있습니다. C1 셀을 확인하세요. JIRA 이슈를 생성하지 않습니다.');
    return;
  }
  var epicPayload = buildEpicPayload(sheet.getName(), epicSummary, epicStart, epicDue, epicAssignee, accountId, epicDesc);
  var epicRes = createEpicInJira(epicPayload);
  if (!epicRes || !epicRes.key) throw 'Epic 생성 실패';
  createdIssues.push({key: epicRes.key, summary: epicSummary});
  var epicKey = storeEpicId(epicRes, false);

  // Task/Subtask 생성 정의
  var taskDefs = [
    { taskRow: 7, subRows: [8,9,10] },   // M4
    { taskRow: 14, subRows: [15,16,17] }, // NC
    { taskRow: 21, subRows: [22,23,24] }, // FB
    { taskRow: 28, subRows: [29,30,31] }, // LY
    { taskRow: 35, subRows: [] },         // 견적서 크로스체크 (Subtask 없음)
    { taskRow: 39, subRows: [40,41,42] }  // BV
  ];
  for (var i=0; i<taskDefs.length; i++) {
    var t = taskDefs[i];
    var taskSummary = sheet.getRange('B'+t.taskRow).getValue();
    var taskStart = parseYMDHMToJiraDateTime(sheet.getRange('C'+t.taskRow).getValue());
    var taskDue = parseYMDHMToJiraDateTime(sheet.getRange('D'+t.taskRow).getValue());
    var taskAssignee = sheet.getRange('F'+t.taskRow).getValue() || accountId;
    var taskDescriptionRaw = sheet.getRange('E'+t.taskRow).getValue() || '';
    var taskDescription = toADFDescription(taskDescriptionRaw);
    taskDescription.content = taskDescription.content.filter(p => !(p.type === 'paragraph' && (!p.content || (p.content.length === 1 && p.content[0].text === ''))));
    var taskPayload = buildTaskPayload(sheet.getName(), taskSummary, epicKey, taskStart, taskDue, taskAssignee, accountId, '10637', taskDescription);
    var taskRes = createEpicInJira(taskPayload);
    if (!taskRes || !taskRes.key) throw 'Task 생성 실패: ' + taskSummary;
    createdIssues.push({key: taskRes.key, summary: taskSummary});
    var taskKey = taskRes.key;
    // Subtasks
    for (var j=0; j<t.subRows.length; j++) {
      var subRow = t.subRows[j];
      var subSummary = sheet.getRange('B'+subRow).getValue();
      var subStart = parseYMDHMToJiraDateTime(sheet.getRange('C'+subRow).getValue());
      var subDue = parseYMDHMToJiraDateTime(sheet.getRange('D'+subRow).getValue());
      var subAssignee = sheet.getRange('F'+subRow).getValue() || accountId;
      var subDescriptionRaw = sheet.getRange('E'+subRow).getValue() || '';
      var subDescription = toADFDescription(subDescriptionRaw);
      subDescription.content = subDescription.content.filter(p => !(p.type === 'paragraph' && (!p.content || (p.content.length === 1 && p.content[0].text === ''))));
      var subPayload = buildSubtaskPayload(sheet.getName(), subSummary, taskKey, subStart, subDue, subAssignee, accountId, '10638', subDescription);
      var subRes = createEpicInJira(subPayload);
      if (!subRes || !subRes.key) throw 'Subtask 생성 실패: ' + subSummary;
      createdIssues.push({key: subRes.key, summary: subSummary});
    }
  }
  showAllIssuesCreatedNotification(createdIssues);
}

// ============================================================
// 디버깅 및 로그 확인 함수
// ============================================================

/**
 * JIRA API 호출 로그를 확인하는 함수
 * - Script Properties에 저장된 로그를 모두 출력
 * - 날짜 형식 오류 디버깅에 유용
 */
function viewJiraLogs() {
  var props = PropertiesService.getScriptProperties();
  var infoLog = props.getProperty('JIRA_LOG_INFO') || '로그 없음';
  var errorLog = props.getProperty('JIRA_LOG_ERROR') || '로그 없음';
  
  var ui = SpreadsheetApp.getUi();
  var message = '=== INFO LOG ===\n' + infoLog + '\n\n=== ERROR LOG ===\n' + errorLog;
  
  // 로그가 너무 길면 시트로 내보내기 제안
  if (message.length > 2000) {
    var response = ui.alert(
      '로그가 너무 깁니다',
      '로그를 새 시트 "JIRA_로그"에 저장하시겠습니까?\n\n' +
      '(취소하면 Apps Script 에디터 로그로 출력됩니다)',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response === ui.Button.OK) {
      exportJiraLogsToSheet();
    } else {
      Logger.log('=== INFO LOG ===');
      Logger.log(infoLog);
      Logger.log('\n=== ERROR LOG ===');
      Logger.log(errorLog);
      ui.alert('Apps Script 에디터 > 실행 로그에서 확인하세요.');
    }
  } else {
    ui.alert(message);
  }
}

/**
 * JIRA API 로그를 초기화하는 함수
 * - 디버깅 후 로그를 정리할 때 사용
 */
function clearJiraLogs() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty('JIRA_LOG_INFO');
  props.deleteProperty('JIRA_LOG_ERROR');
  SpreadsheetApp.getUi().alert('JIRA 로그가 초기화되었습니다.');
}

/**
 * JIRA API 로그를 Google Sheets의 새 시트에 저장하는 함수
 * - "JIRA_로그" 시트를 생성하거나 기존 시트를 덮어씀
 * - INFO 로그와 ERROR 로그를 각각 파싱하여 표 형태로 저장
 */
function exportJiraLogsToSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getScriptProperties();
  var infoLog = props.getProperty('JIRA_LOG_INFO') || '';
  var errorLog = props.getProperty('JIRA_LOG_ERROR') || '';
  
  // 기존 "JIRA_로그" 시트가 있으면 삭제
  var existingSheet = ss.getSheetByName('JIRA_로그');
  if (existingSheet) {
    ss.deleteSheet(existingSheet);
  }
  
  // 새 시트 생성
  var logSheet = ss.insertSheet('JIRA_로그');
  
  // 헤더 설정
  logSheet.getRange('A1:C1').setValues([['타임스탬프', '타입', '메시지']]);
  logSheet.getRange('A1:C1').setFontWeight('bold');
  logSheet.getRange('A1:C1').setBackground('#4285f4');
  logSheet.getRange('A1:C1').setFontColor('#ffffff');
  
  var row = 2;
  
  // INFO 로그 파싱 (탭 구분 형식: TIMESTAMP\tTYPE\tMESSAGE)
  if (infoLog && infoLog !== '로그 없음') {
    var infoLines = infoLog.split('\n');
    for (var i = 0; i < infoLines.length; i++) {
      var line = infoLines[i].trim();
      if (line === '') continue;
      
      // 탭으로 분리
      var parts = line.split('\t');
      if (parts.length >= 3) {
        logSheet.getRange(row, 1).setValue(parts[0]); // 타임스탬프
        logSheet.getRange(row, 2).setValue(parts[1]); // 타입
        logSheet.getRange(row, 3).setValue(parts.slice(2).join('\t')); // 메시지 (나머지 모두)
        
        // INFO 타입은 초록색 배경
        logSheet.getRange(row, 2).setBackground('#d4edda');
        row++;
      }
    }
  }
  
  // ERROR 로그 파싱 (탭 구분 형식)
  if (errorLog && errorLog !== '로그 없음') {
    var errorLines = errorLog.split('\n');
    for (var j = 0; j < errorLines.length; j++) {
      var eLine = errorLines[j].trim();
      if (eLine === '') continue;
      
      // 탭으로 분리
      var eParts = eLine.split('\t');
      if (eParts.length >= 3) {
        logSheet.getRange(row, 1).setValue(eParts[0]); // 타임스탬프
        logSheet.getRange(row, 2).setValue(eParts[1]); // 타입
        logSheet.getRange(row, 3).setValue(eParts.slice(2).join('\t')); // 메시지
        
        // ERROR 타입은 빨간색 배경
        logSheet.getRange(row, 2).setBackground('#f8d7da');
        row++;
      }
    }
  }
  
  // 빈 로그인 경우
  if (row === 2) {
    logSheet.getRange(row, 1, 1, 3).setValues([['', '', '로그가 비어있습니다']]);
  }
  
  // 열 너비 자동 조정
  logSheet.autoResizeColumns(1, 3);
  logSheet.setColumnWidth(3, 600); // 메시지 열은 넓게
  
  // 텍스트 줄바꿈 설정
  logSheet.getRange(2, 3, row - 2, 1).setWrap(true);
  
  // 완료 알림
  SpreadsheetApp.getUi().alert(
    '로그 저장 완료',
    '"JIRA_로그" 시트에 ' + (row - 2) + '개의 로그가 저장되었습니다.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  
  // 로그 시트로 이동
  logSheet.activate();
}

/**
 * 날짜 형식을 검증하는 함수
 * - ISO8601 형식 검증: YYYY-MM-DDTHH:MM:SS.sss+0900
 * @param {string} dateStr - 검증할 날짜 문자열
 * @returns {boolean} 유효한 형식이면 true
 */
function validateJiraDateTime(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }
  
  // ISO8601 형식 정규식: YYYY-MM-DDTHH:MM:SS.sss+ZZZZ
  var iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{4}$/;
  return iso8601Regex.test(dateStr);
}

/**
 * 날짜 필드 디버깅 헬퍼 함수
 * - buildPayload 함수들에서 사용
 * - 날짜 형식이 잘못되면 경고 로그 기록 및 에러 throw
 * @param {string} dateStr - 검증할 날짜
 * @param {string} fieldName - 필드명 (디버깅용)
 * @param {string} issueSummary - 이슈 제목 (디버깅용)
 */
function debugDateTime(dateStr, fieldName, issueSummary) {
  if (!validateJiraDateTime(dateStr)) {
    // 값의 타입 확인
    var valueType = typeof dateStr;
    var valueDisplay = dateStr === null ? 'null' : 
                      dateStr === undefined ? 'undefined' : 
                      valueType === 'string' ? '"' + dateStr + '"' : 
                      String(dateStr);
    
    var errorMsg = '🔴 날짜 형식 오류 발생!\n' +
                   '━━━━━━━━━━━━━━━━━━━━\n' +
                   '📝 이슈: ' + issueSummary + '\n' +
                   '🏷️  필드: ' + fieldName + '\n' +
                   '❌ 잘못된 값: ' + valueDisplay + '\n' +
                   '📊 타입: ' + valueType + '\n' +
                   '✅ 올바른 형식: 2025-11-18T09:30:00.000+0900\n' +
                   '━━━━━━━━━━━━━━━━━━━━';
    
    jiraLog('error', errorMsg);
    throw new Error(errorMsg);
  }
}
