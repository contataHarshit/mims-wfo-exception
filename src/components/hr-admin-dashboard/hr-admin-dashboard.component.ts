// FILE: hr-admin-dashboard.component.ts - FIXED VERSION
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

  // Store original unfiltered data
  private allHrData: HrAdminRecord[] = [];

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
    // Load employee list from localStorage cache FIRST (same as WFO Dashboard)
    this.loadEmployeeListFromCache();

    // Subscribe to manager list updates from common service (same as WFO Dashboard)
    this.commonService.managerList$
      .pipe(takeUntil(this.destroy$))
      .subscribe((list) => {
        if (list && list.length > 0) {
          this.managerList = list; // No "All" option
        }
      });

    // Subscribe to employee data updates (same as WFO Dashboard)
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

    // Fetch HR Admin data only once
    if (!this.isLoadingData) {
      this.getHrAdminData();
    }
  }

  ngOnDestroy() {
    // Cleanup subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Load employee list from localStorage cache (same as WFO Dashboard)
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

  /** Fetch HR Admin Summary Data */
  getHrAdminData() {
    // Prevent multiple simultaneous calls
    if (this.isLoadingData) {
      console.log("Already loading HR Admin data, skipping duplicate call");
      return;
    }

    this.isLoadingData = true;
    this.commonService.setLoading(true);

    const url = this.constants.hrSummary;

    this.http
      .getData(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          console.log("HR Admin API Response:", res);

          if (res?.success && res?.data?.exceptions?.data) {
            const apiData = res.data.exceptions.data;

            // Transform API response to table format
            this.allHrData = apiData
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

            this.hrData = [...this.allHrData];

            console.log("Transformed HR Data:", this.hrData.length, "records");
          } else {
            this.toastr.warning("No data found");
            this.hrData = [];
          }

          this.commonService.setLoading(false);
          this.isLoadingData = false;
        },
        error: (err) => {
          console.error("Error fetching HR Admin data:", err);
          this.commonService.setLoading(false);
          this.isLoadingData = false;
          this.toastr.error("Failed to fetch HR Admin data");
        },
      });
  }

  /** Apply Filters */
  applyFilters() {
    this.commonService.setLoading(true);

    // Start with all data
    let filteredData = [...this.allHrData];

    // Apply Employee Name filter
    if (this.filters.employeeName) {
      const employeeValue =
        typeof this.filters.employeeName === "object"
          ? (this.filters.employeeName as any).value
          : this.filters.employeeName;

      if (employeeValue) {
        filteredData = filteredData.filter(
          (item) => item.employeeNumber === employeeValue
        );
      }
    }

    // Apply Manager Name filter
    if (this.filters.managerName) {
      const managerValue =
        typeof this.filters.managerName === "object"
          ? (this.filters.managerName as any).value
          : this.filters.managerName;

      if (managerValue) {
        // Match by manager employee number from common service
        filteredData = filteredData.filter((item) => {
          // Find the manager in managerList to get their employee number
          const manager = this.managerList.find(
            (m) => m.value === managerValue
          );
          if (manager) {
            // Extract name from manager label format "Name (EmployeeNumber)"
            const managerName = manager.label.split("(")[0].trim();
            return item.managerName
              .toLowerCase()
              .includes(managerName.toLowerCase());
          }
          return false;
        });
      }
    }

    // Apply Status filter
    if (this.filters.status) {
      const statusValue =
        typeof this.filters.status === "object"
          ? (this.filters.status as any).value
          : this.filters.status;

      if (statusValue === "active") {
        filteredData = filteredData.filter((item) => item.TOTAL > 0);
      } else if (statusValue === "inactive") {
        filteredData = filteredData.filter((item) => item.TOTAL === 0);
      }
    }

    this.hrData = filteredData;

    setTimeout(() => {
      this.commonService.setLoading(false);
      const count = this.hrData.length;
      this.toastr.success(`Found ${count} record${count !== 1 ? "s" : ""}`);
    }, 200);
  }

  /** Reset Filters */
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

    // Restore all data
    this.hrData = [...this.allHrData];
    this.toastr.info("Filters reset");
  }

  /** Export to Excel */
  exportToExcel() {
    this.toastr.info("Exporting data to Excel...");
    // Implement Excel export logic here
  }

  onDateChange() {
    console.log("Date changed:", {
      from: this.filters.fromDate,
      to: this.filters.toDate,
    });
  }
}
