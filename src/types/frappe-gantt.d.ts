/**
 * Frappe Gantt Type Declarations
 */

declare module 'frappe-gantt' {
  export interface GanttTask {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    dependencies?: string;
    custom_class?: string;
  }

  export interface GanttOptions {
    view_mode?: 'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month';
    date_format?: string;
    arrow_curve?: number;
    bar_height?: number;
    bar_corner_radius?: number;
    padding?: number;
    language?: string;
    custom_popup_html?: (task: GanttTask) => string;
  }

  export default class Gantt {
    constructor(selector: string, tasks: GanttTask[], options?: GanttOptions);
    change_view_mode(mode: string): void;
    refresh(tasks: GanttTask[]): void;
  }
}
