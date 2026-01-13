import { Component, OnInit, OnDestroy, ViewEncapsulation } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { Subject } from "rxjs";
import { CommonService } from "../../service/common.service";
import { CommonSelectComponent } from "../../common/common-select/common-select.component";
import { CommonFormActionComponent } from "../../common/common-form-action/common-form-action.component";
import { ButtonModule } from "primeng/button";
import { HttpService } from "../../service/http.service";
import { ConstantService } from "../../service/constant.service";
import { ToastrService } from "ngx-toastr";
import { ManagerEmployeeFilterComponent } from "../../common/manager-employee-filter/manager-employee-filter.component";
import { CommonMailSubmitComponent } from "../../common/common-mail-submit/common-mail-submit.component";
@Component({
  selector: "app-attendance-view",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CommonSelectComponent,
    CommonFormActionComponent,
    FormsModule,
    ButtonModule,
    ManagerEmployeeFilterComponent,
    CommonMailSubmitComponent,
  ],
  templateUrl: "./attendance-view.component.html",
  styleUrls: [
    "./attendance-view.component.scss",
    "../attendance-dashboard/attendance-dashboard.component.scss",
    "../../styles.scss",
  ],
  encapsulation: ViewEncapsulation.None,
})
export class AttendanceViewComponent implements OnInit, OnDestroy {
  employees: any[] = [];
  managers: any[] = [];

  tableColumns: { label: string; key: string }[] = [];
  tableData: any[] = [];

  editedCells = new Set<string>();
  private destroy$ = new Subject<void>();
  currentWeekStart!: string;
  filterForm = this.fb.group({
    startDate: [this.today()],
    employeeId: ["ALL"],
    managerId: ["ALL"],
  });

  selectedEmployee: string | null = null;
  selectedManager: string | null = null;

  weekOffset = 0; // 0,7,14,21,28
  page: number = 1;
  limit: number = 20;
  pageSizeOptions = [20, 50, 100, 150];
  constructor(
    private fb: FormBuilder,
    public commonService: CommonService,
    private http: HttpService,
    private constants: ConstantService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.currentWeekStart = this.today();
    this.generateColumns(this.currentWeekStart);
    this.fetchAttendance();
  }

  editedMap = new Map<
    string,
    { email: string; date: string; value: string | undefined }
  >();

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ---------------- WEEK HELPERS ---------------- */

  get rangeLabel(): string {
    const start = this.weekOffset + 1;
    const end = Math.min(this.weekOffset + 7, 35);
    return `Days ${start}–${end} of 35`;
  }

  canGoPrevious(): boolean {
    return this.weekOffset > 0;
  }

  canGoNext(): boolean {
    return this.weekOffset < 28;
  }

  prevWeek() {
    this.shiftWeek(-7);
  }

  nextWeek() {
    this.shiftWeek(7);
  }

  private shiftWeek(days: number) {
    const d = new Date(this.currentWeekStart);
    d.setDate(d.getDate() + days);

    this.currentWeekStart = d.toISOString().split("T")[0];

    this.filterForm.patchValue({
      startDate: this.currentWeekStart,
    });

    this.generateColumns(this.currentWeekStart);
    this.fetchAttendance();
  }

  /* ---------------- FILTER ACTIONS ---------------- */

  submit(): void {
    this.weekOffset = 0;
    this.generateColumns(this.filterForm.value.startDate!);
    this.fetchAttendance();
  }

  reset() {
    this.selectedManager = null;
    this.selectedEmployee = null;

    this.filterForm.reset({
      startDate: this.today(),
    });

    this.currentWeekStart = this.today();
    this.generateColumns(this.today());
    this.fetchAttendance();
  }

  /* ---------------- TABLE COLUMNS ---------------- */

