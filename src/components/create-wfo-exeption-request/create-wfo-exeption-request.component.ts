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
import { TooltipModule } from "primeng/tooltip";
import { MessageService } from "primeng/api";

// Common components
import { DateRangePickerComponent } from "../../common/date-range-picker/date-range-picker.component";
import { CommonSelectComponent } from "../../common/common-select/common-select.component";
import { ToastrService } from "ngx-toastr";
import { addDays, endOfMonth } from "date-fns";
import { finalize } from "rxjs/operators";

// ✅ Define proper interfaces
interface ExceptionEntry {
  dateRange: Date[];
  exceptionRequestedDays: string;
  primaryReason: any;
  remarks: string;
  showOtherReason?: boolean;
  otherReason?: string;
}

interface FormData {
  employeeId: string;
  employeeName: string;
  projectName: string[];
  projectManager: string;
  exceptions: ExceptionEntry[];
}

@Component({
  selector: "app-create-wfo-exeption-request",
  templateUrl: "./create-wfo-exeption-request.component.html",
  styleUrls: ["./create-wfo-exeption-request.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    TooltipModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    CardModule,
    ToastModule,
    MultiSelectModule,
    DateRangePickerComponent,
    CommonSelectComponent,
  ],
  providers: [MessageService],
})
export class CreateWfoExeptionRequestComponent implements OnInit {
  formData: FormData = {
    employeeId: "",
    employeeName: "",
    projectName: [],
    projectManager: "",
    exceptions: [
      {
        dateRange: [],
        exceptionRequestedDays: "",
        primaryReason: null,
        remarks: "",
        showOtherReason: false,
        otherReason: "",
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
  maxSelectableDate: any;
  minSelectableDate: any;
  selectedView: string | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private http: HttpService,
    private constant: ConstantService,
    private commonService: CommonService,
    private messageService: MessageService,
    private toastr: ToastrService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.commonService.loading = true;

    // Subscribe to BehaviorSubjects
    this.commonService.employeeId$.subscribe((id) => {
      this.formData.employeeId = id;
    });

    this.commonService.employeeName$.subscribe((name) => {
      this.formData.employeeName = name;
    });

    this.commonService.projectManager$.subscribe((manager) => {
      this.formData.projectManager = manager;
    });

    this.commonService.projectName$.subscribe((project) => {
      if (project) this.formData.projectName = [project];
    });

    // Get allowed date range
    const { minDate, maxDate } = this.getAllowedDateRange();
    this.selectedView = localStorage.getItem("selectedView");

    this.minSelectableDate = minDate;
    this.maxSelectableDate = maxDate;

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    this.http
      .getData(`${this.constant.selectedDates}?month=${month}&year=${year}`)
      .pipe(
        finalize(() => {
          this.commonService.loading = false;
        })
      )
      .subscribe({
        next: (res: any) => {
          if (res?.success && res.data?.dates) {
            const dates = res.data.dates;
            this.disabledDates = dates.map((dateStr: string) => {
              const date = new Date(dateStr);
              date.setHours(0, 0, 0, 0);
              return date;
            });
          } else {
            this.toastr.warning("No disabled dates found for this month.");
          }
        },
        error: (err) => {
          console.error("Error fetching selected dates:", err);
          this.toastr.error("Failed to load disabled dates.");
        },
      });
  }

  // Triggered when primary reason dropdown changes
// Triggered when primary reason dropdown changes
onPrimaryReasonChange(exception: ExceptionEntry, value: any) {
  console.log("Primary reason emitted value:", value);

  if (value.value === "other" || value.value === "Other") {
    // Show custom input and clear the value SYNCHRONOUSLY
    exception.showOtherReason = true;
    exception.otherReason = "";
    exception.primaryReason = null; // This should trigger writeValue in child
    console.log("lllllllllll");
    
    // ✅ Force immediate update
    setTimeout(() => {
      exception.primaryReason = null;
      this.cdr.detectChanges();
    }, 0);
  } else {
    exception.primaryReason = value;
    exception.showOtherReason = false;
    exception.otherReason = "";
    this.cdr.detectChanges();
  }
}
// Confirm typed "other" reason (tick icon)
confirmOtherReason(exception: ExceptionEntry) {
  const entered = exception.otherReason?.trim();
  if (!entered) {
    this.toastr.warning("Please enter a reason.");
    return;
  }

  // If this custom reason isn't already in reasonList, add it
  const exists = this.reasonList.some(r => (r.value ?? r) === entered);
  if (!exists) {
    this.reasonList.push({ label: entered, value: entered });
  }

  // Select the new custom reason immediately
  exception.primaryReason = entered;
  exception.showOtherReason = false;
  exception.otherReason = "";
  this.toastr.success("Custom reason saved!");
  this.cdr.detectChanges();
}

// Cancel typing "other" reason (X icon)
cancelOtherReason(exception: ExceptionEntry) {
  exception.otherReason = "";
  exception.primaryReason = null;
  exception.showOtherReason = false;
  this.cdr.detectChanges();
}


  addMore() {
    for (let i = 0; i < this.formData.exceptions.length; i++) {
      if (this.formData.exceptions[i].dateRange.length == 0 || !this.formData.exceptions[i].primaryReason || !this.formData.exceptions[i].remarks) {
        this.toastr.warning(
          "Please fill the existing empty row before adding a new one."
        );
        return;
      }
    }
    this.formData.exceptions.push({
      dateRange: [],
      exceptionRequestedDays: "",
      primaryReason: null,
      remarks: "",
      showOtherReason: false,
      otherReason: "",
    });
    this.cdr.detectChanges();
  }

  deleteIndex(i: number) {
    this.formData.exceptions.splice(i, 1);

    if (this.formData.exceptions.length === 0) {
      this.formData.exceptions.push({
        dateRange: [],
        exceptionRequestedDays: "",
        primaryReason: null,
        remarks: "",
        showOtherReason: false,
        otherReason: "",
      });
    }

    this.updateDisabledDates();
    this.cdr.detectChanges();
  }

  resetForm(showToast = true) {
    this.formData.exceptions = [
      {
        dateRange: [],
        exceptionRequestedDays: "",
        primaryReason: null,
        remarks: "",
        showOtherReason: false,
        otherReason: "",
      },
    ];
    this.disabledDates = [];
    this.cdr.detectChanges();
    if (showToast) this.toastr.info("Form Reset Successfully");
  }

onMultiDateConfirm(selectedDates: Date[], rowIndex: number) {
  if (!selectedDates || selectedDates.length === 0) return;

  // Sort selected dates in ascending order
  const sortedDates = selectedDates.sort((a, b) => a.getTime() - b.getTime());

  // Reference of the source row (the one from which user selected multiple dates)
  const sourceRow = this.formData.exceptions[rowIndex];

  // Update the current row with the first date
  this.formData.exceptions[rowIndex] = {
    ...sourceRow,
    dateRange: [sortedDates[0]],
  };

  // If remarks/primaryReason are pre-filled in the current row, replicate them
  const filledRemarks = sourceRow.remarks?.trim() || "";
  const filledReason = sourceRow.primaryReason ? { ...sourceRow.primaryReason } : null;

  // Insert additional rows for remaining selected dates
  for (let i = 1; i < sortedDates.length; i++) {
    const newRow: ExceptionEntry = {
      dateRange: [sortedDates[i]],
      exceptionRequestedDays: "",
      primaryReason: filledReason ? { ...filledReason } : null,
      remarks: filledRemarks,
      showOtherReason: false,
      otherReason: "",
    };

    this.formData.exceptions.splice(rowIndex + i, 0, newRow);
  }

  // Update disabled dates and refresh UI
  this.updateDisabledDates();
  this.cdr.detectChanges();

  console.log("✅ Rows after multi-date selection:", this.formData.exceptions);
}


  updateDisabledDates() {
    const allDates: Date[] = [];
    this.formData.exceptions.forEach((ex) => {
      if (ex.dateRange?.length > 0) {
        ex.dateRange.forEach((date) => {
          const normalized = new Date(date);
          normalized.setHours(0, 0, 0, 0);
          allDates.push(normalized);
        });
      }
    });
    this.disabledDates = allDates;
  }

validateForm(): boolean {
  for (const [i, ex] of this.formData.exceptions.entries()) {
    console.log("xxxxxxxxxxx",ex);
    
    if (!ex.dateRange?.length) {
      this.toastr.warning(`Please select a date for row ${i + 1}.`);
      return false;
    }

    if (!ex.primaryReason) {
      this.toastr.warning(`Please select a reason for row ${i + 1}.`);
      return false;
    }

    if (!ex.remarks || !ex.remarks.trim()) {
      console.log("11111111");
      
      this.toastr.warning(`Please enter remarks for row ${i + 1}.`);
      return false;
    }

    const dateStr = ex.dateRange[0].toISOString().split("T")[0];
    const duplicateCount = this.formData.exceptions.filter(
      (e) =>
        e.dateRange.length > 0 &&
        e.dateRange[0].toISOString().split("T")[0] === dateStr
    ).length;

    if (duplicateCount > 1) {
      this.toastr.warning(`Duplicate date found in row ${i + 1}: ${dateStr}`);
      return false;
    }
  }
  return true;
}


onSubmit() {
  this.commonService.loading=true
  if (!this.validateForm()){
    this.commonService.loading=false
    return;
  }

  const payload = {
    exceptions: this.formData.exceptions
      .filter((ex) => ex.dateRange && ex.dateRange.length > 0)
      .map((ex) => ({
        selectedDate: ex.dateRange[0].toISOString().split("T")[0],
        primaryReason:
          typeof ex.primaryReason === "object"
            ? ex.primaryReason?.value || ex.primaryReason?.label || ""
            : ex.primaryReason || "",
        remarks: ex.remarks?.trim() || "",
      })),
  };

  console.log("Final Payload:", payload);

  this.http
    .postData(payload, this.constant.exceptionRequest)
    .pipe(
      finalize(() => {
        // ensure loading is turned off regardless of success/error
        this.commonService.loading = false;
      })
    )
    .subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.toastr.success("Form submitted successfully!");
          this.resetForm(false);
        } else {
          this.toastr.error("Submission failed. Please try again.");
        }
      },
      error: (err) => {
        console.error("Submission Error:", err);
        this.toastr.error("An error occurred during submission.");
      },
    });
}

  getProjectNamesTooltip(): string {
    if (!this.formData.projectName?.length) return "No projects selected";
    const selectedProjects = this.projectList
      .filter((p) => this.formData.projectName.includes(p.value))
      .map((p) => p.label);
    return selectedProjects.join(", ");
  }

  getAllowedDateRange(): { minDate: Date; maxDate: Date } {
    const today = new Date();
    const minDate = addDays(today, -7);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    const maxDate = endOfMonth(nextMonth);
    return { minDate, maxDate };
  }
  
}