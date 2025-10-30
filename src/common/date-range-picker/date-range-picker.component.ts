import { Component, Input, Output, EventEmitter, OnInit, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-date-range-picker',
  template: `
    <p-calendar 
      [(ngModel)]="selectedDates" 
      (ngModelChange)="onDateSelect($event)" 
      [selectionMode]="allowMultipleDates ? 'multiple' : 'range'"
      dateFormat="yy-mm-dd"
      [showIcon]="true" 
      appendTo="body" 
      [minDate]="minDate" 
      [maxDate]="calculatedMaxDate" 
      [disabledDates]="disabledDates"
      (onClearClick)="onClear()" 
      [showButtonBar]="true" 
      [placeholder]="allowMultipleDates ? 'Select multiple dates' : 'Select date range'">
    </p-calendar>
  `,
  standalone: true,
  imports: [CalendarModule, CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateRangePickerComponent),
      multi: true
    }
  ]
})
export class DateRangePickerComponent implements OnInit, ControlValueAccessor {
  @Input() range: Date[] = [];
  @Input() restrictionKey: string = ''; // Key to determine behavior
  @Input() disabledDates: Date[] = [];
  @Input() minDate: Date | null = null;
  @Input() maxDate: Date | null = null;
  
  @Output() rangeChange = new EventEmitter<Date[]>();

  selectedDates: Date[] | Date | null = [];
  allowMultipleDates: boolean = false;
  calculatedMaxDate: Date | null = null;

  private onChange: any = () => {};
  private onTouch: any = () => {};

  ngOnInit() {
    // Determine mode based on restrictionKey
    // If restrictionKey is NOT 'restrictMonthSelection', allow multiple date selection
    this.allowMultipleDates = this.restrictionKey !== 'restrictMonthSelection';
    
    // Calculate max date: last day of next month
    this.calculateMaxDate();
    
    if (this.range && this.range.length > 0) {
      this.selectedDates = this.allowMultipleDates ? [...this.range] : this.range;
    }
  }

  calculateMaxDate() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    // Calculate next month
    const nextMonth = currentMonth + 1;
    const nextMonthYear = nextMonth > 11 ? currentYear + 1 : currentYear;
    const adjustedNextMonth = nextMonth > 11 ? 0 : nextMonth;
    
    // Get last day of next month
    // By setting day to 0 of the month after next, we get the last day of next month
    const lastDayOfNextMonth = new Date(nextMonthYear, adjustedNextMonth + 1, 0);
    
    // Use the provided maxDate if it's earlier, otherwise use calculated max
    if (this.maxDate && this.maxDate < lastDayOfNextMonth) {
      this.calculatedMaxDate = this.maxDate;
    } else {
      this.calculatedMaxDate = lastDayOfNextMonth;
    }
  }

  onDateSelect(dates: Date[] | Date | null) {
    if (!dates) {
      this.selectedDates = [];
      this.range = [];
      this.rangeChange.emit([]);
      this.onChange([]);
      return;
    }

    // Handle multiple date selection mode
    if (this.allowMultipleDates) {
      const dateArray = Array.isArray(dates) ? dates : [dates];
      
      // Filter out dates beyond max allowed date
      const validDates = dateArray.filter(date => {
        return this.calculatedMaxDate ? date <= this.calculatedMaxDate : true;
      });
      
      // Sort dates chronologically
      const sortedDates = validDates.sort((a, b) => a.getTime() - b.getTime());
      
      this.selectedDates = sortedDates;
      this.range = sortedDates;
      this.rangeChange.emit(sortedDates);
      this.onChange(sortedDates);
    } 
    // Handle range selection mode (original behavior)
    else {
      const dateArray = Array.isArray(dates) ? dates : [dates];
      this.selectedDates = dateArray;
      this.range = dateArray;
      this.rangeChange.emit(dateArray);
      this.onChange(dateArray);
    }
  }

  onClear() {
    this.selectedDates = [];
    this.range = [];
    this.rangeChange.emit([]);
    this.onChange([]);
  }

  // ControlValueAccessor methods
  writeValue(value: Date[]): void {
    if (value) {
      this.range = value;
      this.selectedDates = this.allowMultipleDates ? [...value] : value;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }
}