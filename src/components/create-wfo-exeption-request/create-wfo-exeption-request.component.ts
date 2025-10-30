import { CommonModule, isPlatformBrowser } from "@angular/common";
import {
  Component,
  OnInit,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { HttpService } from "../../service/http.service";
import { ConstantService } from "../../service/constant.service";
import { CommonService } from "../../service/common.service";

// PrimeNG imports
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import { InputTextareaModule } from "primeng/inputtextarea";
import { CardModule } from "primeng/card";
import { ToastModule } from "primeng/toast";
import { MultiSelectModule } from "primeng/multiselect";
import { TooltipModule } from "primeng/tooltip";
import { MessageService } from "primeng/api";

// Common components
import { DateRangePickerComponent } from "../../common/date-range-picker/date-range-picker.component";
import { CommonSelectComponent } from "../../common/common-select/common-select.component";
import { ToastrService } from "ngx-toastr";

@Component({
  selector: "app-create-wfo-exeption-request",
  templateUrl: "./create-wfo-exeption-request.component.html",
  styleUrls: ["./create-wfo-exeption-request.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    TooltipModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    CardModule,
    ToastModule,
    MultiSelectModule,
    DateRangePickerComponent,
    CommonSelectComponent,
  ],
  providers: [MessageService],
})
export class CreateWfoExeptionRequestComponent implements OnInit {
  formData: any = {
    employeeId: "",
    employeeName: "",
    projectName: [], // multi-select
    projectManager: "",
    exceptions: [
      {
        dateRange: [],
        primaryReason: null,
        otherReason: "",
        remarks: "",
        exceptionRequestedDays: 0,
      },
    ],
  };

  disabledDates: Date[] = [];
  projectList: any[] = [];

  reasonList = [
    { label: "Health Issue", value: "Health Issue" },
    { label: "Personal Work", value: "Personal Work" },
    { label: "Travel", value: "Travel" },
    { label: "Other", value: "other" },
  ];

  enableSameWeekRestriction = true;
  userRole: string = ""; // Store user role
  maxDaysPerWeek: number = 2; // Default to 2 days

  constructor(
    private cdr: ChangeDetectorRef,
    private http: HttpService,
    private constant: ConstantService,
    private commonService: CommonService,
    private messageService: MessageService,
    private toastr: ToastrService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.commonService.userDataLoaded$.subscribe(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.loadData();
        this.cdr.detectChanges();
      }
    });

    if (
      isPlatformBrowser(this.platformId) &&
      localStorage.getItem("employeeId")
    ) {
      this.loadData();
    }
  }

  loadData() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.formData.employeeId = localStorage.getItem("employeeId") || "N/A";
    this.formData.employeeName = localStorage.getItem("name") || "N/A";
    this.formData.projectManager =
      localStorage.getItem("projectManager") || "N/A";

    // Get user role and set max days per week
    this.userRole = localStorage.getItem("role") || "";
    this.maxDaysPerWeek = this.userRole === "MANAGER" ? 3 : 2;

    const storedProjects = localStorage.getItem("projectName");
    if (storedProjects) {
      const parsed = JSON.parse(storedProjects);
      this.projectList = parsed.map((p: any) => ({
        label: p.name,
        value: p.id,
      }));
      this.formData.projectName = parsed.map((p: any) => p.id);
    }
  }

  addMore() {
    const lastException =
      this.formData.exceptions[this.formData.exceptions.length - 1];

    // Validate required fields for last row before adding a new one
    if (!lastException.dateRange?.length) {
      this.toastr.error(
        "Please select a valid date range before adding another entry.",
        "Missing Field"
      );
      return;
    }

    if (!lastException.primaryReason) {
      this.toastr.error(
        "Please select a primary reason before adding another entry.",
        "Missing Field"
      );
      return;
    }

    // ✅ If validation passes, add new empty row
    this.formData.exceptions.push({
      dateRange: [],
      primaryReason: null,
      otherReason: "",
      remarks: "",
      exceptionRequestedDays: 0,
    });

    this.toastr.success("New exception row added successfully.", "Success");
  }

  deleteIndex(index: number) {
    if (this.formData.exceptions.length > 1) {
      this.formData.exceptions.splice(index, 1);
      this.updateDisabledDates();
    }
  }

  resetForm(showTaostr = true) {
    this.formData.projectName = [];
    this.formData.exceptions = [
      {
        dateRange: [],
        primaryReason: null,
        otherReason: "",
        remarks: "",
        exceptionRequestedDays: 0,
      },
    ];
    this.disabledDates = [];
    this.loadData();
    this.messageService.add({
      severity: "info",
      summary: "Form Reset",
      detail: "All fields have been cleared.",
    });
    if (showTaostr) {
      this.toastr.info("Form Reset Successfully");
    }
  }

  onDateRangeSelect(selectedDates: Date[], index: number): void {
    // Handle clearing or empty selection
    if (!selectedDates || selectedDates.length === 0) {
      this.formData.exceptions[index].exceptionRequestedDays = 0;
      this.formData.exceptions[index].calculatedDays = 0;
      this.updateDisabledDates();
      return;
    }

    // Validate dates are within allowed range (current month + next month only)
    if (!this.validateDateRange(selectedDates)) {
      this.toastr.warning(
        "Selected dates must be within current month and next month only."
      );
      this.formData.exceptions[index].dateRange = [];
      this.formData.exceptions[index].exceptionRequestedDays = 0;
      this.formData.exceptions[index].calculatedDays = 0;
      this.updateDisabledDates();
      return;
    }

    // Check for overlapping with OTHER exceptions (not current one)
    if (this.isOverlappingMultipleDates(index, selectedDates)) {
      this.toastr.warning(
        "One or more selected dates overlap with existing exceptions."
      );
      this.formData.exceptions[index].dateRange = [];
      this.formData.exceptions[index].exceptionRequestedDays = 0;
      this.formData.exceptions[index].calculatedDays = 0;
      this.updateDisabledDates();
      return;
    }

    // Calculate days based on selected dates
    this.calculateExceptionDaysForMultipleDates(
      this.formData.exceptions[index]
    );
    this.updateDisabledDates();
  }

  validateDateRange(dates: Date[]): boolean {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Calculate next month
    const nextMonth = currentMonth + 1;
    const nextMonthYear = nextMonth > 11 ? currentYear + 1 : currentYear;
    const adjustedNextMonth = nextMonth > 11 ? 0 : nextMonth;

    // Get last day of next month
    const lastDayOfNextMonth = new Date(
      nextMonthYear,
      adjustedNextMonth + 1,
      0
    );
    lastDayOfNextMonth.setHours(23, 59, 59, 999);

    // Check if all dates are within the allowed range
    return dates.every((date) => {
      const dateToCheck = new Date(date);
      dateToCheck.setHours(0, 0, 0, 0);
      return dateToCheck <= lastDayOfNextMonth;
    });
  }

  calculateExceptionDaysForMultipleDates(e: any): void {
    const selectedDates = e.dateRange;

    if (!selectedDates || selectedDates.length === 0) {
      e.exceptionRequestedDays = 0;
      e.calculatedDays = 0;
      return;
    }

    const getWeekNumber = (d: Date) => {
      const temp = new Date(
        Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
      );
      const dayNum = temp.getUTCDay() || 7;
      temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
      return Math.ceil(
        ((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
      );
    };

    // Count days already used by other exceptions per week
    const usedDaysByWeek: Record<string, number> = {};
    this.formData.exceptions.forEach((ex: any) => {
      if (ex === e || !ex.dateRange || ex.dateRange.length === 0) return;

      ex.dateRange.forEach((date: Date) => {
        const d = new Date(date);
        const weekKey = `${d.getFullYear()}-${getWeekNumber(d)}`;
        usedDaysByWeek[weekKey] = (usedDaysByWeek[weekKey] || 0) + 1;
      });
    });

    let allowedDays = 0;
    const rejectedDates: Date[] = [];

    // Process each selected date
    for (const date of selectedDates) {
      const current = new Date(date);

      // Skip weekends if restriction is enabled
      if (this.enableSameWeekRestriction) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          rejectedDates.push(current);
          continue;
        }
      }

      const weekKey = `${current.getFullYear()}-${getWeekNumber(current)}`;

      // Check if adding this day would exceed the weekly limit
      if ((usedDaysByWeek[weekKey] || 0) < this.maxDaysPerWeek) {
        allowedDays++;
        usedDaysByWeek[weekKey] = (usedDaysByWeek[weekKey] || 0) + 1;
      } else {
        rejectedDates.push(current);
      }
    }

    // Show warning if some dates were rejected due to weekly limit
    if (rejectedDates.length > 0) {
      const rejectedCount = rejectedDates.length;
      this.toastr.info(
        `${rejectedCount} date(s) excluded: either weekends or exceeding ${this.maxDaysPerWeek} days/week limit`,
        "Info"
      );
    }

    e.exceptionRequestedDays = allowedDays;
    e.calculatedDays = allowedDays;
  }

  isOverlappingMultipleDates(currentIndex: number, newDates: Date[]): boolean {
    if (!newDates || newDates.length === 0) return false;

    const newDateTimes = newDates.map((d) => new Date(d).setHours(0, 0, 0, 0));

    return this.formData.exceptions.some((ex: any, idx: number) => {
      if (idx === currentIndex || !ex.dateRange || ex.dateRange.length === 0) {
        return false;
      }

      const existingDateTimes = ex.dateRange.map((d: Date) =>
        new Date(d).setHours(0, 0, 0, 0)
      );

      // Check if any date in newDates exists in existing dates
      return newDateTimes.some((newTime) => existingDateTimes.includes(newTime));
    });
  }

  updateDisabledDates() {
    const allDates: Date[] = [];

    this.formData.exceptions.forEach((ex: any) => {
      if (ex.dateRange && ex.dateRange.length > 0) {
        // Add all selected dates to disabled list
        ex.dateRange.forEach((date: Date) => {
          allDates.push(new Date(date));
        });
      }
    });

    this.disabledDates = allDates;
  }

  onPrimaryReasonChange(exception: any) {
    if (exception.primaryReason?.value === "other") {
      exception.showOtherReason = true;
      exception.otherReason = "";
    } else {
      exception.showOtherReason = false;
      exception.otherReason = "";
    }
  }

  confirmOtherReason(exception: any) {
    if (!exception.otherReason?.trim()) return;
    exception.primaryReason = {
      label: exception.otherReason,
      value: exception.otherReason,
    };
    exception.showOtherReason = false;
  }

  cancelOtherReason(exception: any) {
    exception.otherReason = "";
    exception.primaryReason = null;
    exception.showOtherReason = false;
  }

  enforceMinMaxDays(exception: any, event: any): void {
    let inputValue = event.target.value;

    // Convert to number
    const enteredDays = Number(inputValue);

    // Get calculated max (based on date range calculation)
    const calculatedDays =
      exception.calculatedDays || exception.exceptionRequestedDays || 1;

    // Ensure at least 1 is allowed
    const minDays = 1;

    // Validation
    if (isNaN(enteredDays)) {
      event.target.value = exception.exceptionRequestedDays.toString();
      return;
    }

    if (enteredDays < minDays) {
      event.target.value = minDays;
      exception.exceptionRequestedDays = minDays;
    } else if (enteredDays > calculatedDays) {
      // Prevent typing numbers beyond calculated
      event.target.value = calculatedDays;
      exception.exceptionRequestedDays = calculatedDays;
      this.toastr.warning(
        `Maximum ${calculatedDays} days allowed based on selected dates`
      );
    } else {
      exception.exceptionRequestedDays = enteredDays;
    }
  }

