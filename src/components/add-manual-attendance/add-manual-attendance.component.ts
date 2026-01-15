import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { CommonService } from "../../service/common.service";
import { HttpService } from "../../service/http.service";
import { ConstantService } from "../../service/constant.service";
import { ToastrService } from "ngx-toastr";
import { ButtonModule } from "primeng/button";
import { CommonMailSubmitComponent } from "../../common/common-mail-submit/common-mail-submit.component";

@Component({
  selector: "app-add-manual-attendance",
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, CommonMailSubmitComponent],
  templateUrl: "./add-manual-attendance.component.html",
  styleUrls: ["./add-manual-attendance.component.scss"],
})
export class AddManualAttendanceComponent implements OnInit {
  selectedDate: string = "";
  allEmployees: any[] = [];
  selectedEmployees: any[] = [];
  employeeSearch: string = "";
  maxDate: string = "";
  attendanceType: "FD" | "SF" | "HF" = "FD";

  constructor(
    public commonService: CommonService,
    private http: HttpService,
    private constants: ConstantService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.setTodayDate();
    this.loadEmployees();
  }

  private setTodayDate() {
    const today = new Date();
    const formatted = today.toISOString().split("T")[0];

    this.selectedDate = formatted;
    this.maxDate = formatted;
  }

  private loadEmployees() {
    // Priority: CommonService → LocalStorage fallback
    this.allEmployees =
      this.commonService.allEmployeeData.length > 0
        ? [...this.commonService.allEmployeeData]
        : JSON.parse(localStorage.getItem("allEmployeeData") || "[]");

    // Add checkbox flag
    this.allEmployees = this.allEmployees.map((e) => ({
      ...e,
      checked: false,
    }));
  }

  // ✅ Filter employees in component instead of pipe
  get filteredEmployees(): any[] {
    if (!this.employeeSearch.trim()) {
      return this.allEmployees;
    }

    const search = this.employeeSearch.toLowerCase();
    return this.allEmployees.filter((emp) => {
      const name = (emp.FullName || emp.employeeName || "").toLowerCase();
      const email = (emp.email || emp.Email || "").toLowerCase();
      return name.includes(search) || email.includes(search);
    });
  }

  moveSelected(): void {
    const moved = this.allEmployees.filter((e) => e.checked);

    if (!moved.length) {
      this.toastr.warning("Please select at least one employee");
      return;
    }

    moved.forEach((emp) => {
      emp.checked = false;
      this.selectedEmployees.push(emp);
    });

    this.allEmployees = this.allEmployees.filter((e) => !moved.includes(e));
    this.employeeSearch = ""; // Clear search after moving
  }

  removeEmployee(emp: any): void {
    this.selectedEmployees = this.selectedEmployees.filter((e) => e !== emp);
    this.allEmployees.push({ ...emp, checked: false });
  }

  submit(): void {
    if (!this.selectedEmployees.length) {
      this.toastr.warning("No employees selected");
      return;
    }

    const payload = this.selectedEmployees.map((emp) => ({
      email: emp.EmployeeEmail || emp.email || emp.Email || "",

      dates: [
        {
          date: this.selectedDate,
          value: !this.attendanceType.replaceAll(" ", "").length
            ? null
            : this.attendanceType.replaceAll(" ", ""), // FD | SF | HF
        },
      ],
    }));

    this.commonService.setLoading(true);

    this.http.postData(payload, this.constants.officeAttendance).subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.toastr.success("Attendance added successfully");
          this.reset();
        } else {
          this.toastr.error("Submission failed");
        }
      },
      error: () => this.toastr.error("Submission failed"),
      complete: () => this.commonService.setLoading(false),
    });
  }

  reset(): void {
    this.selectedEmployees = [];
    this.employeeSearch = "";
    this.setTodayDate();
    this.loadEmployees();
  }
}
