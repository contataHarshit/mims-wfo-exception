import { CommonModule, isPlatformBrowser } from "@angular/common";
import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { HttpService } from "../../service/http.service";
import { ConstantService } from "../../service/constant.service";
import { CommonService } from "../../service/common.service";

// PrimeNG imports
import { DropdownModule } from "primeng/dropdown";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import { CalendarModule } from "primeng/calendar";
import { InputTextareaModule } from "primeng/inputtextarea";
import { CardModule } from "primeng/card";
import { ToastModule } from "primeng/toast";

@Component({
  selector: "app-create-wfo-exeption-request",
  templateUrl: "./create-wfo-exeption-request.component.html",
  styleUrls: ["./create-wfo-exeption-request.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    CalendarModule,
    InputTextareaModule,
    CardModule,
    ToastModule,
  ],
})
export class CreateWfoExeptionRequestComponent implements OnInit {
  formData: any = {
    employeeId: "",
    employeeName: "",
    projectId: "101",
    projectManager: "",
    exceptions: [
      {
        fromDate: "",
        toDate: "",
        primaryReason: "",
        remarks: "",
      },
    ],
  };

  projectList = [
    { label: "Project A", value: "Project A" },
    { label: "Project B", value: "Project B" },
  ];

  reasonList = [
    { label: "Health Issue", value: "Health Issue" },
    { label: "Personal Work", value: "Personal Work" },
    { label: "Travel", value: "Travel" },
  ];

  constructor(
    private cdr: ChangeDetectorRef,
    private http: HttpService,
    private constant: ConstantService,
    private commonService: CommonService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.commonService.userDataLoaded$.subscribe(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.loadData();
        this.cdr.detectChanges();
      }
    });

    if (isPlatformBrowser(this.platformId) && localStorage.getItem("employeeId")) {
      this.loadData();
    }
  }

  loadData() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.formData.employeeId = localStorage.getItem("employeeId") || "N/A";
    this.formData.employeeName = localStorage.getItem("name") || "N/A";
    this.formData.projectId = "101";
    this.formData.projectManager = localStorage.getItem("projectManager") || "N/A";
  }

  addMore() {
    this.formData.exceptions.push({
      fromDate: "",
      toDate: "",
      primaryReason: "",
      remarks: "",
    });
  }

  deleteIndex(index: number) {
    if (this.formData.exceptions.length > 1)
      this.formData.exceptions.splice(index, 1);
  }

  resetForm() {
    if (isPlatformBrowser(this.platformId)) this.loadData();
  }

  calculateDays(fromDate: Date, toDate: Date): string {
    if (!fromDate || !toDate) return "";
    const diff = Math.floor(
      (new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff >= 0 ? `${diff + 1} day(s)` : "Invalid range";
  }

  onSubmit() {
    console.log("Submitting form data:", this.formData);
    this.http.postData(this.formData, this.constant.exceptionRequest).subscribe({
      next: (response) => {
        alert("Form submitted successfully!");
        this.resetForm();
      },
      error: (error) => {
        console.error("Error submitting form:", error);
        alert("Error submitting form. Please try again.");
      },
    });
  }
}
