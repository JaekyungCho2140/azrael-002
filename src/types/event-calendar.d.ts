/**
 * Event Calendar Type Declarations
 */

declare module '@event-calendar/core' {
  export interface CalendarOptions {
    view?: string;
    date?: Date;
    events?: any[];
    eventDidMount?: (info: any) => void;
    headerToolbar?: {
      start?: string;
      center?: string;
      end?: string;
    };
  }

  export interface CalendarProps {
    plugins?: any[];
    options?: CalendarOptions;
  }

  export interface CalendarConfig {
    target: HTMLElement;
    props: CalendarProps;
  }

  export class Calendar {
    constructor(config: CalendarConfig);
    $destroy(): void;
  }
}

declare module '@event-calendar/day-grid' {
  const DayGrid: any;
  export default DayGrid;
}
