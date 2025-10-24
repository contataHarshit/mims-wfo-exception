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
  disabledDays: number[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes["disabledDates"]) {
      this.rebuildDisabledDates();
    }

    if (changes["range"]) {
      if (!this.range || this.range.length === 0) {
        this.clearRestrictions();
      }
    }
  }

  onModelChange(value: Date[] | null) {
    console.log("=== MODEL CHANGE ===");
    console.log("Value:", value);
    console.log("Value length:", value?.length);

    if (this.restrictionKey !== "restrictWeekSelection") {
      this.rangeChange.emit(value ?? []);
      return;
    }

    // Clear state if no value
    if (!value || value.length === 0) {
      console.log("No value - clearing");
      this.clearRestrictions();
      this.rangeChange.emit([]);
      return;
    }

    // *** KEY FIX: Check for [Date, null] pattern (first date selected) ***
    if (value.length === 2 && value[0] && value[1] === null) {
      const startDate = new Date(value[0]);
      const dayOfWeek = startDate.getDay();

      console.log("✓✓✓ FIRST DATE SELECTED (with null) ✓✓✓");
      console.log("Start date:", startDate);
      console.log("Day of week:", dayOfWeek);

      // Prevent weekend selection
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        console.log("Weekend selected - rejecting");
        this.range = [];
        this.clearRestrictions();
        this.rangeChange.emit([]);
        return;
      }

      // Apply restrictions IMMEDIATELY
      console.log(">>> Applying restrictions NOW <<<");
      this.applyWeekRestrictions(startDate);

      this.rangeChange.emit(value);
      return;
    }

    // First date selected (alternative pattern - just in case)
    if (value.length === 1 && value[0]) {
      const startDate = new Date(value[0]);
      const dayOfWeek = startDate.getDay();

      console.log("FIRST DATE SELECTED (single):", startDate);

      // Prevent weekend selection
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        console.log("Weekend selected - rejecting");
        this.range = [];
        this.clearRestrictions();
        this.rangeChange.emit([]);
        return;
      }

      this.applyWeekRestrictions(startDate);
      this.rangeChange.emit(value);
      return;
    }

    // Both dates selected (both are Date objects, no null)
    if (value.length === 2 && value[0] && value[1] && value[1] !== null) {
      const startDate = new Date(value[0]);
      const endDate = new Date(value[1]);
      const friday = this.getFridayOfWeek(startDate);

      console.log("✓✓✓ BOTH DATES SELECTED ✓✓✓");
      console.log("Start:", startDate);
      console.log("End:", endDate);
      console.log("Friday:", friday);

      // Check if end date exceeds Friday
      const endTime = new Date(endDate).setHours(0, 0, 0, 0);
      const fridayTime = new Date(friday).setHours(0, 0, 0, 0);

      if (endTime > fridayTime) {
        console.log("❌ End date exceeds Friday - resetting");
        this.range = [startDate, null as any];
        this.applyWeekRestrictions(startDate);
        this.rangeChange.emit([startDate, null as any]);
        return;
      }

      // Valid range
      console.log("✓ Valid range selected");
      this.rangeChange.emit(value);
      return;
    }
  }

  onClear() {
    console.log("CLEAR CLICKED");
    this.range = [];
    this.clearRestrictions();
    this.rangeChange.emit([]);
  }

  private applyWeekRestrictions(startDate: Date) {
    console.log("╔════════════════════════════════════╗");
    console.log("║   APPLYING WEEK RESTRICTIONS      ║");
    console.log("╚════════════════════════════════════╝");

    const friday = this.getFridayOfWeek(startDate);

    console.log("Start Date:", startDate.toDateString());
    console.log("Friday of week:", friday.toDateString());

    // Set boundaries
    this.minDate = new Date(startDate);
    this.minDate.setHours(0, 0, 0, 0);

    this.maxDate = new Date(friday);
    this.maxDate.setHours(23, 59, 59, 999);

    console.log("✓ Min Date set:", this.minDate.toDateString());
    console.log("✓ Max Date set:", this.maxDate.toDateString());

    // Always disable weekends
    this.disabledDays = [0, 6];
    console.log("✓ Weekends disabled (Sun, Sat)");

    // Rebuild disabled dates array
    this.rebuildDisabledDates(startDate, friday);

    // Force multiple change detection cycles
    this.cdr.detectChanges();
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);

    console.log("✓✓✓ RESTRICTIONS APPLIED ✓✓✓");
    console.log("════════════════════════════════════");
  }

  private rebuildDisabledDates(startDate?: Date, friday?: Date) {
    console.log("→ Rebuilding disabled dates array...");

    // Start fresh - create completely new array
    const disabled: Date[] = [];

    // Add parent component's disabled dates
    if (this.disabledDates && this.disabledDates.length > 0) {
      disabled.push(...this.disabledDates);
    }

    // If we have a selected range, disable everything outside it
    if (startDate && friday) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(friday);
      end.setHours(0, 0, 0, 0);

      const startTime = start.getTime();
      const endTime = end.getTime();

      // Disable dates for a 3 year range
      const earliestDate = new Date();
      earliestDate.setFullYear(earliestDate.getFullYear() - 1);
      earliestDate.setMonth(0, 1);
      earliestDate.setHours(0, 0, 0, 0);

      const latestDate = new Date();
      latestDate.setFullYear(latestDate.getFullYear() + 2);
      latestDate.setMonth(11, 31);
      latestDate.setHours(0, 0, 0, 0);

      let current = new Date(earliestDate);
      let count = 0;

      while (current <= latestDate) {
        const currentTime = new Date(current).setHours(0, 0, 0, 0);

        // Disable if outside the valid range
        if (currentTime < startTime || currentTime > endTime) {
          disabled.push(new Date(current));
          count++;
        }

        current.setDate(current.getDate() + 1);
      }

      console.log(`→ Disabled ${count} dates outside the range`);
      console.log(`→ Total disabled dates: ${disabled.length}`);
    }

    // IMPORTANT: Create new array reference for change detection
    this.allDisabledDates = [...disabled];
  }

  private clearRestrictions() {
    console.log("→ Clearing all restrictions");

    this.minDate = undefined;
    this.maxDate = undefined;
    this.disabledDays =
      this.restrictionKey === "restrictWeekSelection" ? [0, 6] : [];

    // Reset to only parent's disabled dates
    this.allDisabledDates = this.disabledDates ? [...this.disabledDates] : [];

    this.cdr.detectChanges();
  }

  private getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getFridayOfWeek(date: Date): Date {
    const monday = this.getMondayOfWeek(date);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(0, 0, 0, 0);
    return friday;
  }
}
