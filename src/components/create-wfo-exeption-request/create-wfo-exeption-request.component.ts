import { CommonModule, isPlatformBrowser } from "@angular/common";
import {
  Component,
  OnInit,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { HttpService } from "../../service/http.service";
import { ConstantService } from "../../service/constant.service";
import { CommonService } from "../../service/common.service";

// PrimeNG imports
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import { InputTextareaModule } from "primeng/inputtextarea";
import { CardModule } from "primeng/card";
import { ToastModule } from "primeng/toast";

// Common components
import { DateRangePickerComponent } from "../../common/date-range-picker/date-range-picker.component";
import { CommonSelectComponent } from "../../common/common-select/common-select.component";

@Component({
  selector: "app-create-wfo-exeption-request",
  templateUrl: "./create-wfo-exeption-request.component.html",
  styleUrls: ["./create-wfo-exeption-request.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    CardModule,
    ToastModule,
    DateRangePickerComponent,
    CommonSelectComponent,
  ],
})
export class CreateWfoExeptionRequestComponent implements OnInit {
  formData: any = {
    employeeId: "",
    employeeName: "",
    projectId: 1001,
    projectManager: "",
    exceptions: [
      {
        dateRange: [], // [fromDate, toDate]
        primaryReason: "Health Issue",
        remarks: "",
        exceptionRequestedDays: 0,
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

  disabledDates: Date[] = [];

  // Key to enable same-week restrictions (weekends disabled + same week only)
  enableSameWeekRestriction: boolean = true;

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

    if (
      isPlatformBrowser(this.platformId) &&
      localStorage.getItem("employeeId")
    ) {
      this.loadData();
    }
  }

  loadData() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.formData.employeeId = localStorage.getItem("employeeId") || "N/A";
    this.formData.employeeName = localStorage.getItem("name") || "N/A";
    this.formData.projectId = 1001;
    this.formData.projectManager =
      localStorage.getItem("projectManager") || "N/A";
  }

  addMore() {
    this.formData.exceptions.push({
      dateRange: [],
      primaryReason: "Health Issue",
      remarks: "",
      exceptionRequestedDays: 0,
    });
  }

  deleteIndex(index: number) {
    if (this.formData.exceptions.length > 1) {
      this.formData.exceptions.splice(index, 1);
      this.updateDisabledDates();
    }
  }

  resetForm() {
    this.formData.exceptions = [
      {
        dateRange: [],
        primaryReason: "Health Issue",
        remarks: "",
        exceptionRequestedDays: 0,
      },
    ];
    this.disabledDates = [];
    if (isPlatformBrowser(this.platformId)) this.loadData();
  }

  calculateExceptionDays(e: any): void {
    const range = e.dateRange;
    if (!range || range.length < 2) {
      e.exceptionRequestedDays = 0;
      return;
    }

    const [fromDate, toDate] = range;
    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (end < start) {
      e.exceptionRequestedDays = 0;
      return;
    }

    const getWeekNumber = (d: Date) => {
      const temp = new Date(
        Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
      );
      const dayNum = temp.getUTCDay() || 7;
      temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
      return Math.ceil(
        ((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
      );
    };

    // Step 1: Collect all previously used days by week
    const usedDaysByWeek: Record<string, number> = {};
    this.formData.exceptions.forEach((ex: any) => {
      if (ex === e || !ex.dateRange || ex.dateRange.length < 2) return;
      const [s, en] = ex.dateRange.map((d: Date) => new Date(d));
      let current = new Date(s);
      while (current <= en) {
        const weekKey = `${current.getFullYear()}-${getWeekNumber(current)}`;
        usedDaysByWeek[weekKey] = (usedDaysByWeek[weekKey] || 0) + 1;
        current.setDate(current.getDate() + 1);
      }
    });

    // Step 2: Calculate valid exception days for this new range
    let allowedDays = 0;
    let current = new Date(start);
    while (current <= end) {
      // Skip weekends if restriction is enabled
      if (this.enableSameWeekRestriction) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          current.setDate(current.getDate() + 1);
          continue;
        }
      }

      const weekKey = `${current.getFullYear()}-${getWeekNumber(current)}`;
      if ((usedDaysByWeek[weekKey] || 0) < 2) {
        allowedDays++;
        usedDaysByWeek[weekKey] = (usedDaysByWeek[weekKey] || 0) + 1;
      }
      current.setDate(current.getDate() + 1);
    }

    e.exceptionRequestedDays = allowedDays;
  }

  isOverlapping(currentIndex: number, newRange: Date[]): boolean {
    if (!newRange || newRange.length < 2) return false;
    const [start, end] = newRange.map((d) => new Date(d).getTime());

    return this.formData.exceptions.some((ex: any, idx: number) => {
      if (idx === currentIndex || !ex.dateRange || ex.dateRange.length < 2)
        return false;
      const [s, e] = ex.dateRange.map((d: Date) => new Date(d).getTime());
      return start <= e && end >= s;
    });
  }

  updateDisabledDates() {
    const allDates: Date[] = [];
    this.formData.exceptions.forEach((ex: any) => {
      if (ex.dateRange && ex.dateRange.length === 2) {
        const [start, end] = ex.dateRange;
        let current = new Date(start);
        while (current <= new Date(end)) {
          allDates.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }
      }
    });
    this.disabledDates = allDates;
  }

  validateDays(e: any) {
    if (e.exceptionRequestedDays > 2) {
      e.exceptionRequestedDays = 2;
    } else if (e.exceptionRequestedDays < 1) {
      e.exceptionRequestedDays = 1;
    }
  }

  onDateRangeSelect(range: Date[], index: number): void {
    if (!range || range.length < 2) {
      this.formData.exceptions[index].exceptionRequestedDays = 0;
      return;
    }
    console.log("range------------>", range);

    if (this.isOverlapping(index, range)) {
      alert("Selected date range overlaps with an existing one!");
      this.formData.exceptions[index].dateRange = [];
      this.formData.exceptions[index].exceptionRequestedDays = 0;
      return;
    }

    this.calculateExceptionDays(this.formData.exceptions[index]);
    this.updateDisabledDates();
  }

  onSubmit() {
    console.log("this .form----->", this.formData);

    const payload = {
      ...this.formData,
      exceptions: this.formData.exceptions.map((ex: any) => ({
        ...ex,
        fromDate: ex.dateRange[0] || null,
        toDate: ex.dateRange[1] || null,
        dateRange: undefined,
      })),
    };

    console.log("Submitting form data:", payload);

    this.http.postData(payload, this.constant.exceptionRequest).subscribe({
      next: () => {
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
