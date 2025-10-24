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

interface ExceptionRequest {
  employeeId: string;
  employeeName: string;
  designation: string;
  projectName: string;
  exceptionDate: string;
  primaryReason: string;
  submissionDate: string;
  exceptionRequestedDays: number;
  exceptionApprovedDays: number;
  status: string;
  managerRemarks: string;
  exceptionId: string;
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
    DateRangePickerComponent,
    CommonSelectComponent,
  ],
  templateUrl: "./wfo-dashboard.component.html",
  styleUrls: ["./wfo-dashboard.component.scss"],
})
export class WfoDashboardComponent implements OnInit {
  constructor(
    private dialog: MatDialog,
    public commonService: CommonService,
    private http: HttpService,
    private constants: ConstantService
  ) {}
ngOnInit(): void {
  this.commonService.loading = true;

  const storedData =
    localStorage.getItem("role") === "MANAGER"
      ? localStorage.getItem("managerEmployeeData")
      : localStorage.getItem("allEmployeeData");

  this.employeeList = storedData
    ? JSON.parse(storedData).map((item: any) => ({
        label: `${item.FullName}(${item.EmployeeNumber})`,
        value: item.EmployeeNumber,
      }))
    : [];

  // Fetch initially
  this.getExceptionRequest();

  // Subscribe to view changes
  this.commonService.viewChange$.subscribe(() => {
    this.getExceptionRequest();
  });
}


  // Dropdown data
  projectList = [
    { label: "Project Alpha", value: "Project Alpha" },
    { label: "Project Beta", value: "Project Beta" },
  ];

  employeeList = [
    { label: "Ravishankar (R151)", value: "R151" },
    { label: "Nand Kishor (N1531)", value: "N1531" },
  ];
  employeeIdList = [
    { label: "R151", value: "R151" },
    { label: "N1531", value: "N1531" },
  ];

  daysList = [
    { label: "1", value: 1 },
    { label: "2", value: 2 },
    { label: "3", value: 3 },
  ];

  statusList = [
    { label: "Approved", value: "Approved" },
    { label: "Partial Approved", value: "Partial Approved" },
    { label: "Rejected", value: "Rejected" },
  ];

  // Exception Request Data
  exceptionRequests: ExceptionRequest[] = [];

  filters = {
    employeeId: null,
    employeeName: null,
    projectName: null,
    exceptionRequestedDays: null,
    exceptionApprovedDays: null,
    status: null,
    dateRange: null as Date[] | null,
  };
  getExceptionRequest() {
    this.commonService.loading = true;
    const url =
  this.constants.exceptionRequest +
  (this.commonService.currentView === "self" ? "?isSelf=true" : "");

this.http.getData(url).subscribe({
  next: (response: any) => {
    console.log("Exception Request Data Response:", response);

    if (!response?.data?.data) {
      this.exceptionRequests = [];
      this.commonService.loading = false;
      return;
    }

    // Transform API data to table structure
    this.exceptionRequests = response.data.data.flatMap((req: any) =>
      req.exceptions.map((ex: any) => ({
        employeeId: req.id || "N/A",
        employeeName: `${req.employee?.FirstName || ""} ${req.employee?.LastName || ""}`.trim(),
        designation: req.employee?.Designation || "N/A",
        projectName: req.project?.ProjectName || req.projectName || "N/A",
        exceptionDate: `${ex.fromDate} to ${ex.toDate}`,
        primaryReason: ex.primaryReason,
        submissionDate: req.submissionDate
          ? new Date(req.submissionDate).toLocaleDateString("en-GB")
          : "N/A",
        exceptionRequestedDays: ex.exceptionRequestedDays || "N/A",
        exceptionApprovedDays: ex.exceptionApprovedDays || "N/A",
        status: ex.currentStatus || "N/A",
        managerRemarks: req.managerRemarks || "N/A",
        exceptionId: ex.id,
      }))
    );

    this.commonService.loading = false;
    console.log("Transformed Table Data:", this.exceptionRequests);
  },
  error: (err: any) => {
    this.commonService.loading = false;
    console.error("Exception Request API Error:", err);
  },
});

  }

  onDateRangeChange(range: Date[] | null) {
    if (range && range.length === 2) {
      console.log("Selected Range:", range);
    }
  }

  openActionDialog(request: ExceptionRequest) {
    console.log("ewwwww", request);

    const modalRef = this.dialog.open(WfoActionPopupComponent, {
      width: "500px",
      data: request,
    });

    modalRef.afterClosed().subscribe((result) => {
      if (result) {
        // Map action to backend status
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

        // Build the payload
        const payload = {
          updateDateRangeId: request.exceptionId, // replace if needed
          currentStatus: currentStatus,
          managerRemarks: result.remarks,
          exceptionApprovedDays:
            result.approvedDays || request.exceptionApprovedDays || 1,
        };

        console.log("PUT Payload:", payload);

        // Call PUT API
        this.http
          .putData(request.employeeId, payload, this.constants.exceptionRequest)
          .subscribe({
            next: (res: any) => {
              console.log("PUT API Success:", res);
              this.getExceptionRequest(); // refresh list after update
            },
            error: (err: any) => {
              console.error("PUT API Error:", err);
            },
          });
      }
    });
  }

  export() {
    console.log("Exporting to Excel...");
  }

  resetFilters() {
    this.filters = {
      employeeId: null,
      employeeName: null,
      projectName: null,
      exceptionRequestedDays: null,
      exceptionApprovedDays: null,
      status: null,
      dateRange: null,
    };
  }
}
