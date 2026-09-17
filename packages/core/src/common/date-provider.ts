/**
 * Date and time provider abstraction for deterministic testability of date/time-dependent domain logic.
 * Uses local wall-clock semantics rather than UTC date slicing.
 */
export interface DateProvider {
  today(): string;    // Returns local calendar date formatted as YYYY-MM-DD
  nowTime(): string;  // Returns local wall-clock time formatted as HH:mm
  nowIso?(): string;  // Returns ISO timestamp
  nowDate?(): Date;   // Returns Date object
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

  nowIso(): string {
    return new Date().toISOString();
  }

  nowDate(): Date {
    return new Date();
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

  nowDate(): Date {
    return new Date(`${this.fixedDate}T${this.fixedTime}:00.000Z`);
  }

  nowIso(): string {
    return this.nowDate().toISOString();
  }

  setDate(newDate: string): void {
    this.fixedDate = newDate;
  }

  setTime(newTime: string): void {
    this.fixedTime = newTime;
  }

  advanceDays(days: number): void {
    const current = this.nowDate();
    current.setUTCDate(current.getUTCDate() + days);
    const year = current.getUTCFullYear();
    const month = String(current.getUTCMonth() + 1).padStart(2, '0');
    const day = String(current.getUTCDate()).padStart(2, '0');
    this.fixedDate = `${year}-${month}-${day}`;
  }
}