  generateColumns(startDate: string) {
    const start = new Date(startDate);
    const days: any[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = d.toISOString().split("T")[0];

      days.push({
        label: d.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "2-digit",
          month: "short",
        }),
        key: iso,
      });
    }

    this.tableColumns = [
      { label: "Employee", key: "employeeName" },
      { label: "Manager", key: "managerName" },
      { label: "Email", key: "email" },
      ...days,
    ];
  }

  /* ---------------- GET LAST WEEK API ---------------- */
  private extractValue(val: any): string | null {
    if (!val) return null;

    // if already a string → OK
    if (typeof val === "string") return val;

    // if object from common select → take value
    if (typeof val === "object" && val.value) return val.value;

    return null;
  }

  fetchAttendance() {
    const fromDate = this.filterForm.value.startDate!;
    const managerCode = this.extractValue(this.selectedManager);
    const employeeCode = this.extractValue(this.selectedEmployee);

    const params: any = {
      fromDate,
      page: this.page,
      limit: this.limit,
    };

    if (managerCode) params.managerCode = managerCode;
    if (employeeCode) params.employeeCode = employeeCode;

    this.commonService.setLoading(true);

    this.http
      .getData(
        this.constants.officeAttendance +
          "/last-week?" +
          new URLSearchParams(params).toString()
      )
      .subscribe({
        next: (res: any) => {
          if (!res?.success || !Array.isArray(res.data?.data)) {
            this.tableData = [];
            return;
          }

          this.tableData = res.data.data.map((emp: any) => {
            const attendance: Record<string, string | undefined> = {};

            (emp.dates || []).forEach((d: any) => {
              const dateKey = d.OfficeAttendanceDate; // already yyyy-mm-dd
              attendance[dateKey] = d.AttendanceValue;
            });

            return {
              employeeId: emp.EmployeeCode, // IMPORTANT for edited tracking
              employeeName: emp.EmployeeName,
              managerName: emp.ManagerName,
              email: emp.EmployeeEmail,
              attendance,
            };
          });
        },
        error: () => {
          this.tableData = [];
        },
        complete: () => this.commonService.setLoading(false),
      });
  }

  /* ---------------- CELL EDIT ---------------- */

  isEditable(colKey: string): boolean {
    return !["employeeName", "managerName", "email"].includes(colKey);
  }

  storeOriginalValue(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.dataset["original"]) {
      input.dataset["original"] = (input.value ?? "").trim();
    }
  }

  onCellBlur(row: any, date: string, value: string, event?: Event) {
    const input = event?.target as HTMLInputElement;
    const original = (input?.dataset["original"] ?? "").trim();
    const current = (value ?? "").trim();

    // ❌ Value NOT changed → do nothing
    if (current === original) {
      if (input) delete input.dataset["original"];
      return;
    }

    this.commonService.setLoading(true);

    const payload = [
      {
        email: row.email,
        dates: [{ date, value: current || undefined }],
      },
    ];

    this.http.postData(payload, this.constants.officeAttendance).subscribe({
      next: (res) => {
        if (res?.success) {
          row.attendance[date] = current || undefined;
          this.editedCells.add(`${row.employeeId}-${date}`);
          this.toastr.success(res?.data?.message || "Attendance updated");
        } else {
          row.attendance[date] = original;
          this.toastr.error(res?.data?.message || "Update failed");
        }
      },
      error: (err) => {
        row.attendance[date] = original;
        this.toastr.error(err?.error?.message || "Update failed");
      },
      complete: () => {
        this.commonService.setLoading(false);
        if (input) delete input.dataset["original"];
      },
    });
  }

  onCellEnter(row: any, date: string, value: string, event: Event) {
    event.preventDefault();

    const input = event.target as HTMLInputElement;
    const original = (input?.dataset["original"] ?? "").trim();
    const current = (value ?? "").trim() || undefined;

    this.commonService.setLoading(true);

    const payload = [
      {
        email: row.email,
        dates: [{ date, value: current }],
      },
    ];

    this.http.postData(payload, this.constants.officeAttendance).subscribe({
      next: (res) => {
        if (res?.success) {
          row.attendance[date] = current;
          this.editedCells.add(`${row.employeeId}-${date}`);
          this.toastr.success(res?.data?.message || "Attendance updated");
        } else {
          row.attendance[date] = original;
          this.toastr.error(res?.data?.message || "Update failed");
        }
      },
      error: (err) => {
        row.attendance[date] = original;
        this.toastr.error(err?.error?.message || "Update failed");
      },
      complete: () => {
        this.commonService.setLoading(false);
        delete input.dataset["original"];
        this.focusNextEditableCell(input);
      },
    });
  }
  focusNextEditableCell(currentInput: HTMLInputElement) {
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(".editable-cell")
    ).filter((i) => !i.disabled);

    const index = inputs.indexOf(currentInput);
    if (index === -1) return;

    const next = inputs[index + 1];
    if (next) {
      next.focus();
      next.select();
    }
  }

  isEdited(row: any, date: string): boolean {
    return this.editedCells.has(`${row.employeeId}-${date}`);
  }

  today(): string {
    return new Date().toISOString().split("T")[0];
  }
  private getWeekStart(date: string, offset = 0): string {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    return d.toISOString().split("T")[0];
  }
  markEdited(row: any, date: string) {
    const key = `${row.email}-${date}`;

    this.editedMap.set(key, {
      email: row.email,
      date,
      value: row.attendance[date] || undefined,
    });

    this.editedCells.add(`${row.employeeId}-${date}`);
  }
  submitAttendance() {
    if (!this.editedMap.size) {
      this.toastr.info("No changes to submit");
      return;
    }

    const payloadMap: Record<string, any> = {};

    this.editedMap.forEach(({ email, date, value }) => {
      if (!payloadMap[email]) {
        payloadMap[email] = {
          email,
          dates: [],
        };
      }

      payloadMap[email].dates.push({ date, value });
    });

    const payload = Object.values(payloadMap);

    this.commonService.setLoading(true);

    this.http.postData(payload, this.constants.officeAttendance).subscribe({
      next: (res) => {
        if (res?.success) {
          this.toastr.success(res?.data?.message || "Attendance updated");
          this.commonService.setLoading(false);
          this.editedMap.clear();
        } else {
          this.toastr.error("Update failed");
        }
      },
      error: (e) => {
        this.toastr.error(e.message || "Update failed");
        this.commonService.setLoading(false);
      },
      complete: () => {
        this.commonService.setLoading(false);
      },
    });
  }
  onStartDateChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (!value) return;

    this.currentWeekStart = value;
    this.generateColumns(value);
    this.fetchAttendance();
  }

  onManagerChange(manager: any) {
    this.selectedManager = manager;
    this.onFilterChange();
  }

  onEmployeeChange(employee: any) {
    this.selectedEmployee = employee;
    this.onFilterChange();
  }
  private onFilterChange() {
    const startDate = this.filterForm.value.startDate!;
    this.currentWeekStart = startDate;

    this.generateColumns(startDate);
    this.fetchAttendance();
  }
  get weekRangeLabel(): string {
    if (this.tableColumns.length >= 10) {
      return `${this.tableColumns[3].label} – ${this.tableColumns[9].label}`;
    }
    return "";
  }

  // prevPage() {
  //   if (this.page > 1) {
  //     this.page--;
  //     this.fetchAttendance();
  //   }
  // }

  // nextPage() {
  //   this.page++;
  //   this.fetchAttendance();
  // }

  onLimitChange() {
    this.page = 1; // reset to first page
    this.fetchAttendance();
  }
}
