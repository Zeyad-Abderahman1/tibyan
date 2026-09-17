/**
 * Date and time provider abstraction for deterministic testability of date/time-dependent domain logic.
 * Uses local wall-clock semantics rather than UTC date slicing.
 */
export interface DateProvider {
  today(): string;    // Returns local calendar date formatted as YYYY-MM-DD
  nowTime(): string;  // Returns local wall-clock time formatted as HH:mm
}

export class DefaultDateProvider implements DateProvider {
  today(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  nowTime(): string {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}

export class FixedDateProvider implements DateProvider {
  constructor(
    private fixedDate: string,
    private fixedTime: string = '12:00'
  ) {}

  today(): string {
    return this.fixedDate;
  }

  nowTime(): string {
    return this.fixedTime;
  }

  setDate(newDate: string): void {
    this.fixedDate = newDate;
  }

  setTime(newTime: string): void {
    this.fixedTime = newTime;
  }
}
