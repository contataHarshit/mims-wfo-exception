// FILE: wfo-dashboard.component.ts - FIXED VERSION
import { CommonModule } from "@angular/common";
import { Component, OnInit, NgZone, OnDestroy } from "@angular/core";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { FormsModule } from "@angular/forms";
import { WfoActionPopupComponent } from "../../popup/wfo-action-popup/wfo-action-popup.component";
import { CommonService } from "../../service/common.service";
import { HttpService } from "../../service/http.service";
import { ConstantService } from "../../service/constant.service";
import { CardModule } from "primeng/card";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { InputTextareaModule } from "primeng/inputtextarea";
import { DateRangePickerComponent } from "../../common/date-range-picker/date-range-picker.component";
import { CommonSelectComponent } from "../../common/common-select/common-select.component";
import { ToastrService } from "ngx-toastr";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { ConfirmPopupComponent } from "../../popup/confirm-popup/confirm-popup.component";
import { Subject, takeUntil } from "rxjs";

interface ExceptionRequest {
  exceptionId: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  projectName?: string;
  exceptionDate: string;
  primaryReason: string;
  submissionDate: string | null;
  exceptionRequestedDays: number | null;
  exceptionApprovedDays: number | null;
  status: string;
  managerRemarks: string | null;
  managerName: string | null;
  approvedBy: string | null;
  rejectedBy: string | null;
  checked?: boolean;
}

@Component({
  selector: "app-wfo-dashboard",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    CardModule,
    TableModule,
    ButtonModule,
    InputTextareaModule,
    MatCheckboxModule,
    DateRangePickerComponent,
    CommonSelectComponent,
  ],
  templateUrl: "./wfo-dashboard.component.html",
  styleUrls: ["./wfo-dashboard.component.scss"],
})
export class WfoDashboardComponent implements OnInit, OnDestroy {
  selectedView: string = "";
  private destroy$ = new Subject<void>();
  private isLoadingData = false;

  constructor(
    private dialog: MatDialog,
    public commonService: CommonService,
    private http: HttpService,
    private constants: ConstantService,
    private toastr: ToastrService,
    private ngZone: NgZone
  ) {}

  private allExceptionRequests: ExceptionRequest[] = [];
  exceptionRequests: ExceptionRequest[] = [];
  selectedRequests: ExceptionRequest[] = [];
  employeeList: any[] = [];

  statusList = [
    { label: "Pending", value: "PENDING" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  reasonList = [];

  reportTypeList = [
    { label: "Employee", value: "employee" },
    { label: "Manager", value: "manager" },
  ];

  filters: any = {
    managerName: null,
    employeeName: null,
    status: "PENDING",
    fromDate: null as Date | null,
    toDate: null as Date | null,
    reason: null,
  };

  showSubmit = false;
  role = "";
  disableSelectAll = false;
  page: number = 1;
  limit: number = 10;
  totalRecords: number = 0;
  managerList: any[] = [];
  remarks: string = "";
  department: string = "";
  allSelected: boolean = false;
  ngOnInit(): void {
    this.commonService.setLoading(true);

    this.role = localStorage.getItem("role") || "";
    this.department = localStorage.getItem("department") || "";
    if (this.role == "ADMIN") {
      this.selectedView = "all";
      this.commonService.selectedView = "all";
      this.commonService.viewChange$.next("all");
      localStorage.setItem("selectedView", "all");
    } else {
      this.selectedView = "self";
      this.commonService.selectedView = "self";
      this.commonService.viewChange$.next("self");
      localStorage.setItem("selectedView", "self");
    }
    // Load employee list from localStorage FIRST
    this.loadEmployeeListFromCache();

    // Subscribe to manager list updates
    this.commonService.managerList$
      .pipe(takeUntil(this.destroy$))
      .subscribe((list) => {
        if (list && list.length > 0) {
          this.managerList = list;
        }
      });

    // Set manager name for self view
    if (this.selectedView === "self") {
      this.setManagerForSelfView();
    }

    // Subscribe to view changes - but prevent duplicate API calls
    this.commonService.viewChange$
      .pipe(takeUntil(this.destroy$))
      .subscribe((newView) => {
        const previousView = this.selectedView;
        this.filters.status = "PENDING";
        this.allSelected = false;
        this.selectedView = localStorage.getItem("selectedView") || "self";
        if (this.selectedView === "self") {
          this.setManagerForSelfView();
        }
        if (this.selectedView === "resource") {
          let temp = JSON.parse(localStorage.getItem("employeeData") || "null");
          this.filters.managerName = {
            label: temp?.employeeName,
            value: temp?.employeeNumber,
          };
        }
        if (this.selectedView === "all") {
          this.filters.managerName = null;
        }
        // Only reload if view actually changed
        if (previousView !== this.selectedView) {
          console.log(
            `View changed from ${previousView} to ${this.selectedView}`
          );

          // Reset manager filter when view changes
          if (this.selectedView === "self") {
            this.setManagerForSelfView();
          }
          if (this.selectedView === "resource") {
            let temp = JSON.parse(
              localStorage.getItem("employeeData") || "null"
            );
            this.filters.managerName = {
              label: temp?.employeeName,
              value: temp?.employeeNumber,
            };
          }

          // Reset page and reload
          this.page = 1;
          this.getExceptionRequest();
        }
      });

    // Subscribe to employee data updates (only once)
    this.commonService.allEmployeeData$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any[]) => {
        if (data && data.length > 0 && this.employeeList.length === 0) {
          this.employeeList = data.map((item: any) => ({
            label: `${item.FullName}(${item.EmployeeNumber})`,
            value: item.EmployeeNumber,
          }));
        }
      });

    this.reasonList = this.commonService.config?.reasonList || [];

    // Initial data load - only if not already loading
    if (!this.isLoadingData) {
      this.getExceptionRequest();
    }
  }

