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
    { label: "All", value: "" },
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
    status: null,
    fromDate: null as Date | null,
    toDate: null as Date | null,
    reason: null,
  };
  showSubmit=false
  role=""
  ngOnInit(): void {
    this.commonService.loading = true;
    
    // ✅ Get current view from localStorage and commonService
    this.selectedView = localStorage.getItem("selectedView") || "self";
    this.commonService.currentView = this.selectedView;
    
    console.log("Dashboard Init - selectedView:", this.selectedView);
    console.log("Dashboard Init - commonService.currentView:", this.commonService.currentView);

    const storedData =
      localStorage.getItem("role") === "MANAGER"
        ? localStorage.getItem("managerEmployeeData")
        : localStorage.getItem("allEmployeeData");
    this.role=localStorage.getItem("role") || ""
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
      console.log("View changed - commonService.currentView:", this.commonService.currentView);
      
      // Refresh data
      this.getExceptionRequest();
    });
  }

  getExceptionRequest() {
    this.commonService.loading = true;
    
    // ✅ Get current view from commonService
    const currentView = this.commonService.currentView || localStorage.getItem("selectedView") || "self";
    
    console.log("Fetching data for view:", currentView);
    
    const url =
      this.constants.exceptionRequest +
      "/paginated" +
      (currentView === "self" && localStorage.getItem("role") !=="EMPLOYEE" && localStorage.getItem("role")!=="ADMIN" ? "?isSelf=true" : "");
    console.log("url",url);
    
    console.log("API URL:", url);

    this.http.getData(url).subscribe({
      next: (response: any) => {
        console.log("Exception Request Data Response:", response);

        const exceptions = response?.data?.exceptions || [];

        if (!exceptions.length) {
          this.allExceptionRequests = [];
          this.exceptionRequests = [];
          this.commonService.loading = false;
          return;
        }

        // Transform backend exceptions to table data
        const transformedData = exceptions.map((ex: any) => ({
          employeeId: ex.employeeNumber || "N/A",
          employeeName: ex.employee || "N/A",
          designation: ex.designation || "N/A",
          projectName: ex.projectName || "N/A",
          exceptionDate: ex.selectedDate || "N/A",
          primaryReason: ex.primaryReason || "N/A",
          submissionDate: ex.submissionDate
            ? new Date(ex.submissionDate).toLocaleDateString("en-GB")
            : "N/A",
          exceptionRequestedDays: ex.exceptionRequestedDays || null,
          exceptionApprovedDays: ex.exceptionApprovedDays || null,
          status: ex.currentStatus || "PENDING",
          managerRemarks: ex.remarks || "N/A",
          exceptionId: ex.id,
          checked: false,
        }));

        // Store both original and display data
        this.allExceptionRequests = [...transformedData];
        this.exceptionRequests = [...transformedData];

        this.commonService.loading = false;
        console.log("Transformed Table Data:", this.exceptionRequests);
      },
      error: (err: any) => {
        this.commonService.loading = false;
        console.error("Exception Request API Error:", err);
      },
    });
  }

  onDateChange() {
    console.log("Date changed:", {
      from: this.filters.fromDate,
      to: this.filters.toDate,
    });
  }

  applyFilter() {
    this.commonService.loading = true;

    let filteredData = [...this.allExceptionRequests];

    // Employee Name / Employee Number filter
    let employeeNumber: any = null;
    if (this.filters.employeeName) {
      employeeNumber =
        typeof this.filters.employeeName === "object"
          ? (this.filters.employeeName as any).value
          : this.filters.employeeName;

      if (employeeNumber && employeeNumber !== "") {
        filteredData = filteredData.filter(
          (item) =>
            item.employeeId.includes(employeeNumber) ||
            item.employeeName
              .toLowerCase()
              .includes(String(employeeNumber).toLowerCase())
        );
      }
    }

    // Status filter
    let status = this.filters.status;
    if (status && status !== "") {
      status = typeof status === "object" ? (status as any).value : status;
      filteredData = filteredData.filter(
        (item) => item.status.toUpperCase() === String(status).toUpperCase()
      );
    }

    // Reason filter
    let reason = this.filters.reason;
    if (reason && reason !== "" && reason !== "All") {
      reason = typeof reason === "object" ? (reason as any).value : reason;
      filteredData = filteredData.filter((item) =>
        item.primaryReason.toLowerCase().includes(String(reason).toLowerCase())
      );
    }

    // Date range filter
    if (this.filters.fromDate || this.filters.toDate) {
      filteredData = filteredData.filter((item) => {
        const dateStr = item.exceptionDate;
        let itemDate: Date;

        if (dateStr.includes("/")) {
          const [day, month, year] = dateStr.split("/");
          itemDate = new Date(Number(year), Number(month) - 1, Number(day));
        } else {
          itemDate = new Date(dateStr);
        }

        itemDate.setHours(0, 0, 0, 0);

        let matchesFrom = true;
        let matchesTo = true;

        if (this.filters.fromDate) {
          const fromDate = new Date(this.filters.fromDate);
          fromDate.setHours(0, 0, 0, 0);
          matchesFrom = itemDate >= fromDate;
        }

        if (this.filters.toDate) {
          const toDate = new Date(this.filters.toDate);
          toDate.setHours(0, 0, 0, 0);
          matchesTo = itemDate <= toDate;
        }

        return matchesFrom && matchesTo;
      });
    }

    this.exceptionRequests = filteredData;

    setTimeout(() => {
      this.commonService.loading = false;
      const count = this.exceptionRequests.length;
      this.toastr.success(`Found ${count} record${count !== 1 ? "s" : ""}`);
    }, 200);
  }

  resetFilters() {
    this.filters = {
      reportType: "employee",
      employeeName: null,
      status: null,
      fromDate: null,
      toDate: null,
      reason: null,
    };
    
    this.exceptionRequests = [...this.allExceptionRequests];
    this.toastr.info("Filters reset");
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
            `${this.selectedRequests.length} requests ${status.toLowerCase()} successfully`
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
    width: '400px',
    data: { message: 'Are you sure you want to delete this record?' },
  });

  dialogRef.afterClosed().subscribe((confirmed) => {
    if (confirmed) {
      console.log('✅ Delete confirmed for record:', req);
      // Here you can call your API when ready
    } else {
      console.log('❌ Delete canceled');
    }
  });
}

}