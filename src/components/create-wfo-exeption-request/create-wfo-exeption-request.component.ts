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
import { MultiSelectModule } from "primeng/multiselect";

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
    MultiSelectModule,
    DateRangePickerComponent,
    CommonSelectComponent,
  ],
})
export class CreateWfoExeptionRequestComponent implements OnInit {
  formData: any = {
    employeeId: "",
    employeeName: "",
    projectName: [], // multi-select
    projectManager: "",
    exceptions: [
      {
        dateRange: [],
        primaryReason: null,
        otherReason: "",
        remarks: "",
        exceptionRequestedDays: 0,
      },
    ],
  };

  disabledDates: Date[] = [];
  projectList: any[] = [];

  reasonList = [
    { label: "Health Issue", value: "Health Issue" },
    { label: "Personal Work", value: "Personal Work" },
    { label: "Travel", value: "Travel" },
    { label: "Other", value: "other" },
  ];

  enableSameWeekRestriction = true;

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
    this.formData.projectManager =
      localStorage.getItem("projectManager") || "N/A";

    const storedProjects = localStorage.getItem("projectName");
    if (storedProjects) {
      const parsed = JSON.parse(storedProjects);
      this.projectList = parsed.map((p: any) => ({
        label: p.name,
        value: p.id,
      }));
    }
  }

  addMore() {
    this.formData.exceptions.push({
      dateRange: [],
      primaryReason: null,
      otherReason: "",
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
    this.formData.projectName = [];
    this.formData.exceptions = [
      {
        dateRange: [],
        primaryReason: null,
        otherReason: "",
        remarks: "",
        exceptionRequestedDays: 0,
      },
    ];
    this.disabledDates = [];
    this.loadData();
  }

  onDateRangeSelect(range: Date[], index: number): void {
    if (!range || range.length < 2) {
      this.formData.exceptions[index].exceptionRequestedDays = 0;
      return;
    }

    if (this.isOverlapping(index, range)) {
      alert("Selected date range overlaps with an existing one!");
      this.formData.exceptions[index].dateRange = [];
      this.formData.exceptions[index].exceptionRequestedDays = 0;
      return;
    }

    this.calculateExceptionDays(this.formData.exceptions[index]);
    this.updateDisabledDates();
  }

  isOverlapping(currentIndex: number, newRange: Date[]): boolean {
    if (!newRange || newRange.length < 2) return false;
    const [start, end] = newRange.map((d) => new Date(d).getTime());

    return this.formData.exceptions.some((ex: any, idx: number) => {
      if (idx === currentIndex || !ex.dateRange || ex.dateRange.length < 2)
        return false;
      const [s, e] = ex.dateRange.map((d: any) => new Date(d).getTime());
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

    let allowedDays = 0;
    let current = new Date(start);
    while (current <= end) {
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

  onPrimaryReasonChange(exception: any) {
    if (exception.primaryReason?.value === "other") {
      exception.showOtherReason = true;
      exception.otherReason = "";
    } else {
      exception.showOtherReason = false;
      exception.otherReason = "";
    }
  }

  confirmOtherReason(exception: any) {
    if (!exception.otherReason?.trim()) return;
    exception.primaryReason = {
      label: exception.otherReason,
      value: exception.otherReason,
    };
    exception.showOtherReason = false;
  }
  validateDays(event: any): void {
    const value = Number(event.target.value);
    if (isNaN(value) || value < 0) {
      event.target.value = 0;
    }
  }

  cancelOtherReason(exception: any) {
    exception.otherReason = "";
    exception.primaryReason = null;
    exception.showOtherReason = false;
  }

  onSubmit() {
    const payload = {
      ...this.formData,
      projectIds: this.formData.projectName, // selected project IDs
      exceptions: this.formData.exceptions.map((ex: any) => ({
        ...ex,
        fromDate: ex.dateRange[0] || null,
        toDate: ex.dateRange[1] || null,
        dateRange: undefined,
        primaryReason:
          ex.primaryReason === "other"
            ? ex.otherReason
            : ex.primaryReason?.value || ex.primaryReason,
      })),
    };

    console.log("SUBMIT PAYLOAD:", payload);

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
