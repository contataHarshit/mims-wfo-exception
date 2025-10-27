import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { CalendarModule } from "primeng/calendar";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-date-range-picker",
  standalone: true,
  imports: [CommonModule, CalendarModule, FormsModule],
  templateUrl: "./date-range-picker.component.html",
  styleUrls: ["./date-range-picker.component.scss"],
})
export class DateRangePickerComponent implements OnChanges {
  @Input() range: Date[] = [];
  @Output() rangeChange = new EventEmitter<Date[]>();
  @Input() disabledDates: Date[] = [];
  @Input() restrictionKey: string = "";

  minDate?: Date;
  maxDate?: Date;
  allDisabledDates: Date[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["disabledDates"]) {
      this.rebuildDisabledDates();
    }
    if (changes["range"] && (!this.range || this.range.length === 0)) {
      this.clearRestrictions();
    }
  }

  onModelChange(value: Date[] | null): void {
    if (this.restrictionKey !== "restrictMonthSelection") {
      this.rangeChange.emit(value ?? []);
      return;
    }

    // Case 1: No selection
    if (!value || value.length === 0) {
      this.clearRestrictions();
      this.rangeChange.emit([]);
      return;
    }

    // Case 2: First date selected — PrimeNG emits [Date, null]
    if (value.length === 2 && value[0] && value[1] === null) {
      const startDate = new Date(value[0]);
      this.applyMonthRestrictions(startDate);
      this.rangeChange.emit(value);
      return;
    }

    // Case 3: Single date selected (alt pattern)
    if (value.length === 1 && value[0]) {
      const startDate = new Date(value[0]);
      this.applyMonthRestrictions(startDate);
      this.rangeChange.emit(value);
      return;
    }

    // Case 4: Both dates selected
    if (value.length === 2 && value[0] && value[1]) {
      const startDate = new Date(value[0]);
      const endDate = new Date(value[1]);
      const maxAllowed = this.getMaxDateForMonthRestriction(startDate);

      if (endDate > maxAllowed) {
        // Clip end date to max allowed
        this.range = [startDate, maxAllowed];
        this.rangeChange.emit([startDate, maxAllowed]);
        this.cdr.detectChanges();
      } else {
        this.rangeChange.emit(value);
      }
    }
  }

  onClear(): void {
    this.range = [];
    this.clearRestrictions();
    this.rangeChange.emit([]);
  }

  private applyMonthRestrictions(startDate: Date): void {
    const maxDate = this.getMaxDateForMonthRestriction(startDate);

    this.minDate = new Date(startDate);
    this.minDate.setHours(0, 0, 0, 0);

    this.maxDate = new Date(maxDate);
    this.maxDate.setHours(23, 59, 59, 999);

    this.rebuildDisabledDates(startDate, maxDate);
    this.cdr.detectChanges();
  }

  private getMaxDateForMonthRestriction(startDate: Date): Date {
    const max = new Date(startDate);
    max.setMonth(max.getMonth() + 1);
    // Fix overflow (Jan 31 → Mar 2 issue)
    if (max.getDate() !== startDate.getDate()) {
      max.setDate(0);
    }
    return max;
  }

  private rebuildDisabledDates(startDate?: Date, maxDate?: Date): void {
    const disabled: Date[] = [];

    if (this.disabledDates?.length) {
      disabled.push(...this.disabledDates);
    }

    if (startDate && maxDate) {
      const start = new Date(startDate);
      const end = new Date(maxDate);

      const earliest = new Date(start);
      earliest.setFullYear(start.getFullYear() - 1);

      const latest = new Date(end);
      latest.setFullYear(end.getFullYear() + 1);

      const sTime = start.getTime();
      const eTime = end.getTime();

      const cursor = new Date(earliest);
      while (cursor <= latest) {
        const t = cursor.getTime();
        if (t < sTime || t > eTime) {
          disabled.push(new Date(cursor));
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    this.allDisabledDates = [...disabled];
  }

  private clearRestrictions(): void {
    this.minDate = undefined;
    this.maxDate = undefined;
    this.allDisabledDates = this.disabledDates ? [...this.disabledDates] : [];
    this.cdr.detectChanges();
  }
}
