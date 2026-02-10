// FILE: hr-admin-dashboard.component.ts - WITH DEFICIENCY DAYS FILTER
import { CommonModule } from "@angular/common";
import { Component, OnInit, OnDestroy, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TableModule, Table } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { ToastrService } from "ngx-toastr";
import { CommonSelectComponent } from "../../common/common-select/common-select.component";
import { CommonService } from "../../service/common.service";
import { HttpService } from "../../service/http.service";
import { ConstantService } from "../../service/constant.service";
import { Subject, takeUntil } from "rxjs";
import { ManagerEmployeeFilterComponent } from "../../common/manager-employee-filter/manager-employee-filter.component";
import { CommonFormActionComponent } from "../../common/common-form-action/common-form-action.component";

interface HrAdminRecord {
  employeeId: number;
  employeeNumber: string;
  employeeName: string;
  designation: string;
  managerName: string;
  APPROVED: number;
  REJECTED: number;
  PENDING: number;
  TOTAL: number;
  workingDays?: number;
  presentDays?: number;
  holidaysDays?: number;
  leaveDays?: number;
  deficiencyDays?: number;
}

@Component({
  selector: "app-hr-admin-dashboard",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    CommonSelectComponent,
    ManagerEmployeeFilterComponent,
    CommonFormActionComponent,
  ],
  templateUrl: "./hr-admin-dashboard.component.html",
  styleUrl: "../../shared/dashboard-common.scss",
})
export class HrAdminDashboardComponent implements OnInit, OnDestroy {
  @ViewChild("hrTable") table!: Table;

  private destroy$ = new Subject<void>();
  private isLoadingData = false;

  constructor(
    private http: HttpService,
    private constants: ConstantService,
    public commonService: CommonService,
    private toastr: ToastrService,
  ) {}

  // Table data
  hrData: HrAdminRecord[] = [];
  filteredHrData: HrAdminRecord[] = []; // For deficiency days filtering
  allHrData: HrAdminRecord[] = []; // Store all data from API

  // Dropdown lists
  reportTypeList = [
    { label: "Analysis", value: "analysis" },
    { label: "Summary", value: "summary" },
  ];

  employeeList: any[] = [];
  managerList: any[] = [];