validateForm(): boolean {
  // Check if at least one project is selected (optional — remove if not needed)
  if (!this.formData.projectName?.length) {
    this.toastr.warning("Please select at least one project.");
    return false;
  }

  // Check each exception entry
  for (const [i, ex] of this.formData.exceptions.entries()) {
    if (!ex.dateRange?.length) {
      this.toastr.warning(`Please select at least one date for row ${i + 1}.`);
      return false;
    }
  }

  // All good if dates exist
  return true;
}


  onSubmit(): any {
    if (!this.validateForm()) {
      return this.toastr.info("Please fill all required details");
    }

    const payload = {
      ...this.formData,
      projectId: 101,
      exceptions: this.formData.exceptions.map((ex: any) => {
        // For multiple dates, send as array or format as needed by your API
        const sortedDates = ex.dateRange.sort(
          (a: Date, b: Date) => a.getTime() - b.getTime()
        );

        return {
          ...ex,
          fromDate: sortedDates[0] || null, // First date
          toDate: sortedDates[sortedDates.length - 1] || null, // Last date
          selectedDates: sortedDates.map((d: Date) => d.toISOString()), // All selected dates as ISO strings
          dateRange: undefined,
          primaryReason:
            ex.primaryReason === "other"
              ? ex.otherReason
              : ex.primaryReason?.value || ex.primaryReason,
        };
      }),
    };

    this.http.postData(payload, this.constant.exceptionRequest).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success(
            "Exception request submitted successfully.",
            "Success"
          );
          this.resetForm(false);
        } else {
          this.toastr.error(
            res.message || "Error submitting form. Please try again.",
            "Error"
          );
        }
      },
      error: (error) => {
        console.error("Error submitting form:", error);
        this.toastr.error("API Error, Something Went Wrong");
      },
    });
  }

  getProjectNamesTooltip(): string {
    if (!this.formData.projectName?.length) return "No projects selected";

    const selectedProjects = this.projectList
      .filter((p) => this.formData.projectName.includes(p.value))
      .map((p) => p.label);

    return selectedProjects.join(", ");
  }
}