/**
 * useHolidays Hook
 * 공휴일 관리를 위한 커스텀 훅
 */

import { useState, useEffect } from 'react';
import { Holiday } from '../types';
import { loadHolidays, saveHolidays } from '../lib/storage';

export function useHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // 초기 로드
  useEffect(() => {
    setHolidays(loadHolidays());
  }, []);

  // 공휴일 추가
  const addHoliday = (holiday: Holiday) => {
    const updated = [...holidays, holiday];
    setHolidays(updated);
    saveHolidays(updated);
  };

  // 공휴일 삭제
  const deleteHoliday = (date: Date) => {
    const updated = holidays.filter(h =>
      !(h.date.getFullYear() === date.getFullYear() &&
        h.date.getMonth() === date.getMonth() &&
        h.date.getDate() === date.getDate())
    );
    setHolidays(updated);
    saveHolidays(updated);
  };

  // API에서 공휴일 불러오기
  const fetchHolidaysFromAPI = async (year: number): Promise<void> => {
    const apiKey = import.meta.env.VITE_HOLIDAY_API_KEY;
    
    console.log('🔍 API 호출 시작');
    console.log('  - Year:', year);
    console.log('  - API Key:', apiKey ? `${apiKey.substring(0, 20)}...` : 'undefined');
    console.log('  - Key Length:', apiKey?.length);
    
    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new Error('공휴일 API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.');
    }

    // 공공데이터포털 가이드: http 사용, 키는 인코딩하지 않음 (이미 Encoding 버전)
    const url = `http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?solYear=${year}&ServiceKey=${apiKey}`;
    
    console.log('  - URL:', url);

    const response = await fetch(url);
    
    console.log('📡 API 응답:');
    console.log('  - Status:', response.status);
    console.log('  - Status Text:', response.statusText);
    console.log('  - OK:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 에러 응답:', errorText.substring(0, 500));
      throw new Error(`공휴일 API 호출 실패 (${response.status}): ${response.statusText}`);
    }

    const xmlText = await response.text();

    // XML 파싱
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    // resultCode 확인
    const resultCode = xmlDoc.querySelector('resultCode')?.textContent;
    if (resultCode !== '00') {
      const resultMsg = xmlDoc.querySelector('resultMsg')?.textContent;
      throw new Error(`API 오류: ${resultMsg}`);
    }

    // item 요소 추출
    const items = xmlDoc.querySelectorAll('item');
    const newHolidays: Holiday[] = [];

    items.forEach(item => {
      const locdateStr = item.querySelector('locdate')?.textContent;
      const dateName = item.querySelector('dateName')?.textContent;

      if (!locdateStr || !dateName) return;

      // YYYYMMDD → Date 변환 (로컬 시간대)
      const yearNum = parseInt(locdateStr.substring(0, 4));
      const month = parseInt(locdateStr.substring(4, 6));
      const day = parseInt(locdateStr.substring(6, 8));
      // 정오(12:00)로 설정하여 시간대 변환 문제 방지
      const date = new Date(yearNum, month - 1, day, 12, 0, 0);

      newHolidays.push({
        date,
        name: dateName,
        isManual: false
      });
    });

    // 기존 수동 추가 공휴일 유지, API 공휴일 덮어쓰기
    const manualHolidays = holidays.filter(h => h.isManual);
    const allHolidays = [...newHolidays, ...manualHolidays];

    setHolidays(allHolidays);
    saveHolidays(allHolidays);
  };

  // CSV에서 공휴일 불러오기
  const importHolidaysFromCSV = (csvText: string): void => {
    // BOM 제거
    if (csvText.charCodeAt(0) === 0xFEFF) {
      csvText = csvText.substring(1);
    }

    // CRLF → LF 정규화
    csvText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    const lines = csvText.split('\n').filter(line => line.trim());
    const newHolidays: Holiday[] = [];
    const debugInfo: string[] = [];

    // 첫 줄 헤더 건너뛰기
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // CSV 파싱: #,공휴일 이름,날짜
      const columns = line.split(',');
      if (columns.length < 3) {
        debugInfo.push(`라인 ${i}: 컬럼 부족`);
        continue;
      }

      const name = columns[1].trim();
      const dateStr = columns[2].trim();

      try {
        // YYYY-MM-DD 형식으로 Date 생성
        const [year, month, day] = dateStr.split('-').map(Number);
        // 정오(12:00)로 설정하여 시간대 변환 문제 방지
        const date = new Date(year, month - 1, day, 12, 0, 0);

        newHolidays.push({
          date,
          name,
          isManual: true // CSV 임포트는 수동으로 간주
        });
        debugInfo.push(`+ ${name}: ${dateStr}`);
      } catch (err) {
        debugInfo.push(`✗ 라인 ${i}: 파싱 실패`);
      }
    }

    // 기존 API 공휴일 유지, CSV 공휴일 추가
    const apiHolidays = holidays.filter(h => !h.isManual);
    const allHolidays = [...apiHolidays, ...newHolidays];

    console.log('공휴일 CSV 임포트:', debugInfo.join('\n'));
    setHolidays(allHolidays);
    saveHolidays(allHolidays);
  };

  // 모든 공휴일 삭제
  const clearAllHolidays = () => {
    setHolidays([]);
    saveHolidays([]);
  };

  return {
    holidays,
    addHoliday,
    deleteHoliday,
    clearAllHolidays,
    fetchHolidaysFromAPI,
    importHolidaysFromCSV
  };
}
