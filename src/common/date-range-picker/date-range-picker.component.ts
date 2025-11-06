import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
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
  internalDisabledDates: Date[] = []; // ✅ internal cloned version

  ngOnInit() {
    this.tempSelection = Array.isArray(this.range) ? [...this.range] : [];
    this.lastApplied = Array.isArray(this.range) ? [...this.range] : [];
    this.internalDisabledDates = [...(this.disabledDates || [])];
  }

  // ✅ react to disabledDates updates dynamically
  ngOnChanges(changes: SimpleChanges) {
    if (changes["disabledDates"] && changes["disabledDates"].currentValue) {
      // Clone to prevent reference sharing
      this.internalDisabledDates = [
        ...changes["disabledDates"].currentValue.map((d: Date) => new Date(d)),
      ];
    }
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
    return this.range.map((d) => d.toISOString().split("T")[0]).join("\n");
  }

  openCalendar() {
    if (this.calendar?.show) {
      this.calendar.show();
    } else if (this.calendar) {
      this.calendar.overlayVisible = true;
    }
  }
}