  statusList = [
    { label: "Pending", value: "PENDING" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  reasonList = [];

  // Filters with default date values
  filters = {
    reportType: "summary",
    employeeName: null,
    managerName: null,
    status: null,
    fromDate: null as string | null,
    toDate: null as string | null,
    reason: null,
  };

  minFromDate: string = "";
  maxFromDate: string = "";
  minToDate: string = "";
  maxToDate: string = "";

  // Deficiency Days filter
  deficiencyDays: string = "all";
  deficiencyDaysOptions: { label: string; value: string | number }[] = [];
  isFilteringDeficiency = false;
  totalRecords = 0;
  currentPage = 1;
  pageSize = 20;

  ngOnInit(): void {
    this.setDefaultDateRange();
    this.loadEmployeeListFromCache();

    this.commonService.managerList$
      .pipe(takeUntil(this.destroy$))
      .subscribe((list) => {
        if (list && list.length > 0) {
          this.managerList = list;
        }
      });

    this.commonService.allEmployeeData$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any[]) => {
        if (data && data.length > 0) {
          this.employeeList = data.map((item: any) => ({
            label: `${item.FullName}(${item.EmployeeNumber})`,
            value: item.EmployeeNumber,
          }));
        }
      });

    this.reasonList = this.commonService.config?.reasonList || [];
    this.getHrAdminData(true);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setDefaultDateRange(): void {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    this.filters.fromDate = this.formatDateForInput(firstDay);
    this.filters.toDate = this.formatDateForInput(lastDay);
    this.updateDateLimits();
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

  private formatDateForInput(date: Date | string | null): string {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  onDateChange(): void {
    if (this.filters.fromDate && this.filters.toDate) {
      const fromDate = new Date(this.filters.fromDate);
      const toDate = new Date(this.filters.toDate);

      if (fromDate > toDate) {
        this.toastr.error("From date cannot be greater than To date");
        this.setDefaultDateRange();
        return;
      }
    }
    this.updateDateLimits();
  }

  private resetTableSorting(): void {
    if (this.table) {
      this.table.sortField = undefined;
      this.table.sortOrder = 1;
      this.table.multiSortMeta = [];
      this.table.reset();
    }

    // Reset custom sorting state
    this.currentSortField = "";
    this.currentSortOrder = 1;
  }

  private loadEmployeeListFromCache() {
    const storedData = localStorage.getItem("allEmployeeData");
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        this.employeeList = parsedData.map((item: any) => ({
          label: `${item.FullName}(${item.EmployeeNumber})`,
          value: item.EmployeeNumber,
        }));
      } catch (e) {
        console.error("Error parsing cached employee data:", e);
      }
    }
  }
  private buildQueryParams(): any {
    const params: any = {};

    // existing filters...
    if (this.filters.fromDate) {
      params.fromDate = this.formatDate(this.filters.fromDate);
    }

    if (this.filters.toDate) {
      params.toDate = this.formatDate(this.filters.toDate);
    }
    if (this.filters.managerName) {
      params.managerEmployeeNumber = this.filters.managerName["value"];
    }
    if (this.filters.employeeName) {
      params.employeeNumber = this.filters.employeeName["value"];
    }

    // ✅ ADD PAGINATION
    params.page = this.currentPage;
    params.limit = this.pageSize;

    return params;
  }
  onLazyLoad(event: any) {
    this.pageSize = event.rows;
    this.currentPage = event.first / event.rows + 1;

    this.getHrAdminData(true);
  }

  private formatDate(date: Date | string | null): string | null {
    if (!date) return null;
    if (typeof date === "string") return date;
    const d = date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private buildQueryString(params: any): string {
    const queryParams: string[] = [];
    for (const key in params) {
      if (
        params.hasOwnProperty(key) &&
        params[key] != null &&
        params[key] !== ""
      ) {
        queryParams.push(
          `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`,
        );
      }
    }
    return queryParams.join("&");
  }

  private buildDeficiencyDaysOptions(data: HrAdminRecord[]): void {
    const uniqueValues = new Set<number>();
    data.forEach((rec) => {
      if (rec.deficiencyDays !== undefined && rec.deficiencyDays !== null) {
        uniqueValues.add(rec.deficiencyDays);
      }
    });

    const sortedValues = Array.from(uniqueValues).sort((a, b) => b - a);

    this.deficiencyDaysOptions = [
      { label: "All", value: "all" },
      ...sortedValues.map((val) => ({ label: String(val), value: val })),
    ];
  }

  getHrAdminData(withFilters: boolean = false, exporting: boolean = false) {
    if (this.isLoadingData) return;

    this.isLoadingData = true;
    this.commonService.setLoading(true);

    let url = this.constants.hrSummary;

    if (withFilters || exporting) {
      const params = this.buildQueryParams();
      if (exporting) params.exportAll = "true";
      const queryString = this.buildQueryString(params);
      if (queryString) url = `${url}?${queryString}`;
    }

    this.http
      .getData(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (res: any) => {
          if (res?.success && res?.data?.exceptions?.data) {
            const apiData = res.data.exceptions.data;

            if (exporting) {
              await this.commonService.downloadCSV(apiData);
              this.commonService.setLoading(false);
              this.isLoadingData = false;
              return;
            }

            this.totalRecords = res.data.exceptions.totalEmployees;

            this.allHrData = apiData.map((item: any) => ({
              employeeId: item.employeeId,
              employeeNumber: item.employeeNumber,
              employeeName: item.employeeName,
              designation: item.designation,
              managerName: item.managerName,
              APPROVED: item.APPROVED || 0,
              REJECTED: item.REJECTED || 0,
              PENDING: item.PENDING || 0,
              TOTAL: item.TOTAL || 0,
              workingDays: item.workingDays || 0,
              presentDays: item.presentDays || 0,
              holidaysDays: item.holidaysDays || 0,
              leaveDays: item.leaveDays || 0,
              deficiencyDays: item.deficiencyDays || 0,
            }));

            this.buildDeficiencyDaysOptions(this.allHrData);
            this.applyDeficiencyFilter();
          }

          this.commonService.setLoading(false);
          this.isLoadingData = false;
        },
        error: () => {
          this.commonService.setLoading(false);
          this.isLoadingData = false;
          this.toastr.error("Failed to fetch HR Admin data");
        },
      });
  }

  deficiencyDaysChange(): void {
    // this.isFilteringDeficiency = true;
    this.commonService.setLoading(true);
    // Simulate a brief loading state for better UX
    setTimeout(() => {
      this.applyDeficiencyFilter();
      // this.isFilteringDeficiency = false;
      this.commonService.setLoading(false);
    }, 300);
  }

  private applyDeficiencyFilter(): void {
    if (this.deficiencyDays === "all") {
      this.hrData = [...this.allHrData];
    } else {
      const filterValue = Number(this.deficiencyDays);
      this.hrData = this.allHrData.filter(
        (rec) => rec.deficiencyDays === filterValue,
      );
    }

    // Reset table to first page after filtering
  }

  applyFilters() {
    this.currentPage = 1;
    this.table.first = 0;
    this.resetTableSorting();
    this.getHrAdminData(true);
  }
  resetFilters() {
    // 1️⃣ Reset filter object completely
    this.filters = {
      reportType: "summary",
      employeeName: null,
      managerName: null,
      status: null,
      fromDate: null,
      toDate: null,
      reason: null,
    };

    // 2️⃣ Reset date range properly
    this.setDefaultDateRange();

    // 3️⃣ Reset deficiency filter
    this.deficiencyDays = "all";

    // 4️⃣ Reset table state
    this.currentPage = 1;
    this.pageSize = 20;

    if (this.table) {
      this.table.first = 0;
      this.resetTableSorting();
    }

    // 5️⃣ Fetch fresh data
    this.getHrAdminData(true);
  }

  exportToExcel() {
    if (this.hrData.length === 0) {
      this.toastr.warning("No data to export");
      return;
    }
    this.toastr.info("Exporting...");
    this.getHrAdminData(true, true);
  }
  currentSortField: string = "";
  currentSortOrder: 1 | -1 = 1;
  onSortClick(field: keyof HrAdminRecord): void {
    // Toggle sorting order if same column
    if (this.currentSortField === field) {
      this.currentSortOrder = this.currentSortOrder === 1 ? -1 : 1;
    } else {
      this.currentSortField = field;
      this.currentSortOrder = 1;
    }

    // No date fields here currently, but keeping future-safe
    const dateFields: string[] = [];

    this.hrData = this.commonService.sortData(
      this.hrData,
      field,
      this.currentSortOrder,
      dateFields.includes(field as string),
    );
  }
}
