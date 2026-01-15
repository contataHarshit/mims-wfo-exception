import { CommonModule, isPlatformBrowser } from "@angular/common";
import {
  Component,
  OnInit,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
  OnDestroy,
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
import { addDays, endOfMonth } from "date-fns";
import { finalize, takeUntil, filter, take } from "rxjs/operators";
import { Subject } from "rxjs";
import { CommonFormActionComponent } from "../../common/common-form-action/common-form-action.component";
interface ExceptionEntry {
  dateRange: Date[];
  exceptionRequestedDays: string;
  primaryReason: any;
  remarks: string;
  showOtherReason?: boolean;
  otherReason?: string;
}

interface FormData {
  employeeId: string;
  employeeName: string;
  projectName: string[];
  projectManager: string;
  exceptions: ExceptionEntry[];
  employeeNumber: any;
}

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
    CommonFormActionComponent
  ],
  providers: [MessageService],
})
export class CreateWfoExeptionRequestComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private formDataLoadedOnce = false;
  private isDataLoaded = false;

  formData: FormData = {
    employeeId: "",
    employeeName: "",
    projectName: [],
    projectManager: "",
    employeeNumber: "",
    exceptions: [
      {
        dateRange: [],
        exceptionRequestedDays: "",
        primaryReason: null,
        remarks: "",
        showOtherReason: false,
        otherReason: "",
      },
    ],
  };

  disabledDates: Date[] = [];
  apiDisabledDates: Date[] = [];
  projectList: any[] = [];

  reasonList: any = [];
  maxSelectableDate: any;
  minSelectableDate: any;

  constructor(
    private cdr: ChangeDetectorRef,
    private http: HttpService,
    private constant: ConstantService,
    private commonService: CommonService,
    private messageService: MessageService,
    private toastr: ToastrService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.commonService.setLoading(true);

    // Subscribe to employee data changes
    this.commonService.employeeName$
      .pipe(takeUntil(this.destroy$))
      .subscribe((name) => {
        this.formData.employeeName = name;
        this.cdr.detectChanges();
      });
    this.formData.employeeNumber = localStorage.getItem("employeeNumber");
    this.commonService.employeeNumber$
      .pipe(takeUntil(this.destroy$))
      .subscribe((number) => {
        if (!this.formData.employeeNumber) {
          this.formData.employeeNumber = number;
          this.cdr.detectChanges();
        }
      });

    this.commonService.projectManager$
      .pipe(takeUntil(this.destroy$))
      .subscribe((manager) => {
        this.formData.projectManager = manager;
        this.cdr.detectChanges();
      });

    this.commonService.projectName$
      .pipe(takeUntil(this.destroy$))
      .subscribe((projectName) => {
        if (projectName) {
          this.formData.projectName = [projectName];
        }
        this.cdr.detectChanges();
      });

    // CRITICAL: Wait for authentication to complete before making API calls
    await this.waitForAuthComplete();

    // Now it's safe to load form data
    this.loadFormData();

    // Populate employee info from the service
    this.populateEmployeeInfo();
    this.reasonList = this.commonService.config.reasonList || [];
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Waits for authentication and user data to be fully loaded
   * This ensures token is set in localStorage before any API calls
   */
  private async waitForAuthComplete(): Promise<void> {
    return new Promise((resolve) => {
      // If data is already loaded, resolve immediately
      if (this.isDataLoaded) {
        resolve();
        return;
      }

      // Check if userDataLoaded$ exists on commonService
      if (!this.commonService.userDataLoaded$) {
        console.warn("userDataLoaded$ not available, proceeding without wait");
        resolve();
        return;
      }

      // Subscribe to userDataLoaded$ and wait for it to emit true
      this.commonService.userDataLoaded$
        .pipe(
          filter((loaded) => loaded === true), // Only proceed when loaded is true
          take(1) // Take only the first emission and unsubscribe
        )
        .subscribe(() => {
          this.isDataLoaded = true;
          resolve();
        });

      // Fallback timeout in case userDataLoaded$ never emits
      setTimeout(() => {
        if (!this.isDataLoaded) {
          console.warn("Auth wait timeout, proceeding anyway");
          this.isDataLoaded = true;
          resolve();
        }
      }, 5000); // 5 second timeout
    });
  }

  private populateEmployeeInfo(): void {
    try {
      const empNum = this.commonService.employeeNumber;
      const empName = this.commonService.employeeName;
      const projManager = this.commonService.projectManager;

      if (empNum) this.formData.employeeNumber = empNum;
      if (empName) this.formData.employeeName = empName;
      if (projManager) this.formData.projectManager = projManager;

      this.cdr.detectChanges();
    } catch (e) {
      console.error("Error populating employee info:", e);
    }
  }

  private loadFormData(
    month: number = new Date().getMonth() + 1,
    year: number = new Date().getFullYear(),
    sendRequest = false
  ): void {
    if (this.formDataLoadedOnce && !sendRequest) return; // prevent duplicate loads
    this.formDataLoadedOnce = true;

    // Set date range
    const { minDate, maxDate } = this.getAllowedDateRange();
    this.minSelectableDate = minDate;
    this.maxSelectableDate = maxDate;

    // Fetch disabled dates
    this.http
      .getData(`${this.constant.selectedDates}?month=${month}&year=${year}`)
      .pipe(finalize(() => this.commonService.setLoading(false)))
      .subscribe({
        next: (res: any) => {
          if (res?.success && res.data?.dates) {
            this.apiDisabledDates = res.data.dates.map((dateStr: string) => {
              const date = new Date(dateStr);
              date.setHours(0, 0, 0, 0);
              return date;
            });
            this.updateDisabledDates();
            this.cdr.detectChanges();
          } else {
            this.toastr.warning("No disabled dates found for this month.");
          }
        },
        error: (err) => {
          console.error("Error fetching selected dates:", err);
          this.commonService.setLoading(false);
          this.toastr.error(
            err?.error?.error ||
              err?.error?.errors ||
              "Failed to load disabled dates."
          );
        },
      });
  }

  onPrimaryReasonChange(exception: ExceptionEntry, value: any) {
    // if (value.value === "other" || value.value === "Other") {
    //   exception.showOtherReason = true;
    //   exception.otherReason = "";
    //   exception.primaryReason = null;

    //   setTimeout(() => {
    //     exception.primaryReason = null;
    //     this.cdr.detectChanges();
    //   }, 0);
    // } else {
    exception.primaryReason = value;
    exception.showOtherReason = false;
    exception.otherReason = "";
    this.cdr.detectChanges();
    // }
  }

  confirmOtherReason(exception: ExceptionEntry) {
    const entered = exception.otherReason?.trim();
    if (!entered) {
      this.toastr.warning("Please enter a reason.");
      return;
    }

    const exists = this.reasonList.some((r: any) => (r.value ?? r) === entered);
    if (!exists) {
      this.reasonList.push({ label: entered, value: entered });
    }

    exception.primaryReason = entered;
    exception.showOtherReason = false;
    exception.otherReason = "";
    this.toastr.success("Custom reason saved!");
    this.cdr.detectChanges();
  }

  cancelOtherReason(exception: ExceptionEntry) {
    exception.otherReason = "";
    exception.primaryReason = null;
    exception.showOtherReason = false;
    this.cdr.detectChanges();
  }

  addMore() {
    for (let i = 0; i < this.formData.exceptions.length; i++) {
      if (
        this.formData.exceptions[i].dateRange.length == 0 ||
        !this.formData.exceptions[i].primaryReason ||
        !this.formData.exceptions[i].remarks
      ) {
        this.toastr.warning(
          "Please fill the existing empty row before adding a new one."
        );
        return;
      }
    }
    this.formData.exceptions.push({
      dateRange: [],
      exceptionRequestedDays: "",
      primaryReason: null,
      remarks: "",
      showOtherReason: false,
      otherReason: "",
    });

    this.updateDisabledDates();
    this.cdr.detectChanges();
  }

  deleteIndex(i: number) {
    this.formData.exceptions.splice(i, 1);

    if (this.formData.exceptions.length === 0) {
      this.formData.exceptions.push({
        dateRange: [],
        exceptionRequestedDays: "",
        primaryReason: null,
        remarks: "",
        showOtherReason: false,
        otherReason: "",
      });
    }

    this.updateDisabledDates();
    this.cdr.detectChanges();
  }

  resetForm(showToast = true) {
    this.formData.exceptions = [
      {
        dateRange: [],
        exceptionRequestedDays: "",
        primaryReason: null,
        remarks: "",
        showOtherReason: false,
        otherReason: "",
      },
    ];
    this.loadFormData();
    this.cdr.detectChanges();
    this.updateDisabledDates();
    if (showToast) this.toastr.info("Form Reset Successfully");
  }

  onMultiDateConfirm(selectedDates: Date[], rowIndex: number) {
    if (!selectedDates || selectedDates.length === 0) return;

    const sortedDates = selectedDates.sort((a, b) => a.getTime() - b.getTime());
    const sourceRow = this.formData.exceptions[rowIndex];

    this.formData.exceptions[rowIndex] = {
      ...sourceRow,
      dateRange: [sortedDates[0]],
    };

    const filledRemarks = sourceRow.remarks?.trim() || "";
    const filledReason = sourceRow.primaryReason
      ? { ...sourceRow.primaryReason }
      : null;

    for (let i = 1; i < sortedDates.length; i++) {
      const newRow: ExceptionEntry = {
        dateRange: [sortedDates[i]],
        exceptionRequestedDays: "",
        primaryReason: filledReason ? { ...filledReason } : null,
        remarks: filledRemarks,
        showOtherReason: false,
        otherReason: "",
      };

      this.formData.exceptions.splice(rowIndex + i, 0, newRow);
    }

    this.updateDisabledDates();
    this.cdr.detectChanges();
  }

  convertToISODate(date: Date | string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  updateDisabledDates() {
    const combined: Date[] = [];

    if (this.apiDisabledDates?.length) {
      combined.push(...this.apiDisabledDates.map((d) => new Date(d)));
    }

    this.formData.exceptions.forEach((ex) => {
      if (ex.dateRange?.length > 0) {
        ex.dateRange.forEach((date) => {
          const normalized = new Date(date);
          normalized.setHours(0, 0, 0, 0);
          combined.push(normalized);
        });
      }
    });

    if (this.minSelectableDate && this.maxSelectableDate) {
      const weekends = this.getWeekendsBetween(
        this.minSelectableDate,
        this.maxSelectableDate
      );
      combined.push(...weekends);
    }

    const map = new Map<string, Date>();
    combined.forEach((d) => {
      const key = d.toISOString().split("T")[0];
      if (!map.has(key)) map.set(key, d);
    });

    this.disabledDates = Array.from(map.values());
  }

  validateForm(): boolean {
    const seenDates = new Set<string>();

    for (const [i, ex] of this.formData.exceptions.entries()) {
      if (
        !ex.dateRange?.length ||
        !ex.primaryReason ||
        !ex.remarks ||
        !ex.remarks.trim()
      ) {
        this.toastr.warning(`Please fill required fields.`);
        return false;
      }
      const dateStr = this.convertToISODate(ex.dateRange[0]);

      if (seenDates.has(dateStr)) {
        this.toastr.warning(`Duplicate date found at row ${i + 1}: ${dateStr}`);
        return false;
      }

      seenDates.add(dateStr);
    }

    return true;
  }
  onSubmit() {
    this.commonService.setLoading(true);
    if (!this.validateForm()) {
      this.commonService.setLoading(false);
      return;
    }

    const payload = {
      exceptions: this.formData.exceptions
        .filter((ex) => ex.dateRange && ex.dateRange.length > 0)
        .map((ex) => {
          const date = new Date(ex.dateRange[0]);
          const formatted =
            date.getFullYear() +
            "-" +
            String(date.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(date.getDate()).padStart(2, "0");

          return {
            selectedDate: formatted,
            primaryReason:
              typeof ex.primaryReason === "object"
                ? ex.primaryReason?.value || ex.primaryReason?.label || ""
                : ex.primaryReason || "",
            remarks: ex.remarks?.trim() || "",
          };
        }),
    };

    this.http
      .postData(payload, this.constant.exceptionRequest)
      .pipe(
        finalize(() => {
          this.commonService.setLoading(false);
        })
      )
      .subscribe({
        next: (res: any) => {
          if (res?.success) {
            this.toastr.success("Form submitted successfully!");
            this.resetForm(false);
          } else {
            this.toastr.error("Submission failed. Please try again.");
          }
        },
        error: (err) => {
          console.error("Submission Error:", err);
          this.toastr.error(
            err?.error?.error ||
              err?.error?.errors ||
              "An error occurred during submission."
          );
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

  getAllowedDateRange(): { minDate: Date; maxDate: Date } {
    const today = new Date();
    const minDate = addDays(today, -21);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    const maxDate = endOfMonth(nextMonth);
    return { minDate, maxDate };
  }

  getWeekendsBetween(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    let current = new Date(start);
    current.setHours(0, 0, 0, 0);

    while (current <= end) {
      const day = current.getDay();
      if (day === 0 || day === 6) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }
  onMonthYearChanged(event: { month: number; year: number }) {
    this.loadFormData(event.month, event.year, true);
  }
}