  ngOnDestroy() {
    // Cleanup subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Load employee list from localStorage cache
  private loadEmployeeListFromCache() {
    const storedData =
      this.role === "MANAGER"
        ? localStorage.getItem("managerEmployeeData")
        : localStorage.getItem("allEmployeeData");

    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        this.employeeList = parsedData.map((item: any) => ({
          label: `${item.FullName}(${item.EmployeeNumber})`,
          value: item.EmployeeNumber,
        }));
        console.log(
          "Loaded employee list from cache:",
          this.employeeList.length
        );
      } catch (e) {
        console.error("Error parsing cached employee data:", e);
      }
    }
  }

  // Helper method to set manager for self view
  private setManagerForSelfView() {
    const employeeData = JSON.parse(
      localStorage.getItem("employeeData") || "null"
    );
    if (employeeData?.managerName) {
      this.ngZone.run(() => {
        this.filters.managerName = {
          label: employeeData.managerName.name,
          value: employeeData.managerName.EmployeeId,
        };
      });
    }
  }

  // Get display value for manager name in self view
  get managerDisplayName(): string {
    if (this.filters.managerName) {
      if (typeof this.filters.managerName === "object") {
        return this.filters.managerName.label || "";
      }
      return this.filters.managerName;
    }
    return "";
  }

  getStatusValue(status: any): string {
    if (!status) return "";
    return typeof status === "string" ? status : status.value || "";
  }

  showApprovedColumn(): boolean {
    const s = this.getStatusValue(this.filters.status);
    return (
      s === "APPROVED" ||
      this.exceptionRequests.some((r) => r.status === "APPROVED")
    );
  }

  showRejectedColumn(): boolean {
    const s = this.getStatusValue(this.filters.status);
    return (
      s === "REJECTED" ||
      this.exceptionRequests.some((r) => r.status === "REJECTED")
    );
  }

  getExceptionRequest(exporting: boolean = false) {
    // Prevent multiple simultaneous calls
    if (this.isLoadingData) {
      console.log("Already loading data, skipping duplicate call");
      return;
    }

    this.isLoadingData = true;
    this.commonService.setLoading(true);

    const params = new URLSearchParams();

    params.set("page", this.page.toString());
    params.set("limit", this.limit.toString());

    if (this.filters.fromDate) {
      const fromDate = new Date(this.filters.fromDate);
      params.set("fromDate", fromDate.toISOString().split("T")[0]);
    }

    if (this.filters.toDate) {
      const toDate = new Date(this.filters.toDate);
      params.set("toDate", toDate.toISOString().split("T")[0]);
    }

    if (this.filters.managerName && this.filters.managerName.value) {
      params.set("managerEmployeeNumber", this.filters.managerName.value);
    }

    if (this.filters.employeeName) {
      const employeeNumber =
        typeof this.filters.employeeName === "object"
          ? (this.filters.employeeName as any).value
          : this.filters.employeeName;

      if (employeeNumber) {
        params.set("employeeNumber", employeeNumber);
      }
    }

    if (
      this.filters.reason &&
      this.filters.reason !== "All" &&
      this.filters.reason !== ""
    ) {
      const reason =
        typeof this.filters.reason === "object"
          ? (this.filters.reason as any).value
          : this.filters.reason;

      if (reason) {
        params.set("reason", reason);
      }
    }

    const status = this.getStatusValue(this.filters.status);
    if (status) {
      params.set("status", status);
    }

    if (this.selectedView === "self") {
      params.set("isSelf", "true");
    }

    if (this.selectedView && this.selectedView.trim() === "all") {
      params.set("isAll", "true");
    }

    if (exporting) {
      params.set("exportAll", "true");
    }

    const url = `${
      this.constants.exceptionRequest
    }/paginated?${params.toString()}`;

    this.http
      .getData(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (res: any) => {
          if (res.success) {
            const exceptions = res.data.exceptions || [];

            // If exporting, just download CSV and return early
            if (exporting) {
              await this.commonService.downloadCSV(exceptions);
              this.commonService.setLoading(false);
              this.isLoadingData = false;
              return;
            }

            // Only update UI state when NOT exporting
            this.disableSelectAll = false;
            this.allSelected = false;
            this.exceptionRequests = exceptions.map((item: any) => {
              return {
                exceptionId: item.id,
                employeeId: item.employeeNumber,
                employeeName: item.employee,
                designation: item.designation || "-",
                exceptionDate: this.formatDate(item.selectedDate),
                primaryReason: item.primaryReason || "-",
                submissionDate: item.submissionDate
                  ? this.formatDate(item.submissionDate)
                  : null,
                exceptionRequestedDays: item.requestedDays || null,
                exceptionApprovedDays: item.approvedDays || null,
                status: item.currentStatus || "PENDING",
                approvedBy: item.approvedBy || "-",
                rejectedBy: item.rejectedBy || "-",
                managerName: item?.manager || "-",
                managerRemarks: item.managerRemarks || null,
                remarks: item.remarks || "-",
                checked: false,
              } as ExceptionRequest;
            });

            let tempHash: any = {};
            for (let i = 0; i < this.exceptionRequests.length; i++) {
              if (!tempHash[this.exceptionRequests[i].status]) {
                tempHash[this.exceptionRequests[i].status] = true;
              }
            }

            if (Object.keys(tempHash).length == 1) {
              if (
                Object.keys(tempHash)[0] == "REJECTED" ||
                (Object.keys(tempHash)[0] == "APPROVED" &&
                  this.selectedView === "resource")
              ) {
                this.disableSelectAll = true;
              }
            }

            this.totalRecords = res.data.pagination?.total || exceptions.length;
            this.selectedRequests = [];
          } else {
            if (!exporting) {
              this.exceptionRequests = [];
              this.totalRecords = 0;
              this.toastr.warning("No records found");
            }
          }

          this.commonService.setLoading(false);
          this.isLoadingData = false;
        },

        error: (err: any) => {
          console.error("Error fetching exception requests:", err);
          if (!exporting) {
            this.exceptionRequests = [];
            this.totalRecords = 0;
          }
          this.commonService.setLoading(false);
          this.isLoadingData = false;
          this.toastr.error(
            err?.error?.error || err?.error?.errors || "Failed to fetch data. Please try again."
          );
        },
      });
  }
  onPageChange(event: any) {
    this.page = event.first / event.rows + 1;
    this.limit = event.rows;

    this.getExceptionRequest();
  }

  formatDate(date: string): string {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  onDateChange() {
    console.log("Date changed:", {
      from: this.filters.fromDate,
      to: this.filters.toDate,
    });
  }

  applyFilter() {
    this.page = 1;
    this.getExceptionRequest();

    setTimeout(() => {
      const count = this.exceptionRequests.length;
      this.toastr.success(
        `Filter applied. Found ${count} record${count !== 1 ? "s" : ""}`
      );
    }, 300);
  }

  resetFilters() {
    this.filters = {
      managerName: null,
      employeeName: null,
      status: "PENDING",
      fromDate: null,
      toDate: null,
      reason: null,
    };

    // Restore manager name for self view after reset
    if (this.selectedView === "self") {
      this.setManagerForSelfView();
    }

    this.page = 1;
    this.getExceptionRequest();
    this.toastr.info("Filters reset successfully");
  }

  export() {
    if (!this.exceptionRequests.length) {
      this.toastr.warning("No data available to export");
      return;
    }
    this.toastr.info("Exporting...");
    this.getExceptionRequest(true);
  }

  toggleSelection(req: ExceptionRequest, event: any) {
    if (
      req.status === "APPROVED" &&
      this.role === "MANAGER" &&
      this.selectedView === "resource"
    ) {
      return;
    }

    const checked = event?.target?.checked ?? false;
    req.checked = checked;

    if (checked) {
      console.log("1111");

      this.selectedRequests.push(req);
    } else {
      console.log("122222");

      this.selectedRequests = this.selectedRequests.filter(
        (r) => r.exceptionId !== req.exceptionId
      );
    }
  }

  bulkUpdate(status: "APPROVED" | "REJECTED") {
    if (this.selectedRequests.length === 0) {
      this.toastr.warning("Please select at least one request.");
      return;
    }

    const ids = this.selectedRequests.map((r) => r.exceptionId);
    const payload: any = { ids, status };
    if (this.remarks) {
      payload.remarks = this.remarks;
    }

    this.http.putData(this.constants.exceptionRequest, payload).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success(
            `${
              this.selectedRequests.length
            } requests ${status.toLowerCase()} successfully`
          );
          this.selectedRequests = [];
          this.remarks = "";
          this.getExceptionRequest();
        } else {
          this.toastr.error("Bulk update failed");
        }
      },
      error: (err: any) => {
        console.error("Bulk Update Error:", err);
        this.toastr.error(err?.error?.error || err?.error?.errors || "Bulk update failed");
      },
    });
  }

  openActionDialog(request: ExceptionRequest) {
    const modalRef = this.dialog.open(WfoActionPopupComponent, {
      width: "500px",
      data: request,
    });

    modalRef.afterClosed().subscribe((result) => {
      if (result) {
        let currentStatus = "";
        switch (result.action) {
          case "approved":
            currentStatus = "APPROVED";
            break;
          case "partial":
            currentStatus = "PARTIALLY_APPROVED";
            break;
          case "rejected":
            currentStatus = "REJECTED";
            break;
          default:
            currentStatus = "PENDING";
        }

        const payload = {
          updateDateRangeId: request.exceptionId,
          currentStatus: currentStatus,
          managerRemarks: result.remarks,
          exceptionApprovedDays:
            result.approvedDays || request.exceptionApprovedDays || 1,
        };

        this.http.putData(this.constants.exceptionRequest, payload).subscribe({
          next: (res: any) => {
            if (res.success) {
              this.toastr.success("Request updated successfully");
              this.getExceptionRequest();
            } else {
              this.toastr.error("Error updating request. Please try again.");
            }
          },
          error: (err: any) => {
            this.toastr.error("Error updating request. Please try again.");
            console.error("PUT API Error:", err);
          },
        });
      }
    });
  }

  deleteRow(req?: any) {
    const dialogRef = this.dialog.open(ConfirmPopupComponent, {
      width: "400px",
      data: {
        message: "Are you sure you want to delete this record?",
        title: "Confirm Delete",
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.http
          .deleteData(`${this.constants.exceptionRequest}/${req.exceptionId}`)
          .subscribe({
            next: (res: any) => {
              if (res.success) {
                this.toastr.success("Record deleted successfully");
                this.getExceptionRequest();
              }
            },
            error: (err: any) => {
              this.toastr.error(
                err?.error?.error || err?.error?.errors || "Error deleting record. Please try again."
              );
              console.error("DELETE API Error:", err);
            },
          });
      }
    });
  }

  selectAllChange(e: any) {
    this.exceptionRequests = this.exceptionRequests.map((item: any) => ({
      ...item,
      checked: e.target.checked ? true : false,
    }));

    if (e.target.checked) {
      this.selectedRequests = [
        ...this.exceptionRequests.filter((i) => {
          return (
            i.status === "PENDING" ||
            (i.status === "APPROVED" && this.selectedView !== "resource")
          );
        }),
      ];
    } else {
      this.selectedRequests = [];
    }
  }

  onStatusChange(value: any) {
    console.log("vallll", value);

    this.filters.status = value;
    this.page = 1;
    this.getExceptionRequest();
  }
}
