import { Component, OnInit, ViewChild, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Table, TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { CommonSelectComponent } from "../../common/common-select/common-select.component";
import { CommonFormActionComponent } from "../../common/common-form-action/common-form-action.component";
import { ToastrService } from "ngx-toastr";
import { HttpService } from "../../service/http.service";
import { ConstantService } from "../../service/constant.service";
import { CommonService } from "../../service/common.service";
import { Subject, takeUntil } from "rxjs";
import { ManagerEmployeeFilterComponent } from "../../common/manager-employee-filter/manager-employee-filter.component";
import { CalendarModule } from "primeng/calendar";
interface CorrectionRequest {
  id: number;
  employeeId: string;
  employeeName: string;
  designation: string;
  managerName: string;
  exceptionDate: string;
  submissionDate: string;
  rejectedBy?: string;
  checked?: boolean;
}

@Component({
  selector: "app-correction-dashboard",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    CommonSelectComponent,
    CommonFormActionComponent,
    ManagerEmployeeFilterComponent,
    CalendarModule,
  ],
  templateUrl: "./correction-dashboard.component.html",
  styleUrl: "../../shared/dashboard-common.scss",
})
export class CorrectionDashboardComponent implements OnInit, OnDestroy {
  @ViewChild("dt") table!: Table;

  private destroy$ = new Subject<void>();

  constructor(
    private toastr: ToastrService,
    private http: HttpService,
    private constants: ConstantService,
    private commonService: CommonService,
  ) {}

  /* ---------------- FILTERS ---------------- */
  filters = {
    manager: null as any,
    employee: null as any,
    fromDate: null as string | null,
    toDate: null as string | null,
  };

  managerList: any[] = [];
  employeeList: any[] = [];
  minFromDate: string = "";
  maxFromDate: string = "";
  minToDate: string = "";
  maxToDate: string = "";

  /* ---------------- TABLE ---------------- */
  requests: CorrectionRequest[] = [];
  selectedRequests: CorrectionRequest[] = [];

  page = 1;
  limit = 10;
  totalRecords = 0;
  allSelected = false;

  /* ================= INIT ================= */

  ngOnInit(): void {
    this.loadDropdownData();
    this.setDefaultDateRange();
    this.loadRejectedRequests();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ================= DROPDOWNS ================= */

  private loadDropdownData() {
    // ---------- MANAGERS ----------
    this.commonService.managerList$
      .pipe(takeUntil(this.destroy$))
      .subscribe((list: any[]) => {
        if (list?.length) {
          this.managerList = list.map((m) => ({
            label: m.manager, // ✔ backend field
            value: m.managerEmployeeNumber, // ✔ backend expects this
          }));
        }
      });

    // ---------- EMPLOYEES ----------
    this.commonService.allEmployeeData$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any[]) => {
        if (data?.length) {
          this.employeeList = data.map((e) => ({
            label: `${e.FullName} (${e.EmployeeNumber})`,
            value: e.EmployeeNumber,
          }));
        }
      });

