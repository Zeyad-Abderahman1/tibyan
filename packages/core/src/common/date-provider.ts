/**
 * Date provider abstraction for deterministic testability of date-dependent domain logic.
 */
export interface DateProvider {
  today(): string; // Returns date formatted as YYYY-MM-DD
}

export class DefaultDateProvider implements DateProvider {
  today(): string {
    return new Date().toISOString().split('T')[0]!;
  }
}

export class FixedDateProvider implements DateProvider {
  constructor(private fixedDate: string) {}

  today(): string {
    return this.fixedDate;
  }

  setDate(newDate: string): void {
    this.fixedDate = newDate;
  }
}
