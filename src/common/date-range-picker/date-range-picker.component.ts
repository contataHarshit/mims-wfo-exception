import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ChangeDetectorRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { CalendarModule } from "primeng/calendar";
import { FormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { InputTextareaModule } from "primeng/inputtextarea";

@Component({
  selector: "app-date-range-picker",
  standalone: true,
  imports: [
    CommonModule,
    CalendarModule,
    FormsModule,
    ButtonModule,
    InputTextareaModule,
  ],
  templateUrl: "./date-range-picker.component.html",
  styleUrls: ["./date-range-picker.component.scss"],
})
export class DateRangePickerComponent implements OnInit, OnChanges {
  @Input() range: Date[] = [];
  @Input() disabledDates: Date[] = [];
  @Input() minDate: Date | null = null;
  @Input() maxDate: Date | null = null;

  @Output() rangeChange = new EventEmitter<Date[]>();
  @Output() okClick = new EventEmitter<Date[]>();

  @ViewChild("calendar", { static: true }) calendar: any;

  tempSelection: Date[] = [];
  lastApplied: Date[] = [];
  internalDisabledDates: Date[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.tempSelection = Array.isArray(this.range) ? [...this.range] : [];
    this.lastApplied = Array.isArray(this.range) ? [...this.range] : [];
    this.updateInternalDisabledDates();
  }

  ngOnChanges(changes: SimpleChanges) {
    // ✅ Update disabled dates whenever the input changes
    if (changes["disabledDates"]) {
      this.updateInternalDisabledDates();
      this.cdr.detectChanges();
    }

    // ✅ Update range if changed externally
    if (changes["range"] && !changes["range"].firstChange) {
      this.tempSelection = Array.isArray(this.range) ? [...this.range] : [];
      this.lastApplied = Array.isArray(this.range) ? [...this.range] : [];
    }
  }

  // ✅ Helper method to properly clone and normalize disabled dates
  private updateInternalDisabledDates() {
    if (!this.disabledDates || !Array.isArray(this.disabledDates)) {
      this.internalDisabledDates = [];
      return;
    }

    // Clone and normalize all disabled dates to midnight
    this.internalDisabledDates = this.disabledDates.map((d) => {
      const newDate = new Date(d);
      newDate.setHours(0, 0, 0, 0);
      return newDate;
    });
  }

  onCalendarShow() {
    this.tempSelection = [...this.lastApplied];
  }

  onCalendarHide() {
    this.cancelSelection(false);
  }

  confirmSelection() {
    this.range = [...this.tempSelection];
    this.lastApplied = [...this.tempSelection];
    this.rangeChange.emit(this.range);
    this.okClick.emit(this.range);
    this.hideCalendar();
  }

  cancelSelection(manual: boolean = false) {
    this.tempSelection = [];
    this.hideCalendar();
  }

  hideCalendar() {
    if (this.calendar?.hide) {
      this.calendar.hide();
    } else if (this.calendar) {
      this.calendar.overlayVisible = false;
    }
  }

get displayText(): string {
  if (!this.range?.length) return "";
  
  return this.range
    .map((d) => {
      const day = d.getDate();
      const month = d.toLocaleDateString("en-GB", { month: "short" }); // Use "short" for abbreviated month
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    })
    .join(", ");
}


  openCalendar() {
    if (this.calendar?.show) {
      this.calendar.show();
    } else if (this.calendar) {
      this.calendar.overlayVisible = true;
    }
  }
  
}
