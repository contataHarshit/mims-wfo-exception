import { CommonModule, isPlatformBrowser } from "@angular/common";
import {
  Component,
  OnInit,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
  OnDestroy,
  HostListener,
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
import { Router, NavigationEnd } from "@angular/router";

@Component({
  selector: "app-create-request",
  templateUrl: "./create-request.component.html",
  styleUrls: ["./create-request.component.scss"],
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
    CommonFormActionComponent,
  ],
  providers: [MessageService],
})
export class CreateRequestComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private formDataLoadedOnce = false;
  private isDataLoaded = false;

  formData: any = {
    employeeId: "",
    employeeName: "",
    projectName: [],
    projectManager: "",
    employeeNumber: "",
    rows: [
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
  private resourceDisabledDateCache = new WeakMap<object, Date[]>();
  projectList: any[] = [];
  private resourceEmployeeOptionsCache = new WeakMap<
    object,
    { signature: string; options: any[] }
  >();
  private employeeListVersion = 0;

  reasonList: any = [];
  employeeList: any[] = [];
  requestTypeList = [
    { label: "Permanent Work From Home", value: "PERMANENT_WFH" },
    { label: "Date Range", value: "DATE_RANGE" },
  ];
  selectedView = "self";
  private selectedDownlineEmployeeNumber: string | null = null;
  private selectedDownlineEmployeeIsManager = false;
  maxSelectableDate: any;
  minSelectableDate: any;
  tab: string = "create-request";
  constructor(
    private cdr: ChangeDetectorRef,
    private http: HttpService,
    private constant: ConstantService,
    private commonService: CommonService,
    private messageService: MessageService,
    private toastr: ToastrService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.commonService.setLoading(true);
    this.updateTab(this.router.url);

    this.selectedView = this.commonService.selectedView || "self";
    if (this.isResourceView) this.resetRows();
    this.loadEmployeeListFromStorage();
    this.commonService.viewChange$
      .pipe(takeUntil(this.destroy$))
      .subscribe((view) => {
        const nextView = view || "self";
        if (this.selectedView === nextView) return;
        this.selectedView = nextView;
        const { minDate, maxDate } = this.getAllowedDateRange();
        this.minSelectableDate = minDate;
        this.maxSelectableDate = maxDate;
        this.resetRows();
        this.loadEmployeeListFromStorage();
        this.cdr.detectChanges();
      });

    this.commonService.allEmployeeData$
      .pipe(takeUntil(this.destroy$))
      .subscribe((employees) => {
        if (!this.isResourceSelection) this.setEmployeeList(employees);
      });
    this.commonService.managerEmployeeData$
      .pipe(takeUntil(this.destroy$))
      .subscribe((employees) => {
        if (this.isResourceSelection) this.setEmployeeList(employees);
      });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.updateTab(this.router.url);
      });
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
    await this.waitForAuthComplete();
    this.loadFormData();
    this.populateEmployeeInfo();
    this.reasonList =
      this.tab === "create-request"
        ? this.commonService.config.reasonList
        : this.commonService.config.OdReasonList || [];
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
          take(1), // Take only the first emission and unsubscribe
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
    sendRequest = false,
    employeeNumber: string | null = null,
    isManager = false,
  ): void {
    if (this.formDataLoadedOnce && !sendRequest) return; // prevent duplicate loads
    this.formDataLoadedOnce = true;

    // Set date range
    const { minDate, maxDate } = this.getAllowedDateRange();
    this.minSelectableDate = minDate;
    this.maxSelectableDate = maxDate;

    // Fetch disabled dates
    const params = new URLSearchParams({
      month: String(month),
      year: String(year),
    });
    if (this.isDownlineView && this.tab === "create-request" && employeeNumber) {
      params.set("employeeNumber", employeeNumber);
      params.set("isManager", String(isManager));
    }

    const url =
      this.tab === "create-request"
        ? `${this.constant.selectedDates}?${params.toString()}`
        : `${this.constant.onDutyDisabledDates}?fromDate=${this.toDateParam(
            new Date(year, month - 1, 1),
          )}&toDate=${this.toDateParam(new Date(year, month, 0))}`;
    this.http
      .getData(url)
      .pipe(finalize(() => this.commonService.setLoading(false)))
      .subscribe({
        next: (res: any) => {
          const dates = res?.data?.dates || res?.data?.disabledDates;
          if (res?.success && dates && Array.isArray(dates)) {
            this.apiDisabledDates = dates?.map((dateStr: string) => {
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
              "Failed to load disabled dates.",
          );
        },
      });
  }

  onPrimaryReasonChange(exception: any, value: any) {
    exception.primaryReason = value;
    exception.showOtherReason = false;
    exception.otherReason = "";
    this.cdr.detectChanges();
  }

  onResourceEmployeeChange(row: any, value: any): void {
    const employeeNumber = value?.value ?? value;
    if (row.employeeNumber !== employeeNumber) {
      row.dateRange = [];
    }
    row.employeeNumber = employeeNumber;
    if (this.isDownlineView && this.tab === "create-request") {
      this.selectedDownlineEmployeeNumber = employeeNumber || null;
      const selectedEmployee = this.employeeList.find(
        (employee) => employee.value === employeeNumber,
      );
      this.selectedDownlineEmployeeIsManager = String(
        selectedEmployee?.designation || "",
      )
        .toLowerCase()
        .includes("manager");
      const currentDate = this.getCalendarMonth();
      this.loadFormData(
        currentDate.month,
        currentDate.year,
        true,
        this.selectedDownlineEmployeeNumber,
        this.selectedDownlineEmployeeIsManager,
      );
    }
    this.updateDisabledDates();
    this.cdr.detectChanges();
  }

  onResourceRequestTypeChange(row: any, value: any): void {
    row.requestType = value?.value ?? value;
    if (row.requestType === "PERMANENT_WFH") row.dateRange = [];
    this.updateDisabledDates();
    this.cdr.detectChanges();
  }

  confirmOtherReason(exception: any) {
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

  cancelOtherReason(exception: any) {
    exception.otherReason = "";
    exception.primaryReason = null;
    exception.showOtherReason = false;
    this.cdr.detectChanges();
  }

  addMore() {
    if (this.isResourceView) {
      if (
        !this.validateResourceRow(
          this.formData.rows[this.formData.rows.length - 1],
        )
      ) {
        return;
      }
      this.formData.rows.push(this.createRow());
      this.updateDisabledDates();
      this.cdr.detectChanges();
      return;
    }

    for (let i = 0; i < this.formData.rows.length; i++) {
      if (
        this.formData.rows[i].dateRange.length == 0 ||
        !this.formData.rows[i].primaryReason ||
        !this.formData.rows[i].remarks
      ) {
        this.toastr.warning(
          "Please fill the existing empty row before adding a new one.",
        );
        return;
      }
    }
    this.formData.rows.push({
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
    this.formData.rows.splice(i, 1);

    if (this.formData.rows.length === 0)
      this.formData.rows.push(this.createRow());

    this.updateDisabledDates();
    this.cdr.detectChanges();
  }

  resetForm(showToast = true) {
    this.resetRows();
    this.loadFormData();
    this.cdr.detectChanges();
    this.updateDisabledDates();
    if (showToast) this.toastr.info("Form Reset Successfully");
  }

  onMultiDateConfirm(selectedDates: Date[], rowIndex: number) {
    if (!selectedDates || selectedDates.length === 0) return;

    const sortedDates = selectedDates.sort((a, b) => a.getTime() - b.getTime());
    const sourceRow = this.formData.rows[rowIndex];

    if (this.isResourceView) {
      sourceRow.dateRange = sortedDates;
      this.updateDisabledDates();
      this.cdr.detectChanges();
      return;
    }

    this.formData.rows[rowIndex] = {
      ...sourceRow,
      dateRange: [sortedDates[0]],
    };

    const filledRemarks = sourceRow.remarks?.trim() || "";
    const filledReason = sourceRow.primaryReason
      ? { ...sourceRow.primaryReason }
      : null;

    for (let i = 1; i < sortedDates.length; i++) {
      const newRow: any = {
        dateRange: [sortedDates[i]],
        exceptionRequestedDays: "",
        primaryReason: filledReason ? { ...filledReason } : null,
        remarks: filledRemarks,
        showOtherReason: false,
        otherReason: "",
      };

      this.formData.rows.splice(rowIndex + i, 0, newRow);
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

  private toDateParam(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  updateDisabledDates() {
    const combined: Date[] = [];

    // Backend disabled dates
    if (this.apiDisabledDates?.length) {
      combined.push(
        ...this.apiDisabledDates.map((d) => {
          const date = new Date(d);
          date.setHours(0, 0, 0, 0);
          return date;
        }),
      );
    }

    // Already selected dates
    this.formData.rows.forEach((ex: any) => {
      ex.dateRange?.forEach((date: Date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        combined.push(d);
      });
    });

    // OD availability is governed by the API (including Fridays and Saturdays).
    // Keep the existing WFH weekend rule local to the WFH form only.
    combined.push(
      ...this.getNonWorkingDaysBetween(
        this.minSelectableDate,
        this.maxSelectableDate,
      ),
    );

    // Remove duplicates
    this.disabledDates = Array.from(
      new Map(combined.map((d) => [d.toDateString(), d])).values(),
    );
    this.refreshResourceDisabledDates();
  }

  /**
   * Downline rows are independent per employee. A date selected for Anurag
   * must not block another employee, but it must be unavailable in Anurag's
   * other rows along with API dates and weekends.
   */
  getDisabledDatesForResourceRow(row: any, rowIndex: number): Date[] {
    if (!this.isDownlineView) {
      return this.disabledDates;
    }

    const cachedDates = this.resourceDisabledDateCache.get(row);
    if (cachedDates) return cachedDates;

    const disabledDates = this.buildDisabledDatesForResourceRow(row, rowIndex);
    this.resourceDisabledDateCache.set(row, disabledDates);
    return disabledDates;
  }

  private refreshResourceDisabledDates(): void {
    this.resourceDisabledDateCache = new WeakMap<object, Date[]>();
    if (!this.isDownlineView) return;

    this.formData.rows.forEach((row: any, index: number) => {
      this.resourceDisabledDateCache.set(
        row,
        this.buildDisabledDatesForResourceRow(row, index),
      );
    });
  }

  private buildDisabledDatesForResourceRow(row: any, rowIndex: number): Date[] {
    const disabledDates = this.apiDisabledDates.map((date) =>
      this.normalizeDate(date),
    );
    const employeeNumber = this.getEmployeeNumber(row);

    if (employeeNumber) {
      this.formData.rows.forEach((otherRow: any, otherIndex: number) => {
        if (
          otherIndex !== rowIndex &&
          this.getEmployeeNumber(otherRow) === employeeNumber
        ) {
          disabledDates.push(...this.expandDateRange(otherRow.dateRange));
        }
      });
    }

    disabledDates.push(
      ...this.getWeekendDatesBetween(
        this.minSelectableDate,
        this.maxSelectableDate,
      ),
    );

    return Array.from(
      new Map(
        disabledDates.map((date) => [date.toDateString(), date]),
      ).values(),
    );
  }

  isEmployeePermanentInAnotherRow(row: any, rowIndex: number): boolean {
    if (!this.isDownlineView) return false;

    const employeeNumber = this.getEmployeeNumber(row);
    return (
      !!employeeNumber &&
      this.formData.rows.some(
        (otherRow: any, otherIndex: number) =>
          otherIndex !== rowIndex &&
          this.getEmployeeNumber(otherRow) === employeeNumber &&
          otherRow.requestType === "PERMANENT_WFH",
      )
    );
  }

  getAvailableEmployeesForRow(row: any): any[] {
    if (!this.isResourceView) return this.employeeList;

    const currentEmployeeNumber = this.getEmployeeNumber(row);
    const permanentlyAssignedEmployees = new Set(
      this.formData.rows
        .filter((otherRow: any) => otherRow.requestType === "PERMANENT_WFH")
        .map((otherRow: any) => this.getEmployeeNumber(otherRow))
        .filter(
          (employeeNumber: string | null): employeeNumber is string =>
            !!employeeNumber,
        ),
    );

    if (!permanentlyAssignedEmployees.size) return this.employeeList;

    const signature = [
      this.employeeListVersion,
      currentEmployeeNumber || "",
      ...Array.from(permanentlyAssignedEmployees).sort(),
    ].join("|");
    const cached = this.resourceEmployeeOptionsCache.get(row);
    if (cached?.signature === signature) return cached.options;

    const options = this.employeeList.filter((employee) => {
      const employeeNumber = employee?.value ?? employee?.EmployeeNumber;
      // Keep the current row's value available so its selection remains visible.
      return (
        employeeNumber === currentEmployeeNumber ||
        !permanentlyAssignedEmployees.has(employeeNumber)
      );
    });

    this.resourceEmployeeOptionsCache.set(row, { signature, options });
    return options;
  }

  private getEmployeeNumber(row: any): string | null {
    return row?.employeeNumber?.value ?? row?.employeeNumber ?? null;
  }

  private normalizeDate(value: Date | string): Date {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private getWeekendDatesBetween(start: Date | null, end: Date | null): Date[] {
    const dates: Date[] = [];
    if (!start || !end) return dates;

    const current = this.normalizeDate(start);
    const lastDate = this.normalizeDate(end);
    while (current <= lastDate) {
      if (current.getDay() === 0 || current.getDay() === 6) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  private expandDateRange(dateRange: Date[] = []): Date[] {
    if (!dateRange.length) return [];

    const start = this.normalizeDate(dateRange[0]);
    const end = this.normalizeDate(dateRange[dateRange.length - 1]);
    const dates: Date[] = [];

    for (
      const current = new Date(start);
      current <= end;
      current.setDate(current.getDate() + 1)
    ) {
      dates.push(new Date(current));
    }

    return dates;
  }

  validateForm(): boolean {
    if (this.isResourceView) {
      return this.formData.rows.every((row: any) =>
        this.validateResourceRow(row),
      );
    }

    const seenDates = new Set<string>();

    for (const [i, ex] of this.formData.rows.entries()) {
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

    const isWfhRequest = this.tab === "create-request";

    // The WFH-request contract is only for manager Downline submissions.
    // Self WFH requests use the existing exception-request contract below.
    if (isWfhRequest && this.isDownlineView) {
      const wfhPayloads = this.formData.rows
        .filter(
          (row: any) =>
            row.requestType === "PERMANENT_WFH" ||
            (row.dateRange && row.dateRange.length > 0),
        )
        .map((row: any) => {
          const employeeNumber = this.isResourceView
            ? row.employeeNumber?.value || row.employeeNumber
            : this.formData.employeeNumber;

          const isPermanent = this.isResourceView
            ? row.requestType === "PERMANENT_WFH"
            : false;

          if (isPermanent) {
            return { employeeNumber, isPermanent: true };
          }

          return {
            employeeNumber,
            fromDate: this.convertToISODate(row.dateRange[0]),
            toDate: this.convertToISODate(
              row.dateRange[row.dateRange.length - 1],
            ),
            isPermanent: false,
          };
        });

      if (!wfhPayloads.length) {
        this.toastr.warning(
          "Please select a valid WFH date range or permanent option.",
        );
        this.commonService.setLoading(false);
        return;
      }

      const requests$ = wfhPayloads.map((payload: any) =>
        this.http.postData(payload, this.constant.wfhRequest),
      );

      import("rxjs").then(({ forkJoin }) => {
        forkJoin(requests$ as any[])
          .pipe(
            finalize(() => {
              this.commonService.setLoading(false);
            }),
          )
          .subscribe({
            next: () => {
              this.toastr.success("WFH request submitted successfully!");
              this.resetForm(false);
            },
            error: (err) => {
              console.error("WFH Submission Error:", err);
              this.toastr.error(
                err?.error?.error ||
                  err?.error?.errors ||
                  "An error occurred while submitting the WFH request.",
              );
            },
          });
      });
      return;
    }

    if (!isWfhRequest && this.isOdDownlineView) {
      const requests$ = this.formData.rows.map((row: any) => {
        const dateRange = row.dateRange || [];
        const payload = {
          employeeNumber: row.employeeNumber?.value || row.employeeNumber,
          fromDate: this.convertToISODate(dateRange[0]),
          toDate: this.convertToISODate(dateRange[dateRange.length - 1]),
          odReason:
            typeof row.primaryReason === "object"
              ? row.primaryReason?.value || row.primaryReason?.label || ""
              : row.primaryReason || "",
          remarks: row.remarks?.trim() || "",
        };

        return this.http.postData(payload, this.constant.odRequests);
      });

      import("rxjs").then(({ forkJoin }) => {
        forkJoin(requests$)
          .pipe(
            finalize(() => {
              this.commonService.setLoading(false);
            }),
          )
          .subscribe({
            next: (responses: unknown) => {
              const responseList = responses as any[];
              const failedResponse = responseList.find(
                (response) => !response?.success,
              );
              if (failedResponse) {
                this.toastr.error(
                  failedResponse.errors || "OD request submission failed.",
                );
                return;
              }

              this.toastr.success("OD requests submitted successfully!");
              this.resetForm(false);
            },
            error: (err) => {
              console.error("OD Submission Error:", err);
              this.toastr.error(
                err?.error?.error ||
                  err?.error?.errors ||
                  "An error occurred while submitting the OD request.",
              );
            },
          });
      });
      return;
    }

    const payload =
      this.tab === "on-duty-request"
        ? {
            requests: this.formData.rows
              .filter((ex: any) => ex.dateRange && ex.dateRange.length > 0)
              .map((ex: any) => {
                const date = new Date(ex.dateRange[0]);
                const formatted =
                  date.getFullYear() +
                  "-" +
                  String(date.getMonth() + 1).padStart(2, "0") +
                  "-" +
                  String(date.getDate()).padStart(2, "0");

                return {
                  odRequestDate: formatted,
                  odReason:
                    typeof ex.primaryReason === "object"
                      ? ex.primaryReason?.value || ex.primaryReason?.label || ""
                      : ex.primaryReason || "",
                  remarks: ex.remarks?.trim() || "",
                };
              }),
          }
        : {
            exceptions: this.formData.rows
              .filter((ex: any) => ex.dateRange && ex.dateRange.length > 0)
              .map((ex: any) => {
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

    const url = isWfhRequest
      ? this.constant.exceptionRequest
      : this.constant.onDutyRequests;
    this.http
      .postData(payload, url)
      .pipe(
        finalize(() => {
          this.commonService.setLoading(false);
        }),
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
              "An error occurred during submission.",
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

  getAllowedDateRange(): { minDate: Date; maxDate: Date | null } {
    const today = new Date();

    if (this.isResourceView) {
      return {
        minDate: addDays(today, -199),
        maxDate: null,
      };
    }

    // Allow last 199 days for both pages
    const minDate = addDays(today, -199);

    let maxDate: Date;

    if (this.tab === "on-duty-request") {
      // OD Request -> do not allow future dates
      maxDate = new Date(today);
      maxDate.setHours(23, 59, 59, 999);
    } else {
      // WFH Request -> allow till end of next month
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      maxDate = endOfMonth(nextMonth);
    }

    return { minDate, maxDate };
  }

  getNonWorkingDaysBetween(start: Date | null, end: Date | null): Date[] {
    const dates: Date[] = [];
    if (!start || !end) return dates;

    let current = new Date(start);
    current.setHours(0, 0, 0, 0);

    while (current <= end) {
      const day = current.getDay();
      const isOnDutyRequest = this.tab === "on-duty-request";
      if (isOnDutyRequest ? day === 5 || day === 6 : day === 0 || day === 6) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }
  onMonthYearChanged(event: { month: number; year: number }) {
    this.loadFormData(
      event.month,
      event.year,
      true,
      this.isDownlineView ? this.selectedDownlineEmployeeNumber : null,
      this.selectedDownlineEmployeeIsManager,
    );
  }

  private getCalendarMonth(): { month: number; year: number } {
    const selectedDate = this.formData.rows[0]?.dateRange?.[0];
    const date = selectedDate ? new Date(selectedDate) : new Date();
    return { month: date.getMonth() + 1, year: date.getFullYear() };
  }
  private updateTab(url: string): void {
    const previousTab = this.tab;
    if (url.includes("create-request")) {
      this.tab = "create-request";
    } else if (url.includes("on-duty-request")) {
      this.tab = "on-duty-request";
    }

    if (
      previousTab !== this.tab &&
      this.isResourceSelection &&
      this.tab === "on-duty-request"
    ) {
      this.formData.rows.forEach((row: any) => {
        row.requestType = "DATE_RANGE";
      });
      this.cdr.detectChanges();
    }
  }

  get isResourceView(): boolean {
    return this.isResourceSelection;
  }

  get isDownlineView(): boolean {
    return this.selectedView === "downline";
  }

  get isOdDownlineView(): boolean {
    return this.tab === "on-duty-request" && this.isDownlineView;
  }

  get isResourceSelection(): boolean {
    return this.selectedView === "resource" || this.selectedView === "downline";
  }

  private createRow(): any {
    return this.isResourceView
      ? {
          employeeNumber: null,
          requestType: this.tab === "on-duty-request" ? "DATE_RANGE" : null,
          dateRange: [],
        }
      : {
          dateRange: [],
          exceptionRequestedDays: "",
          primaryReason: null,
          remarks: "",
          showOtherReason: false,
          otherReason: "",
        };
  }

  private resetRows(): void {
    this.formData.rows = [this.createRow()];
    this.updateDisabledDates();
  }

  private setEmployeeList(employees: any[] = []): void {
    if (!this.isResourceSelection || !employees.length) return;
    this.employeeList = employees.map((employee: any) => ({
      label: `${employee.FullName || employee.fullName || employee.employeeName} (${employee.EmployeeNumber || employee.employeeNumber})`,
      value: employee.EmployeeNumber || employee.employeeNumber,
      designation: employee.designation || employee.Designation || "",
    }));
    this.employeeListVersion++;
    this.cdr.detectChanges();
  }

  private loadEmployeeListFromStorage(): void {
    if (!this.isResourceView) return;

    const storedEmployees = this.isResourceSelection
      ? localStorage.getItem("managerEmployeeData")
      : localStorage.getItem("allEmployeeData");

    if (!storedEmployees) return;

    try {
      const employees = JSON.parse(storedEmployees);
      if (Array.isArray(employees)) this.setEmployeeList(employees);
    } catch (error) {
      console.error("Error parsing employee data from localStorage:", error);
    }
  }

  private validateResourceRow(row: any): boolean {
    if (this.isOdDownlineView) {
      if (
        !row?.employeeNumber ||
        !row?.dateRange?.length ||
        !row?.primaryReason
      ) {
        this.toastr.warning(
          "Please select an employee, date range, and OD reason.",
        );
        return false;
      }
      return true;
    }

    if (!row?.employeeNumber || !row?.requestType) {
      this.toastr.warning("Please select an employee and request type.");
      return false;
    }
    if (row.requestType === "DATE_RANGE" && row.dateRange?.length < 2) {
      this.toastr.warning("Please select a date range.");
      return false;
    }
    return true;
  }
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    const isCalendar = target.closest(".p-calendar");
    const isDatepicker = target.closest(".p-datepicker");

    if (isCalendar || isDatepicker) {
      // Calendar interaction - could add scroll lock here if needed
    }
  }
}
