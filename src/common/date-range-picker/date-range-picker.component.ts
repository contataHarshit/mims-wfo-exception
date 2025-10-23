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

  minDate: Date | undefined;
  maxDate: Date | undefined;
  allDisabledDates: Date[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes["disabledDates"]) {
      this.updateAllDisabledDates();
    }

    // Reset restrictions when range is cleared externally
    if (changes["range"] && (!this.range || this.range.length === 0)) {
      this.clearRestrictions();
    }
  }

  onSelect() {
    if (this.restrictionKey !== "restrictWeekSelection") {
      this.rangeChange.emit(this.range ?? []);
      return;
    }

    // When first date is selected
    if (this.range && this.range.length === 1) {
      const startDate = new Date(this.range[0]);
      const dayOfWeek = startDate.getDay();

      // Prevent weekend selection (shouldn't happen but safety check)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        this.range = [];
        this.clearRestrictions();
        this.rangeChange.emit([]);
        return;
      }

      this.applyWeekRestrictions(startDate);
      this.cdr.detectChanges(); // Force change detection
    }
    // When range is complete
    else if (this.range && this.range.length === 2) {
      // Keep the restrictions until user clears
    }
    // When range is cleared
    else {
      this.clearRestrictions();
    }

    this.rangeChange.emit(this.range ?? []);
  }

  onClear() {
    this.range = [];
    this.clearRestrictions();
    this.rangeChange.emit([]);
  }

  private applyWeekRestrictions(startDate: Date) {
    // Get Monday and Friday of the selected week
    const monday = this.getMondayOfWeek(startDate);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4); // Friday is 4 days after Monday

    // Set min/max date to restrict to the same week
    this.minDate = new Date(monday);
    this.maxDate = new Date(friday);

    // Update disabled dates to include weekends
    this.updateAllDisabledDates();
  }

  private clearRestrictions() {
    this.minDate = undefined;
    this.maxDate = undefined;
    this.updateAllDisabledDates();
  }

  private updateAllDisabledDates() {
    // Start with dates disabled by parent component
    const disabled: Date[] = [...this.disabledDates];

    // Only add weekends if restriction is active
    if (this.restrictionKey === "restrictWeekSelection") {
      // Generate weekend dates for a reasonable range
      const today = new Date();
      const startDate = new Date(today);
      startDate.setFullYear(today.getFullYear() - 1);
      const endDate = new Date(today);
      endDate.setFullYear(today.getFullYear() + 2);

      let current = new Date(startDate);
      while (current <= endDate) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          disabled.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }
    }

    this.allDisabledDates = disabled;
  }

  private getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
