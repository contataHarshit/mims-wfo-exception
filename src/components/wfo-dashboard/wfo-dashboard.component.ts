// Fixed wfo-dashboard.component.ts

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
  employeeId: string;
  employeeName: string;
  designation: string;
  projectName: string;
  exceptionDate: string;
  primaryReason: string;
  submissionDate: string | null;
  exceptionRequestedDays: number | null;
  exceptionApprovedDays: number | null;
  status: string;
  managerRemarks: string | null;
  exceptionId: string;
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

  reasonList = [
    { label: "All", value: "" },
    { label: "Health", value: "Health" },
    { label: "Personal Work", value: "Personal Work" },
    { label: "Travel", value: "Travel" },
    { label: "Other", value: "Other" },
  ];

  reportTypeList = [
    { label: "Employee", value: "employee" },
    { label: "Manager", value: "manager" },
  ];

  filters = {
    reportType: "employee",
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
  ngOnInit(): void {
    this.commonService.loading = true;

    // ✅ Get current view from localStorage and commonService
    this.selectedView = localStorage.getItem("selectedView") || "self";
    this.commonService.currentView = this.selectedView;

    console.log("Dashboard Init - selectedView:", this.selectedView);
    console.log(
      "Dashboard Init - commonService.currentView:",
      this.commonService.currentView
    );

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

    // Fetch initially
    this.getExceptionRequest();

    // ✅ Subscribe to view changes
    this.commonService.viewChange$.subscribe(() => {
      // Update local view state
      this.selectedView = localStorage.getItem("selectedView") || "self";
      this.commonService.currentView = this.selectedView;

      console.log("View changed - selectedView:", this.selectedView);
      console.log(
        "View changed - commonService.currentView:",
        this.commonService.currentView
      );

      // Refresh data
      this.getExceptionRequest();
    });
  }
  getExceptionRequest() {
    this.commonService.loading = true;

    const params = new URLSearchParams();

    // Pagination params
    params.set("page", this.page.toString());
    params.set("limit", this.limit.toString());

    // Date filters
    if (this.filters.fromDate) {
      const fromDate = new Date(this.filters.fromDate);
      params.set("fromDate", fromDate.toISOString().split("T")[0]); // Format: YYYY-MM-DD
    }

    if (this.filters.toDate) {
      const toDate = new Date(this.filters.toDate);
      params.set("toDate", toDate.toISOString().split("T")[0]); // Format: YYYY-MM-DD
    }

    // Employee filter - handle both object and string formats
    if (this.filters.employeeName) {
      const employeeNumber =
        typeof this.filters.employeeName === "object"
          ? (this.filters.employeeName as any).value
          : this.filters.employeeName;

      if (employeeNumber) {
        params.set("employeeNumber", employeeNumber);
      }
    }

    // Reason filter - skip if "All" or empty
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
    if(this.commonService.currentView=="self" && (this.role=="MANAGER" || this.role=="HR")){
      params.set("isSelf","true")
    }
    // Status filter - handle both object and string formats
    const status = this.filters.status
      ? typeof this.filters.status === "object"
        ? (this.filters.status as any).value
        : this.filters.status
      : "PENDING";

    params.set("status", status);
    let addedVal=this.commonService.currentView=="self"?"isSelf=true":""
    const url = `${
      this.constants.exceptionRequest
    }/paginated?${params.toString()}`;

    this.http.getData(url).subscribe({
      next: (res: any) => {
        if (res.success) {
          const exceptions = res.data.exceptions || [];

          // Map backend response to frontend table format
          this.exceptionRequests = exceptions.map((item: any) => {
            if (item.currentStatus !== "PENDING") {
              this.disableSelectAll = true;
            }

            return {
              exceptionId: item.id,
              employeeId: item.employeeNumber,
              employeeName: item.employee,
              designation: item.designation || "-",
              exceptionDate: item.selectedDate,
              primaryReason: item.primaryReason,
              submissionDate: this.formatDate(item.submissionDate),
              exceptionRequestedDays: item.requestedDays || null,
              exceptionApprovedDays: item.approvedDays || null,
              status: item.currentStatus,
              managerName:item.managerName,
              managerRemarks: item.managerRemarks || null,
              checked: false // Reset checkbox state
            };
          });

          this.totalRecords = res.data.pagination?.total || exceptions.length;

          // Clear selections when data refreshes
          this.selectedRequests = [];
        } else {
          this.exceptionRequests = [];
          this.totalRecords = 0;
          this.toastr.warning("No records found");
        }
        this.commonService.loading = false;
      },
      error: (err: any) => {
        console.error("Error fetching exception requests:", err);
        this.exceptionRequests = [];
        this.totalRecords = 0;
        this.commonService.loading = false;
        this.toastr.error("Failed to fetch data. Please try again.");
      },
    });
  }
  onPageChange(event: any) {
    this.page = Math.floor(event.first / event.rows) + 1;
    this.limit = event.rows;
    this.selectedRequests = []; // Clear selections on page change
    this.getExceptionRequest();
  }
  formatDate(date: string): string {
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
    // Reset to first page when applying filters
    this.page = 1;

    // Fetch data with current filters
    this.getExceptionRequest();

    // Show success message after data loads
    setTimeout(() => {
      const count = this.exceptionRequests.length;
      this.toastr.success(
        `Filter applied. Found ${count} record${count !== 1 ? "s" : ""}`
      );
    }, 300);
  }
  resetFilters() {
    // Reset all filter values to defaults
    this.filters = {
      reportType: "employee",
      employeeName: null,
      status: "PENDING",
      fromDate: null,
      toDate: null,
      reason: null,
    };

    // Reset pagination to first page
    this.page = 1;

    // Fetch fresh data with reset filters
    this.getExceptionRequest();

    // Show reset confirmation
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

    console.log("Bulk Update Payload:", payload);

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
        console.log("✅ Delete confirmed for record:", req);
        // Here you can call your API when ready
      } else {
        console.log("❌ Delete canceled");
      }
    });
  }
  selectAllChange(e: any) {
    this.exceptionRequests = this.exceptionRequests.map((item: any) => {
      return {
        ...item,
        checked: e.target.checked ? true : false,
      };
    });
  }
}
