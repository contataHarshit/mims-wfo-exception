// FILE: hr-admin-dashboard.component.ts - BACKEND FILTERING VERSION
import { CommonModule } from "@angular/common";
import { Component, OnInit, OnDestroy } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { ToastrService } from "ngx-toastr";
import { CommonSelectComponent } from "../../common/common-select/common-select.component";
import { CommonService } from "../../service/common.service";
import { HttpService } from "../../service/http.service";
import { ConstantService } from "../../service/constant.service";
import { Subject, takeUntil } from "rxjs";

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
  ],
  templateUrl: "./hr-admin-dashboard.component.html",
  styleUrls: ["./hr-admin-dashboard.component.scss"],
})
export class HrAdminDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private isLoadingData = false;

  constructor(
    private http: HttpService,
    private constants: ConstantService,
    public commonService: CommonService,
    private toastr: ToastrService
  ) {}

  // Table data
  hrData: HrAdminRecord[] = [];

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

  // Filters
  filters = {
    reportType: "summary",
    employeeName: null,
    managerName: null,
    status: null,
    fromDate: null as Date | null,
    toDate: null as Date | null,
    reason: null,
  };

  ngOnInit(): void {
    // Load employee list from localStorage cache
    this.loadEmployeeListFromCache();

    // Subscribe to manager list updates
    this.commonService.managerList$
      .pipe(takeUntil(this.destroy$))
      .subscribe((list) => {
        if (list && list.length > 0) {
          this.managerList = list;
        }
      });

    // Subscribe to employee data updates
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

    // Get reason list from config
    this.reasonList = this.commonService.config?.reasonList || [];

    // Fetch HR Admin data on init (without filters)
    this.getHrAdminData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
        console.log(
          "HR Admin - Loaded employee list from cache:",
          this.employeeList.length
        );
      } catch (e) {
        console.error("Error parsing cached employee data:", e);
      }
    }
  }

  /** Build query parameters from filters */
  private buildQueryParams(): any {
    const params: any = {};

    // Employee Name filter
    if (this.filters.employeeName) {
      const employeeValue =
        typeof this.filters.employeeName === "object"
          ? (this.filters.employeeName as any).value
          : this.filters.employeeName;

      if (employeeValue) {
        params.employeeNumber = employeeValue;
      }
    }

    // Manager Name filter
    if (this.filters.managerName) {
      const managerValue =
        typeof this.filters.managerName === "object"
          ? (this.filters.managerName as any).value
          : this.filters.managerName;

      if (managerValue) {
        params.managerEmployeeNumber = managerValue;
      }
    }

    // Status filter
    if (this.filters.status) {
      const statusValue =
        typeof this.filters.status === "object"
          ? (this.filters.status as any).value
          : this.filters.status;

      if (statusValue) {
        params.status = statusValue;
      }
    }

    // From Date filter
    if (this.filters.fromDate) {
      params.fromDate = this.formatDate(this.filters.fromDate);
    }

    // To Date filter
    if (this.filters.toDate) {
      params.toDate = this.formatDate(this.filters.toDate);
    }

    // Reason filter
    if (this.filters.reason) {
      const reasonValue =
        typeof this.filters.reason === "object"
          ? (this.filters.reason as any).value
          : this.filters.reason;

      if (reasonValue) {
        params.reason = reasonValue;
      }
    }

    return params;
  }

  /** Format date to YYYY-MM-DD */
  private formatDate(date: Date | string | null): string | null {
    if (!date) return null;

    const d = typeof date === "string" ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  /** Build query string from params object */
  private buildQueryString(params: any): string {
    const queryParams: string[] = [];

    for (const key in params) {
      if (
        params.hasOwnProperty(key) &&
        params[key] != null &&
        params[key] !== ""
      ) {
        queryParams.push(
          `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
        );
      }
    }

    return queryParams.join("&");
  }

  /** Fetch HR Admin Summary Data with filters */
  /** Fetch HR Admin Summary Data with filters */
  getHrAdminData(withFilters: boolean = false, exporting: boolean = false) {
    if (this.isLoadingData) {
      console.log("Already loading HR Admin data, skipping duplicate call");
      return;
    }

    this.isLoadingData = true;
    this.commonService.setLoading(true);

    // Build URL with query parameters
    let url = this.constants.hrSummary;

    if (withFilters || exporting) {
      const params = this.buildQueryParams();

      // Add exportAll param when exporting
      if (exporting) {
        params.exportAll = "true";
      }

      const queryString = this.buildQueryString(params);

      if (queryString) {
        url = `${url}?${queryString}`;
      }

      console.log("Fetching HR Admin data with URL:", url);
    }

    this.http
      .getData(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (res: any) => {
          console.log("HR Admin API Response:", res);

          if (res?.success && res?.data?.exceptions?.data) {
            const apiData = res.data.exceptions.data;

            // If exporting, just download and return early
            if (exporting) {
              await this.commonService.downloadCSV(apiData);
              this.commonService.setLoading(false);
              this.isLoadingData = false;
              return;
            }

            // Only update UI state when NOT exporting
            // Transform API response to table format
            this.hrData = apiData
              .filter((item: any) => item.employeeNumber)
              .map((item: any) => ({
                employeeId: item.employeeId,
                employeeNumber: item.employeeNumber || "N/A",
                employeeName: item.employeeName || "N/A",
                designation: item.designation || "N/A",
                managerName: item.managerName || "N/A",
                APPROVED: item.APPROVED || 0,
                REJECTED: item.REJECTED || 0,
                PENDING: item.PENDING || 0,
                TOTAL: item.TOTAL || 0,
              }));

            console.log("Transformed HR Data:", this.hrData.length, "records");

            if (withFilters) {
              const count = this.hrData.length;
              this.toastr.success(
                `Found ${count} record${count !== 1 ? "s" : ""}`
              );
            }
          } else {
            if (!exporting) {
              this.toastr.warning("No data found");
              this.hrData = [];
            }
          }

          this.commonService.setLoading(false);
          this.isLoadingData = false;
        },
        error: (err) => {
          console.error("Error fetching HR Admin data:", err);
          if (!exporting) {
            this.hrData = [];
          }
          this.commonService.setLoading(false);
          this.isLoadingData = false;
          this.toastr.error("Failed to fetch HR Admin data");
        },
      });
  }

  /** Apply Filters - Fetch data from backend with filter params */
  applyFilters() {
    console.log("Applying filters:", this.filters);

    // Validate date range
    if (this.filters.fromDate && this.filters.toDate) {
      const fromDate = new Date(this.filters.fromDate);
      const toDate = new Date(this.filters.toDate);

      if (fromDate > toDate) {
        this.toastr.error("From date cannot be greater than To date");
        return;
      }
    }

    // Fetch data with filters
    this.getHrAdminData(true);
  }

  /** Reset Filters - Fetch all data without filters */
  resetFilters() {
    this.filters = {
      reportType: "summary",
      employeeName: null,
      managerName: null,
      status: null,
      fromDate: null,
      toDate: null,
      reason: null,
    };

    // Fetch all data without filters
    this.getHrAdminData(false);
    this.toastr.info("Filters reset");
  }

  /** Export to Excel */
  exportToExcel() {
    if (this.hrData.length === 0) {
      this.toastr.warning("No data to export");
      return;
    }
    this.toastr.info("Exporting...");
    this.getHrAdminData(true, true);
  }

  onDateChange() {
    console.log("Date changed:", {
      from: this.filters.fromDate,
      to: this.filters.toDate,
    });
  }
}
