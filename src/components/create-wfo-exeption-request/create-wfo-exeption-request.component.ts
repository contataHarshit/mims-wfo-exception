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
// import { ToastrModule, ToastrService } from "ngx-toastr";
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
    CardModule,
    ToastModule,
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

  resetForm() {
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
    this.toastr.info("Form Reset Successfully");
  }

  onDateRangeSelect(range: Date[], index: number): void {
    // Handle clearing or incomplete selection
    if (!range || range.length === 0 || range.length < 2 || !range[1]) {
      this.formData.exceptions[index].exceptionRequestedDays = 0;
      // Immediately update disabled dates to exclude this row's dates
      this.updateDisabledDates();
      return;
    }

    // Check for overlapping with OTHER exceptions (not current one)
    if (this.isOverlapping(index, range)) {
      this.messageService.add({
        severity: "warn",
        summary: "Invalid Range",
        detail: "Selected date range overlaps with an existing one.",
      });
      this.formData.exceptions[index].dateRange = [];
      this.formData.exceptions[index].exceptionRequestedDays = 0;
      this.updateDisabledDates();
      return;
    }

    // Calculate days and update disabled dates
    this.calculateExceptionDays(this.formData.exceptions[index]);
    this.updateDisabledDates();
  }

  isOverlapping(currentIndex: number, newRange: Date[]): boolean {
    if (!newRange || newRange.length < 2) return false;
    const [start, end] = newRange.map((d) => new Date(d).getTime());

    return this.formData.exceptions.some((ex: any, idx: number) => {
      if (idx === currentIndex || !ex.dateRange || ex.dateRange.length < 2)
        return false;
      const [s, e] = ex.dateRange.map((d: Date) => new Date(d).getTime());
      return start <= e && end >= s;
    });
  }

  updateDisabledDates() {
    const allDates: Date[] = [];
    this.formData.exceptions.forEach((ex: any) => {
      if (ex.dateRange && ex.dateRange.length === 2) {
        const [start, end] = ex.dateRange;
        let current = new Date(start);
        while (current <= new Date(end)) {
          allDates.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }
      }
    });
    this.disabledDates = allDates;
  }

  calculateExceptionDays(e: any): void {
    const range = e.dateRange;
    if (!range || range.length < 2) {
      e.exceptionRequestedDays = 0;
      e.calculatedDays = 0; // reset if invalid range
      return;
    }

    const [fromDate, toDate] = range;
    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (end < start) {
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

    const usedDaysByWeek: Record<string, number> = {};
    this.formData.exceptions.forEach((ex: any) => {
      if (ex === e || !ex.dateRange || ex.dateRange.length < 2) return;
      const [s, en] = ex.dateRange.map((d: Date) => new Date(d));
      let current = new Date(s);
      while (current <= en) {
        const weekKey = `${current.getFullYear()}-${getWeekNumber(current)}`;
        usedDaysByWeek[weekKey] = (usedDaysByWeek[weekKey] || 0) + 1;
        current.setDate(current.getDate() + 1);
      }
    });

    let allowedDays = 0;
    let current = new Date(start);
    while (current <= end) {
      if (this.enableSameWeekRestriction) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          current.setDate(current.getDate() + 1);
          continue;
        }
      }

      const weekKey = `${current.getFullYear()}-${getWeekNumber(current)}`;
      if ((usedDaysByWeek[weekKey] || 0) < this.maxDaysPerWeek) {
        allowedDays++;
        usedDaysByWeek[weekKey] = (usedDaysByWeek[weekKey] || 0) + 1;
      }
      current.setDate(current.getDate() + 1);
    }

    e.exceptionRequestedDays = allowedDays;
    e.calculatedDays = allowedDays; // ✅ store for later manual validation
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
    } else {
      exception.exceptionRequestedDays = enteredDays;
    }
  }

  validateForm(): boolean {
    if (!this.formData.projectName?.length) {
      this.messageService.add({
        severity: "warn",
        summary: "Missing Field",
        detail: "Please select at least one project.",
      });
      return false;
    }

    for (const [i, ex] of this.formData.exceptions.entries()) {
      if (!ex.dateRange?.length) {
        this.messageService.add({
          severity: "warn",
          summary: "Invalid Entry",
          detail: `Please select a valid date range for row ${i + 1}.`,
        });
        return false;
      }
      if (!ex.primaryReason) {
        this.messageService.add({
          severity: "warn",
          summary: "Missing Field",
          detail: `Please select a primary reason for row ${i + 1}.`,
        });
        return false;
      }
    }

    return true;
  }

  onSubmit(): any {
    if (!this.validateForm())
      return this.toastr.info("Please fill All Details");

    const payload = {
      ...this.formData,
      projectId: 101,
      exceptions: this.formData.exceptions.map((ex: any) => ({
        ...ex,
        fromDate: ex.dateRange[0] || null,
        toDate: ex.dateRange[1] || null,
        dateRange: undefined,
        primaryReason:
          ex.primaryReason === "other"
            ? ex.otherReason
            : ex.primaryReason?.value || ex.primaryReason,
      })),
    };

    this.http.postData(payload, this.constant.exceptionRequest).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success(
            "Exception request submitted successfully.",
            "Success"
          );
          this.messageService.add({
            severity: "success",
            summary: "Success",
            detail: "Exception request submitted successfully.",
          });
          this.resetForm();
        } else {
          this.toastr.error(
            "Error submitting form. Please try again.",
            "Error"
          );
        }
      },
      error: (error) => {
        alert("Error submitting form. Please try again.");
        console.error("Error submitting form:", error);
        this.toastr.error("Api Error, Something Went Wrong");
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Error submitting form. Please try again.",
        });
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
