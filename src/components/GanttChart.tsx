/**
 * Gantt Chart Component
 * 참조: prd/Azrael-PRD-Phase0.md §6 간트 차트
 */

import { useEffect, useRef } from 'react';
import Gantt from 'frappe-gantt';
import { ScheduleEntry } from '../types';
import { formatTime, formatDateLocal } from '../lib/businessDays';
import { CopyImageButton } from './CopyImageButton';
import { GANTT_BAR_HEIGHT, GANTT_BAR_CORNER_RADIUS, GANTT_PADDING } from '../constants';
import '../../node_modules/frappe-gantt/dist/frappe-gantt.css';
import './GanttChart.css';

interface GanttChartProps {
  entries: ScheduleEntry[];
  collapsedParentIds?: Set<string>;
  chartId: string;
  color: string;
}

export function GanttChart({ entries, collapsedParentIds = new Set(), chartId, color }: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<Gantt | null>(null);

  useEffect(() => {
    if (!containerRef.current || entries.length === 0) return;

    // 원본 데이터 Map 생성 (Single Source of Truth)
    const entryMap = new Map(entries.map(e => [e.id, e]));

    // 표시할 엔트리 필터링 (접힌 하위 일감 제외)
    const visibleEntries: ScheduleEntry[] = [];
    const collectVisible = (entryList: ScheduleEntry[]) => {
      entryList.forEach(entry => {
        visibleEntries.push(entry);
        if (entry.children && !collapsedParentIds.has(entry.id)) {
          collectVisible(entry.children);
        }
      });
    };
    collectVisible(entries);

    // Gantt 태스크 변환
    const tasks = visibleEntries.map((entry, index) => ({
      id: entry.id,
      name: entry.stageName,
      start: formatDateLocal(entry.startDateTime),
      end: formatDateLocal(entry.endDateTime),
      progress: 100,
      dependencies: index > 0 ? visibleEntries[index - 1].id : ''
    }));

    // 기존 내용 정리 (중복 방지)
    const chartElement = document.getElementById(chartId);
    if (chartElement) {
      chartElement.innerHTML = '';
    }

    try {
      // Gantt 차트 생성
      ganttRef.current = new Gantt(`#${chartId}`, tasks, {
        view_mode: 'Day',
        date_format: 'YYYY-MM-DD',
        arrow_curve: 5,
        bar_height: GANTT_BAR_HEIGHT,
        bar_corner_radius: GANTT_BAR_CORNER_RADIUS,
        padding: GANTT_PADDING,
        custom_popup_html: function(task: any) {
          const entry = entryMap.get(task.id);
          if (!entry) {
            return `<div class="details-container"><h5>${task.name}</h5></div>`;
          }

          const startTime = formatTime(entry.startDateTime);
          const endTime = formatTime(entry.endDateTime);

          return `
            <div class="details-container">
              <h5>${task.name}</h5>
              <p>${startTime} ~ ${endTime}</p>
            </div>
          `;
        }
      });

      // 차트 색상 커스터마이징
      const svg = containerRef.current.querySelector('svg');
      if (svg) {
        const bars = svg.querySelectorAll('.bar');
        bars.forEach(bar => {
          bar.setAttribute('fill', color);
        });
      }
    } catch (err) {
      console.error('간트 차트 초기화 실패:', err);
    }

    return () => {
      ganttRef.current = null;
    };
  }, [entries, collapsedParentIds, chartId, color]);

  if (entries.length === 0) {
    return (
      <div className="gantt-empty">
        간트 차트를 표시할 데이터가 없습니다.
      </div>
    );
  }

  const containerId = `gantt-container-${chartId}`;

  return (
    <div className="gantt-container" id={containerId} ref={containerRef}>
      <div className="gantt-header">
        <h4>간트 차트</h4>
        <div className="copy-exclude">
          <CopyImageButton targetId={containerId} />
        </div>
      </div>
      <div id={chartId}></div>
    </div>
  );
}
