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
    startDate: [this.getLastWeekStart()],
    employeeId: ["ALL"],
    managerId: ["ALL"],
  });

  selectedEmployee: string | null = null;
  selectedManager: string | null = null;

  weekOffset = 0;
  page: number = 1;
  limit: number = 20;
  pageSizeOptions = [20, 50, 100, 150];
  totalRecords: number = 0;

  constructor(
    private fb: FormBuilder,
    public commonService: CommonService,
    private http: HttpService,
    private constants: ConstantService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.currentWeekStart = this.getLastWeekStart();
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

  /* ---------------- DATE HELPERS ---------------- */

  // Get max date (today)
  get maxDate(): string {
    return new Date().toISOString().split("T")[0];
  }

  // Get start date for last 7 days (1 week back from today)
  private getLastWeekStart(): string {
    const d = new Date();
    d.setDate(d.getDate() - 6); // Start from 6 days ago to include today as the 7th day
    return d.toISOString().split("T")[0];
  }

  // Today's date
  today(): string {
    return new Date().toISOString().split("T")[0];
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
    if (this.isNextWeekDisabled()) {
      return;
    }
    this.shiftWeek(7);
  }

  // Check if next week button should be disabled
  isNextWeekDisabled(): boolean {
    const start = new Date(this.currentWeekStart);

    // End of NEXT week (start + 13 days)
    const nextWeekEnd = new Date(start);
    nextWeekEnd.setDate(start.getDate() + 13);
    nextWeekEnd.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return nextWeekEnd > today;
  }

  private shiftWeek(days: number) {
    const d = new Date(this.currentWeekStart);
    d.setDate(d.getDate() + days);

    this.currentWeekStart = d.toISOString().split("T")[0];

    this.filterForm.patchValue(
      { startDate: this.currentWeekStart },
      { emitEvent: false },
    );

    this.refreshAttendance();
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

    const lastWeekStart = this.getLastWeekStart();

    this.filterForm.reset({
      startDate: lastWeekStart,
    });

    this.currentWeekStart = lastWeekStart;
    this.generateColumns(lastWeekStart);
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
    if (typeof val === "string") return val;
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
          new URLSearchParams(params).toString(),
      )
      .subscribe({
        next: (res: any) => {
          if (!res?.success || !Array.isArray(res.data?.data)) {
            this.tableData = [];
            this.totalRecords = 0;
            return;
          }

          this.totalRecords = res.data.total;

          this.tableData = res.data.data.map((emp: any) => {
            const attendance: Record<string, string | undefined> = {};

            (emp.dates || []).forEach((d: any) => {
              attendance[d.OfficeAttendanceDate] = d.AttendanceValue;
            });

            return {
              employeeId: emp.EmployeeCode,
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

  onCellEnter(row: any, date: string, value: string, event: Event) {
    event.preventDefault();

    const input = event.target as HTMLInputElement;

    const original = this.normalizeValue(input.dataset["original"]);
    const current = this.normalizeValue(value);

    if (original === current) {
      delete input.dataset["original"];
      return;
    }

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
      document.querySelectorAll<HTMLInputElement>(".editable-cell"),
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

  private getWeekStart(date: string, offset = 0): string {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    return d.toISOString().split("T")[0];
  }

  markEdited(row: any, date: string) {
    const rawValue = row.attendance[date];
    const normalizedValue = this.normalizeValue(rawValue);

    if (normalizedValue === null) {
      this.editedMap.delete(`${row.email}-${date}`);
      this.editedCells.delete(`${row.employeeId}-${date}`);
      return;
    }

    const key = `${row.email}-${date}`;

    this.editedMap.set(key, {
      email: row.email,
      date,
      value: normalizedValue,
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

      payloadMap[email].dates.push({
        date,
        value: !value?.replaceAll(" ", "").length
          ? null
          : value.replaceAll(" ", ""),
      });
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

    // Validate against future dates
    const selectedDate = new Date(value);
    selectedDate.setDate(selectedDate.getDate() + 6); // End of week
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      this.toastr.warning("Cannot select dates that result in future week");
      const lastWeekStart = this.getLastWeekStart();
      this.filterForm.patchValue(
        { startDate: lastWeekStart },
        { emitEvent: false },
      );
      this.currentWeekStart = lastWeekStart;
      this.refreshAttendance();
      return;
    }

    this.currentWeekStart = value;
    this.refreshAttendance();
  }

  onManagerChange(manager: any) {
    this.selectedManager = manager;
    this.onFilterChange();
  }

  onEmployeeChange(employee: any) {
    this.selectedEmployee = employee;
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.page = 1;
    this.currentWeekStart = this.filterForm.value.startDate!;
    this.refreshAttendance();
  }

  get weekRangeLabel(): string {
    if (this.tableColumns.length === 10) {
      // tableColumns has 3 static + 7 date columns
      // Date columns are at indices 3-9
      return `${this.tableColumns[3].label} – ${this.tableColumns[9].label}`;
    }
    return "";
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.fetchAttendance();
    }
  }

  nextPage() {
    if (this.page * this.limit < this.totalRecords) {
      this.page++;
      this.fetchAttendance();
    }
  }

  onLimitChange() {
    this.page = 1;
    this.fetchAttendance();
  }

  private refreshAttendance(): void {
    this.generateColumns(this.currentWeekStart);
    this.fetchAttendance();
  }

  private normalizeValue(value: string | undefined | null): string | null {
    if (!value) return null;

    const trimmed = value.replaceAll(" ", "");
    return trimmed.length ? trimmed : null;
  }
}
