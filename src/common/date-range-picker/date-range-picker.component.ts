import { Component, Input, Output, EventEmitter } from "@angular/core";
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
export class DateRangePickerComponent {
  @Input() range: Date[] = [];
  @Output() rangeChange = new EventEmitter<Date[]>();
  @Input() disabledDates: Date[] = [];

  onSelect() {
    // Ensure emitted value is always an array
    this.rangeChange.emit(this.range ?? []);
  }
}
