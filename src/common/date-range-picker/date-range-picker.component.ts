import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarModule } from 'primeng/calendar';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { NgZone } from '@angular/core';

@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  imports: [CommonModule, CalendarModule, FormsModule, ButtonModule, InputTextareaModule],
  templateUrl: './date-range-picker.component.html',
  styleUrls: ['./date-range-picker.component.scss'],
})
export class DateRangePickerComponent implements OnInit {
  @Input() range: Date[] = [];
  @Input() disabledDates: Date[] = [];
  @Output() rangeChange = new EventEmitter<Date[]>();
  @Output() okClick = new EventEmitter<Date[]>();
@Input() minDate: Date | null = null; // 👈 Added
  @Input() maxDate: Date | null = null; 
  @ViewChild('calendar', { static: true }) calendar: any;

  tempSelection: Date[] = [];
  lastApplied: Date[] = [];

  constructor(private hostRef: ElementRef,private ngZone: NgZone) {}

  ngOnInit() {
    this.tempSelection = Array.isArray(this.range) ? [...this.range] : [];
    this.lastApplied = Array.isArray(this.range) ? [...this.range] : [];
  }

  onCalendarShow() {
    this.tempSelection = [...this.lastApplied];
  }

onCalendarHide() {
  console.log("🟡 onCalendarHide() fired - overlay closed automatically");
  this.cancelSelection(false);
}


  onDateSelect() {}

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

  if (manual) {
    console.log("❌ Cancel button clicked manually");
  } else {
    console.log("🔹 Calendar closed automatically");
  }
}


  hideCalendar() {
    if (this.calendar?.hide) {
      this.calendar.hide();
    } else if (this.calendar) {
      this.calendar.overlayVisible = false;
    }
  }

  get displayText(): string {
    if (!this.range?.length) return '';
    return this.range.map((d) => d.toISOString().split('T')[0]).join('\n');
  }

  openCalendar() {
    if (this.calendar?.show) {
      this.calendar.show();
    } else if (this.calendar) {
      this.calendar.overlayVisible = true;
    }
  }
}