    // ---------- EMPLOYEE FALLBACK (VALID) ----------
    if (!this.employeeList.length) {
      const cachedEmployees = JSON.parse(
        localStorage.getItem("allEmployeeData") || "[]",
      );

      this.employeeList = cachedEmployees.map((e: any) => ({
        label: `${e.FullName} (${e.EmployeeNumber})`,
        value: e.EmployeeNumber,
      }));
    }
  }

  /* ================= DATA LOAD ================= */

  loadRejectedRequests() {
    this.commonService.setLoading(true);

    const params = new URLSearchParams();
    params.set("page", this.page.toString());
    params.set("limit", this.limit.toString());

    if (this.filters.manager?.value) {
      params.set("managerEmployeeNumber", this.filters.manager.value);
    }

    if (this.filters.employee?.value) {
      params.set("employeeNumber", this.filters.employee.value);
    }
    if (this.filters.fromDate) {
      params.set("fromDate", this.filters.fromDate);
    }

    if (this.filters.toDate) {
      params.set("toDate", this.filters.toDate);
    }

    const url = `${this.constants.auditExceptionRequest}?${params.toString()}`;
    console.log("url--------", url);

    this.http.getData(url).subscribe({
      next: (res: any) => {
        if (!res?.success) {
          this.requests = [];
          this.totalRecords = 0;
          return;
        }

        const apiData = res.data?.data || [];

        this.requests = apiData.map((item: any) => ({
          id: item.id,
          employeeId: item.employeeId,
          employeeName: item.employee,
          designation: item.designation ?? "-",
          managerName: item.manager,
          exceptionDate: this.formatDate(item.selectedDate),
          submissionDate: this.formatDate(item.updatedDate),
          rejectedBy: item.rejectedBy ?? "NA",
          checked: false,
        }));

        this.totalRecords = res.data.total || 0;
        this.selectedRequests = [];
        this.allSelected = false;
      },
      error: () => {
        this.requests = [];
        this.totalRecords = 0;
      },
      complete: () => {
        this.commonService.setLoading(false);
      },
    });
  }

  /* ================= FILTER ACTIONS ================= */

  applyFilter() {
    this.page = 1;
    this.loadRejectedRequests();
  }

  resetFilters() {
    this.filters = {
      manager: null,
      employee: null,
      fromDate: null,
      toDate: null,
    };

    // ✅ Reapply default (last 30 days)
    this.setDefaultDateRange();

    this.page = 1;
    this.selectedRequests = [];
    this.allSelected = false;

    this.loadRejectedRequests();
  }

  /* ================= SELECTION ================= */

  toggleSelection(row: CorrectionRequest, event: any) {
    row.checked = event.target.checked;

    if (row.checked) {
      this.selectedRequests.push(row);
    } else {
      this.selectedRequests = this.selectedRequests.filter(
        (r) => r.id !== row.id,
      );
      this.allSelected = false;
    }
  }

  selectAllChange(event: any) {
    const checked = event.target.checked;
    this.allSelected = checked;

    this.requests.forEach((r) => (r.checked = checked));
    this.selectedRequests = checked ? [...this.requests] : [];
  }

  /* ================= BULK APPROVE ================= */

  approveSelected() {
    if (!this.selectedRequests.length) {
      this.toastr.warning("Please select at least one request");
      return;
    }

    const exceptionIds = this.selectedRequests.map((r) => r.id);

    this.commonService.setLoading(true);

    this.http
      .postData(
        {
          exceptionIds,
          status: "APPROVED",
        },
        this.constants.auditExceptionRequest + "/approve",
      )
      .subscribe({
        next: (res: any) => {
          this.commonService.setLoading(false);
          if (res.success) {
            this.toastr.success(
              `${exceptionIds.length} request${
                exceptionIds.length > 1 ? "s" : ""
              } approved successfully`,
            );
            this.loadRejectedRequests();
          } else {
            this.toastr.error("Bulk approval failed");
          }
        },
        error: (err: any) => {
          this.toastr.error(
            err?.error?.error || err?.error?.errors || "Bulk approval failed",
          );
          this.commonService.setLoading(false);
        },
        complete: () => {
          this.commonService.setLoading(false);
        },
      });
  }

  /* ================= PAGINATION ================= */

  onPageChange(event: any) {
    this.page = Math.floor(event.first / event.rows) + 1;
    this.limit = event.rows;
    this.loadRejectedRequests();
  }

  /* ================= UTILS ================= */

  formatDate(date: string): string {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";

    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  onManagerChange(value: any) {
    this.filters.manager = value;
  }

  onEmployeeChange(value: any) {
    this.filters.employee = value;
  }
  private formatDateForInput(date: Date | string | null): string {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  private updateDateLimits(): void {
    if (this.filters.toDate) {
      this.maxFromDate = this.filters.toDate;
    } else {
      this.maxFromDate = "";
    }

    if (this.filters.fromDate) {
      this.minToDate = this.filters.fromDate;
    } else {
      this.minToDate = "";
    }
  }

  onDateChange(): void {
    if (this.filters.fromDate && this.filters.toDate) {
      const fromDate = new Date(this.filters.fromDate);
      const toDate = new Date(this.filters.toDate);

      if (fromDate > toDate) {
        this.toastr.error("From date cannot be greater than To date");
        this.filters.fromDate = null;
        this.filters.toDate = null;
        return;
      }
    }

    this.updateDateLimits();
  }
  private setDefaultDateRange(): void {
    const today = new Date();

    // To Date = today
    const toDate = new Date(today);

    // From Date = last 30 days
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - 30);

    this.filters.fromDate = this.formatDateForInput(fromDate);
    this.filters.toDate = this.formatDateForInput(toDate);

    this.updateDateLimits();
  }
}
