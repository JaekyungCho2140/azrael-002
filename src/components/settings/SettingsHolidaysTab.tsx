import { useState } from 'react';
import { Button } from '../Button';
import { HolidayAddModal } from '../HolidayAddModal';
import { supabase } from '../../lib/supabase';
import {
  useHolidays,
  useCreateHoliday,
  useDeleteHoliday,
  useSyncApiHolidays,
} from '../../hooks/useSupabase';
import { formatDateLocal } from '../../lib/businessDays';

interface SettingsHolidaysTabProps {
  isAdmin: boolean;
}

export function SettingsHolidaysTab({ isAdmin }: SettingsHolidaysTabProps) {
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const [fetchYear, setFetchYear] = useState(new Date().getFullYear());

  const { data: holidays } = useHolidays();
  const createHolidayMutation = useCreateHoliday();
  const deleteHolidayMutation = useDeleteHoliday();
  const syncApiHolidaysMutation = useSyncApiHolidays();

  const handleFetchHolidays = async () => {
    const targetYear = fetchYear;
    const hasApiHolidays = holidays?.some(h => !h.isManual && h.date.getFullYear() === targetYear);

    if (hasApiHolidays) {
      if (!confirm(`이미 ${targetYear}년 공휴일을 불러왔습니다. 다시 불러오시겠습니까?`)) {
        return;
      }
    }

    setIsLoadingHolidays(true);
    try {
      const apiKey = import.meta.env.VITE_HOLIDAY_API_KEY;
      if (!apiKey || apiKey === 'your_api_key_here') {
        throw new Error('공휴일 API 키가 설정되지 않았습니다.');
      }

      const url = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?solYear=${targetYear}&numOfRows=50&ServiceKey=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API 호출 실패 (${response.status})`);
      }

      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      const resultCode = xmlDoc.querySelector('resultCode')?.textContent;
      if (resultCode !== '00') {
        const resultMsg = xmlDoc.querySelector('resultMsg')?.textContent;
        throw new Error(`API 오류: ${resultMsg}`);
      }

      const items = xmlDoc.querySelectorAll('item');
      const newHolidays = Array.from(items).map(item => {
        const locdateStr = item.querySelector('locdate')?.textContent || '';
        const dateName = item.querySelector('dateName')?.textContent || '';

        const year = parseInt(locdateStr.substring(0, 4));
        const month = parseInt(locdateStr.substring(4, 6));
        const day = parseInt(locdateStr.substring(6, 8));
        const date = new Date(year, month - 1, day, 12, 0, 0);

        return {
          date,
          name: dateName,
          isManual: false
        };
      });

      syncApiHolidaysMutation.mutate({ targetYear, holidays: newHolidays }, {
        onSuccess: () => {
          setIsLoadingHolidays(false);
          alert('공휴일을 성공적으로 불러왔습니다.');
        },
        onError: (err: any) => {
          setIsLoadingHolidays(false);
          alert(`공휴일 저장 실패: ${err.message}`);
        },
      });
    } catch (err: any) {
      setIsLoadingHolidays(false);
      alert(err.message || '공휴일 불러오기 실패');
    }
  };

  const handleImportHolidaysCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let csvText = e.target?.result as string;
        csvText = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        const lines = csvText.split('\n').filter(line => line.trim());
        const newHolidays = [];

        for (let i = 1; i < lines.length; i++) {
          const columns = lines[i].split(',');
          if (columns.length < 3) continue;

          const name = columns[1].trim();
          const dateStr = columns[2].trim();

          try {
            const [year, month, day] = dateStr.split('-').map(Number);
            const date = new Date(year, month - 1, day, 12, 0, 0);

            newHolidays.push({
              date,
              name,
              isManual: true,
            });
          } catch (err) {
            console.error(`CSV 라인 ${i} 파싱 실패`);
          }
        }

        for (const holiday of newHolidays) {
          createHolidayMutation.mutate(holiday);
        }

        alert(`CSV 파일에서 ${newHolidays.length}개 공휴일을 불러왔습니다.`);
      } catch (err: any) {
        alert(err.message || 'CSV 파일 읽기 실패');
      }
    };
    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
  };

  const handleClearAllHolidays = async () => {
    if (!confirm('모든 공휴일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        throw error;
      }

      alert('모든 공휴일이 삭제되었습니다.');
    } catch (err: any) {
      alert(`삭제 실패: ${err.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>공휴일 관리</h3>
        <Button onClick={() => setHolidayModalOpen(true)}>+ 공휴일 수동 추가</Button>
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <input
          type="number"
          value={fetchYear}
          onChange={(e) => setFetchYear(parseInt(e.target.value, 10))}
          min={2020}
          max={2030}
          style={{ width: '5rem', textAlign: 'center' }}
        />
        <span style={{ color: 'var(--azrael-gray-600)' }}>년</span>

        <Button
          onClick={handleFetchHolidays}
          disabled={isLoadingHolidays}
        >
          {isLoadingHolidays ? '불러오는 중...' : '공휴일 불러오기 (API)'}
        </Button>

        {isAdmin && (
          <>
            <input
              type="file"
              accept=".csv"
              onChange={handleImportHolidaysCSV}
              style={{ display: 'none' }}
              id="holidays-csv-upload"
            />
            <Button
              variant="secondary"
              onClick={() => document.getElementById('holidays-csv-upload')?.click()}
            >
              공휴일 불러오기 (CSV)
            </Button>

            <Button
              variant="ghost"
              onClick={handleClearAllHolidays}
            >
              모두 삭제
            </Button>
          </>
        )}
      </div>

      <table className="stages-table">
        <thead>
          <tr>
            <th>날짜</th>
            <th>이름</th>
            <th>구분</th>
            <th>삭제</th>
          </tr>
        </thead>
        <tbody>
          {holidays?.map((h, idx) => (
            <tr key={idx}>
              <td>{formatDateLocal(h.date)}</td>
              <td>{h.name}</td>
              <td>{h.isManual ? '수동' : 'API'}</td>
              <td>
                {h.isManual && (
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => {
                      if (confirm(`"${h.name}" 공휴일을 삭제하시겠습니까?`)) {
                        deleteHolidayMutation.mutate(h.date);
                      }
                    }}
                  >
                    ✕
                  </button>
                )}
              </td>
            </tr>
          ))}
          {(!holidays || holidays.length === 0) && (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', color: 'var(--azrael-gray-500)' }}>
                공휴일이 없습니다
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <HolidayAddModal
        isOpen={holidayModalOpen}
        onClose={() => setHolidayModalOpen(false)}
        onSave={(holiday) => {
          createHolidayMutation.mutate(
            holiday,
            {
              onSuccess: () => {
                setHolidayModalOpen(false);
              },
              onError: (err: any) => {
                alert(`공휴일 추가 실패: ${err.message}`);
              },
            }
          );
        }}
      />
    </div>
  );
}
