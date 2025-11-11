// FILE: wfo-dashboard.component.ts
import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
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
  status: string; // PENDING | APPROVED | REJECTED | PARTIALLY_APPROVED
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
export class WfoDashboardComponent implements OnInit {
  selectedView: string = "";

  constructor(
    private dialog: MatDialog,
    public commonService: CommonService,
    private http: HttpService,
    private constants: ConstantService,
    private toastr: ToastrService
  ) {}

  // Store original unfiltered data
  private allExceptionRequests: ExceptionRequest[] = [];

  // Exception Request Data
  exceptionRequests: ExceptionRequest[] = [];

  // selection for bulk actions
  selectedRequests: ExceptionRequest[] = [];

  // Dropdown data
  employeeList: any[] = [];

  statusList = [
    { label: "Pending", value: "PENDING" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  reasonList = []

  reportTypeList = [
    { label: "Employee", value: "employee" },
    { label: "Manager", value: "manager" },
  ];

  filters: any = {
    managerName: null,
    employeeName: null,
    status: "PENDING", // Keep this as a string, not an object
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

  ngOnInit(): void {
    this.commonService.setLoading(true);

    // Get current view from localStorage and commonService
    this.selectedView = localStorage.getItem("selectedView") || "self";
    // this.selectedView = this.selectedView;

    const storedData =
      localStorage.getItem("role") === "MANAGER"
        ? localStorage.getItem("managerEmployeeData")
        : localStorage.getItem("allEmployeeData");
    this.role = localStorage.getItem("role") || "";
    this.employeeList = storedData
      ? JSON.parse(storedData).map((item: any) => ({
          label: `${item.FullName}(${item.EmployeeNumber})`,
          value: item.EmployeeNumber,
        }))
      : [];

    // Subscribe to view changes
    this.commonService.viewChange$.subscribe(() => {
      this.selectedView = localStorage.getItem("selectedView") || "self";
      // this.selectedView = this.selectedView;
      this.commonService.managerList$.subscribe((list) => {
        this.managerList = list;
      });
      this.getExceptionRequest();
    });
    this.reasonList=this.commonService.config.reasonList || [];
  }

  // Utility to safely get status value whether filters.status is string or object
  getStatusValue(status: any): string {
    if (!status) return "";
    return typeof status === "string" ? status : status.value || "";
  }

  // Exposed methods used in template to decide whether to show Approved/Rejected columns
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

  getExceptionRequest() {
    this.commonService.setLoading(true);

    const params = new URLSearchParams();

    // Pagination params
    params.set("page", this.page.toString());
    params.set("limit", this.limit.toString());

    // Date filters
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

    // Manager for self view
    if (
      this.selectedView == "self" &&
      (this.role == "MANAGER" || this.role == "HR")
    ) {
      params.set("isSelf", "true");
      this.commonService.projectManager$.subscribe((manager: any) => {
        this.filters.managerName = manager;
      });
    } else if (this.selectedView === "resource") {
      this.commonService.employeeName$.subscribe((emp: any) => {
        this.filters.managerName = emp;
      });
    } else {
      this.filters.managerName = null;
    }

    // Status filter - normalize
    // Status filter - send only when valid
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

    const url = `${
      this.constants.exceptionRequest
    }/paginated?${params.toString()}`;

    this.http.getData(url).subscribe({
      next: (res: any) => {
        if (res.success) {
          const exceptions = res.data.exceptions || [];

          // Reset disableSelectAll then compute based on entire list
          this.disableSelectAll = false;

          // Map backend response to frontend table format
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
              checked: false,
            } as ExceptionRequest;
          });

          // If every item is non-pending, disable select all; else keep enabled
          this.disableSelectAll =
            this.exceptionRequests.length > 0 &&
            this.exceptionRequests.every((i) => i.status !== "PENDING");

          this.totalRecords = res.data.pagination?.total || exceptions.length;

          // Clear selections when data refreshes
          this.selectedRequests = [];
        } else {
          this.exceptionRequests = [];
          this.totalRecords = 0;
          this.toastr.warning("No records found");
        }
        this.commonService.setLoading(false);
      },
      error: (err: any) => {
        console.error("Error fetching exception requests:", err);
        this.exceptionRequests = [];
        this.totalRecords = 0;
        this.commonService.setLoading(false);
        this.toastr.error("Failed to fetch data. Please try again.");
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
    console.log("this is manager filter", this.filters.managerName);

    this.getExceptionRequest();

    setTimeout(() => {
      const count = this.exceptionRequests.length;
      this.toastr.success(
        `Filter applied. Found ${count} record${count !== 1 ? "s" : ""}`
      );
    }, 300);
  }

  // Your resetFilters is also correct:
  resetFilters() {
    this.filters = {
      managerName: null,
      employeeName: null,
      status: "PENDING", // Reset to string value
      fromDate: null,
      toDate: null,
      reason: null,
    };

    this.page = 1;
    this.getExceptionRequest();
    this.toastr.info("Filters reset successfully");
  }

  export() {
    this.toastr.info("Exporting...");
  }

  toggleSelection(req: ExceptionRequest, event: any) {
    if (req.status === "APPROVED") return;

    const checked = event?.target?.checked ?? false;
    req.checked = checked;

    if (checked) {
      this.selectedRequests.push(req);
    } else {
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
    const payload = { ids, status };

    this.http.putData(this.constants.exceptionRequest, payload).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success(
            `${
              this.selectedRequests.length
            } requests ${status.toLowerCase()} successfully`
          );
          this.selectedRequests = [];
          this.getExceptionRequest();
        } else {
          this.toastr.error("Bulk update failed");
        }
      },
      error: (err: any) => {
        console.error("Bulk Update Error:", err);
        this.toastr.error("Bulk update failed");
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
      data: { message: "Are you sure you want to delete this record?" },
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
              this.toastr.error("Error deleting record. Please try again.");
              console.error("DELETE API Error:", err);
            },
          });
      } else {
        console.log("❌ Delete canceled");
      }
    });
  }

  selectAllChange(e: any) {
    this.exceptionRequests = this.exceptionRequests.map((item: any) => ({
      ...item,
      checked: e.target.checked ? true : false,
    }));

    // Update selectedRequests array
    if (e.target.checked) {
      this.selectedRequests = [
        ...this.exceptionRequests.filter((i) => i.status === "PENDING"),
      ];
    } else {
      this.selectedRequests = [];
    }
  }
  onStatusChange(value: any) {
    // ng-select with bindValue will return just the string value
    this.filters.status = value;
    this.page = 1;
    this.getExceptionRequest();
  }
}
