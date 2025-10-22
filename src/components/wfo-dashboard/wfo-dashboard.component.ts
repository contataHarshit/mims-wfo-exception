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
    private commonService: CommonService,
    private http: HttpService,
    private constants: ConstantService
  ) {}

  ngOnInit(): void {
    this.commonService.loading = true;
    this.getExceptionRequest();
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
  exceptionRequests: ExceptionRequest[] = [
    {
      employeeId: "R151",
      employeeName: "Ravishankar",
      designation: "Business Analyst",
      projectName: "CyberIQ",
      exceptionDate: "03-09-2025",
      primaryReason: "Health",
      submissionDate: "02-09-2025",
      exceptionRequestedDays: 1,
      exceptionApprovedDays: 1,
      status: "Approved",
      managerRemarks: "Approved on time",
    },
    {
      employeeId: "N1531",
      employeeName: "Nand Kishor",
      designation: "Business Analyst",
      projectName: "CyberIQ",
      exceptionDate: "30-09-2025",
      primaryReason: "Marriage",
      submissionDate: "29-09-2025",
      exceptionRequestedDays: 2,
      exceptionApprovedDays: 1,
      status: "Partial Approved",
      managerRemarks: "Taken many exceptions",
    },
  ];

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
    this.http.getData(this.constants.exceptionRequest).subscribe({
      next: (response: any) => {
        console.log("Exception Request Data Response:", response);

        // Transform the API data to match table structure
        this.exceptionRequests = response.flatMap((req: any) =>
          req.exceptions.map((ex: any) => ({
            employeeId: req.id || "N/A", // If available
            employeeName: `${req.employee?.FirstName || ""} ${
              req.employee?.LastName || ""
            }`.trim(),
            designation: req.employee?.Designation || "N/A", // Optional field
            projectName: req.project?.ProjectName || req.projectName || "N/A",
            exceptionDate: `${ex.fromDate} to ${ex.toDate}`,
            primaryReason: ex.primaryReason,
            submissionDate: req.submissionDate
              ? new Date(req.submissionDate).toLocaleDateString("en-GB")
              : "N/A",
            exceptionRequestedDays: ex.exceptionRequestedDays || "N/A",
            exceptionApprovedDays: ex.exceptionApprovedDays || "N/A",
            status: req.currentStatus || "N/A",
            managerRemarks: req.managerRemarks || "N/A",
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
    const modalRef = this.dialog.open(WfoActionPopupComponent, {
      width: "500px",
      data: request,
    });
    modalRef.componentInstance.data = request;
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
