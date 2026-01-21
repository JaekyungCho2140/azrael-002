/**
 * Calendar View Component
 * 참조: prd/Azrael-PRD-Phase0.md §7 캘린더 뷰
 */

import { useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { EventContentArg } from '@fullcalendar/core';
import { ScheduleEntry } from '../types';
import { formatTime, formatDateLocal } from '../lib/businessDays';
import { CopyImageButton } from './CopyImageButton';
import './CalendarView.css';

interface CalendarViewProps {
  table1Entries: ScheduleEntry[];
  table2Entries: ScheduleEntry[];
  table3Entries: ScheduleEntry[];
  updateDate: Date;
}

export function CalendarView({
  table1Entries,
  table2Entries,
  table3Entries,
  updateDate
}: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);

  // 모든 엔트리를 평탄화 (하위 일감 포함)
  const flattenEntries = (entries: ScheduleEntry[]): ScheduleEntry[] => {
    const result: ScheduleEntry[] = [];
    entries.forEach(entry => {
      result.push(entry);
      if (entry.children) {
        result.push(...flattenEntries(entry.children));
      }
    });
    return result;
  };

  // 테이블별 색상 (참조: Azrael-PRD-Design.md §2.4)
  const events = [
    ...flattenEntries(table1Entries).map(e => ({
      id: e.id,
      title: e.stageName,
      start: formatDateLocal(e.startDateTime),
      end: formatDateLocal(e.endDateTime),
      backgroundColor: '#FF9800', // Azrael Orange
      borderColor: '#F57C00',
      extendedProps: {
        description: `${e.stageName}: ${formatTime(e.startDateTime)} ~ ${formatTime(e.endDateTime)}`,
        tableType: 'table1'
      }
    })),
    ...flattenEntries(table2Entries).map(e => ({
      id: e.id,
      title: e.stageName,
      start: formatDateLocal(e.startDateTime),
      end: formatDateLocal(e.endDateTime),
      backgroundColor: '#009688', // Teal
      borderColor: '#00796B',
      extendedProps: {
        description: `${e.stageName}: ${formatTime(e.startDateTime)} ~ ${formatTime(e.endDateTime)}`,
        tableType: 'table2'
      }
    })),
    ...flattenEntries(table3Entries).map(e => ({
      id: e.id,
      title: e.stageName,
      start: formatDateLocal(e.startDateTime),
      end: formatDateLocal(e.endDateTime),
      backgroundColor: '#673AB7', // Deep Purple
      borderColor: '#512DA8',
      extendedProps: {
        description: `${e.stageName}: ${formatTime(e.startDateTime)} ~ ${formatTime(e.endDateTime)}`,
        tableType: 'table3'
      }
    }))
  ];

  // 이벤트 렌더링 커스터마이징
  const renderEventContent = (eventInfo: EventContentArg) => {
    return (
      <div
        className="fc-event-main-custom"
        title={eventInfo.event.extendedProps.description}
      >
        <span className="fc-event-time">{eventInfo.timeText}</span>
        <span className="fc-event-title">{eventInfo.event.title}</span>
      </div>
    );
  };

  const handleCopySuccess = () => {
    // Toast는 MainScreen에서 관리
    console.log('캘린더 이미지 복사 성공');
  };

  const handleCopyError = (error: Error) => {
    console.error('캘린더 이미지 복사 실패:', error);
  };

  return (
    <div className="calendar-container" id="calendar-view">
      <div className="calendar-header">
        <h3>📅 캘린더 뷰</h3>
        <CopyImageButton
          targetId="calendar-view"
          onSuccess={handleCopySuccess}
          onError={handleCopyError}
        />
      </div>

      <div className="fullcalendar-wrapper">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          initialDate={updateDate}
          events={events}
          eventContent={renderEventContent}
          headerToolbar={{
            left: 'prev',
            center: 'title',
            right: 'next'
          }}
          locale="ko"
          height="auto"
          dayMaxEvents={true}
          eventDisplay="block"
          displayEventTime={true}
          displayEventEnd={true}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
        />
      </div>
    </div>
  );
}
