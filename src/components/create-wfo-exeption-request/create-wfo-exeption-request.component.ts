import { CommonModule } from "@angular/common";
import { Component, DoCheck, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommonService } from "../../service/common.service";
import { HttpService } from "../../service/http.service";
import { ConstantService } from "../../service/constant.service";
@Component({
  selector: "app-create-wfo-exeption-request",
  templateUrl: "./create-wfo-exeption-request.component.html",
  styleUrls: ["./create-wfo-exeption-request.component.scss"],
  imports: [CommonModule, FormsModule],
  standalone: true,
})
export class CreateWfoExeptionRequestComponent implements OnInit,DoCheck {
  formData: any = {};
  constructor(
    public common: CommonService,
    private http: HttpService,
    private constants: ConstantService
  ) {}
  ngDoCheck(): void {
    this.initializeForm()
  }
  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm() {
    this.formData = {
      employeeId: this.common.employeeId || "N/A",
      employeeName: this.common.employeeName || "N/A",
      projectName: this.common.projectName || "N/A",
      projectManager: this.common.projectManager || "N/A",
      exceptions: [
        {
          fromDate: "",
          toDate: "",
          primaryReason: "",
          remarks: "",
        },
      ],
    };
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
    if (this.formData.exceptions.length > 1) {
      this.formData.exceptions.splice(index, 1);
    }
  }

  resetForm() {
    this.initializeForm();
  }

  onSubmit() {
    console.log("Submitting form data:", this.formData);
    
    this.http
      .postData(this.formData, this.constants.exceptionRequest)
      .subscribe({
        next: (response) => {
          console.log("Form submitted successfully:", response);
          alert("Form submitted successfully!");
          this.resetForm();
        },
        error: (error) => {
          console.error("Error submitting form:", error);
          alert("Error submitting form. Please try again.");
        },
      });
  }

  calculateDays(fromDate: string, toDate: string): string {
    if (!fromDate || !toDate) return "";
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diff = Math.floor(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff >= 0 ? `${diff + 1} day(s)` : "Invalid range";
  }
}
