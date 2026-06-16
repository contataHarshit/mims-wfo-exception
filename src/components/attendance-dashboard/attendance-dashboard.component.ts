import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormsModule,
} from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { CommonService } from "../../service/common.service";
import { AttendanceViewComponent } from "../attendance-view/attendance-view.component";
// import { ViewEncapsulation } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ConfirmPopupComponent } from "../../popup/confirm-popup/confirm-popup.component";
import { HttpService } from "../../service/http.service";
import { ConstantService } from "../../service/constant.service";
import { ToastrService } from "ngx-toastr";
import { AddManualAttendanceComponent } from "../add-manual-attendance/add-manual-attendance.component";
import { CommonMailSubmitComponent } from "../../common/common-mail-submit/common-mail-submit.component";
import { DuplicateResponsePopupComponent } from "../../popup/duplicate-response-popup/duplicate-response-popup.component";
import { Environment } from "../../environments/environment";
@Component({
  selector: "app-attendance-dashboard",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    AttendanceViewComponent,
    AddManualAttendanceComponent,
    CommonMailSubmitComponent,
    DuplicateResponsePopupComponent,
    // ToastrService
  ],
  templateUrl: "./attendance-dashboard.component.html",
  styleUrls: ["./attendance-dashboard.component.scss", "../../styles.scss"],
})
export class CsvUploadComponent {
  dayCount = 0;
  uploadedFileName = "";
  rawCsvText = "";
  showRawPreview = false;

  previewHeader: string[] = [];
  previewRows: string[][] = [];
  convertedJson: any[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  editedCells = new Set<string>();
  fixedHeadersCount = 0;
  form = this.fb.group({
    fromDate: ["", Validators.required],
    toDate: ["", Validators.required],
    file: [null as File | null, Validators.required],
  });

  constructor(
    private fb: FormBuilder,
    public commonService: CommonService,
    private dialog: MatDialog,
    private http: HttpService,
    private constants: ConstantService,
    private toastr: ToastrService,
  ) {
    this.commonService.attendanceView = "add";
  }

  get paginatedRows(): string[][] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.previewRows.slice(start, end);
  }

  get rawCsvRows(): string[][] {
    if (!this.rawCsvText) return [];
    return this.rawCsvText
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => r.split(","));
  }

  onDateChange(): void {
    const fromDate = this.form.get("fromDate")?.value;
    const toDate = this.form.get("toDate")?.value;

    // this.resetPreviewState();

    if (!fromDate || !toDate) {
      this.dayCount = 0;
      return;
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (start > end) {
      this.dayCount = 0;
      return;
    }

    const diff =
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (diff > Environment.attendanceVariable) {
      this.toastr.error(`Maximum allowed date range is ${Environment.attendanceVariable} days.`);
      this.form.patchValue({ toDate: null });
      this.dayCount = 0;
      return;
    }

    this.dayCount = diff;
    if (fromDate && toDate && this.rawCsvText) {
      this.processCsv(this.rawCsvText);
    }
  }
  private resetPreviewState(): void {
    this.previewHeader = [];
    this.previewRows = [];
    this.convertedJson = [];
    this.uploadedFileName = "";
    this.rawCsvText = "";
    this.showRawPreview = false;
    this.currentPage = 1;
    this.form.patchValue({ file: null });
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById(
      "csvFileInput",
    ) as HTMLInputElement;

    if (!fileInput) return;

    // 🔥 IMPORTANT: reset value BEFORE opening
    fileInput.value = "";

    fileInput.click();
  }

  onFileUpload(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.uploadedFileName = file.name;
    this.form.patchValue({ file });

    const reader = new FileReader();
    reader.onload = () => {
      this.rawCsvText = reader.result as string;
      this.processCsv(this.rawCsvText);
    };
    reader.readAsText(file);
  }

  removeFile(): void {
    this.uploadedFileName = "";
    this.rawCsvText = "";
    this.previewHeader = [];
    this.previewRows = [];
    this.convertedJson = [];
    this.showRawPreview = false;
    this.currentPage = 1;
    this.form.patchValue({ file: null });

    const fileInput = document.getElementById(
      "csvFileInput",
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  }

  togglePreview(): void {
    this.showRawPreview = !this.showRawPreview;
  }
  private processCsv(csvText: string): void {
    const rows = csvText
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => r.split(",").map((c) => c.trim()));

    if (!rows.length) return;

    const header = rows[0];

    // 🔍 Find first Day column (Day1)
    const firstDayIndex = header.findIndex((h) => /^day\d+$/i.test(h));

    if (firstDayIndex === -1) {
      this.toastr.error("No Day columns found in CSV");
      return;
    }

    // 🧱 Non-day (fixed) columns
    const fixedHeaders = header.slice(0, firstDayIndex);
    this.fixedHeadersCount = fixedHeaders.length;

    // 📅 Generate actual date headers (filtered range)
    const dateHeaders = this.getDateRange(
      this.form.get("fromDate")?.value!,
      this.form.get("toDate")?.value!,
    );

    // ✅ FINAL HEADER (NO Day1, Day2)
    this.previewHeader = [...fixedHeaders, ...dateHeaders];
    // ---------- ROWS ----------
    this.previewRows = rows.slice(1).map((row) => {
      const fixedValues = row.slice(0, fixedHeaders.length);

      const dayValues = Array.from(
        { length: dateHeaders.length },
        (_, i) => row[firstDayIndex + i] ?? null,
      );

      return [...fixedValues, ...dayValues];
    });

    this.totalPages = Math.ceil(this.previewRows.length / this.pageSize);
    this.currentPage = 1;

    // ---------- CONVERTED JSON ----------
    this.convertedJson = this.previewRows.map((row) => {
      const obj: any = {};
      this.previewHeader.forEach((key, index) => {
        obj[key] = row[index] ?? null;
      });
      return obj;
    });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onPageSizeChange(): void {
    this.totalPages = Math.ceil(this.previewRows.length / this.pageSize);
    this.currentPage = 1;
  }

  submit(): void {
    this.commonService.setLoading(true);
    const invalids = this.validateCellLength();

    if (invalids.length) {
      this.commonService.setLoading(false);
      this.dialog.open(DuplicateResponsePopupComponent, {
        width: "620px",
        disableClose: true,
        data: {
          totalRecords: this.previewRows.length,
          savedRecords: 0,
          invalidValues: invalids,
        },
      });
      return;
    }

    const employeeNumberIndex = this.previewHeader.findIndex((h) =>
      h.toLowerCase().includes("employee no"),
    );

    if (employeeNumberIndex === -1) {
      this.toastr.error("Employee No column not found");
      this.commonService.setLoading(false);
      return;
    }

    const fromDate = this.form.get("fromDate")?.value!;
    const startDate = new Date(fromDate);

    const result = this.previewRows
      .map((row) => {
        const employeeNumber = (row[employeeNumberIndex] ?? "").trim();
        if (!employeeNumber) return null;

        const dates = row
          .slice(this.fixedHeadersCount)
          .map((value, i) => {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);

            return {
              date: date.toISOString().split("T")[0],
              value:
                value && value.toString().trim().length
                  ? value.toString().trim()
                  : null,
            };
          })

          .filter(Boolean);

        return { employeeNumber, dates };
      })
      .filter(Boolean);

    this.http
      .postData(result, this.constants.officeAttendance + "/employee-number")
      .subscribe({
        next: (res) => {
          res?.success && !res?.data?.errors?.length
            ? this.toastr.success(res?.data?.message || "Attendance submitted")
            : res?.data?.errors?.length
              ? this.toastr.error(
                  res?.data?.message || "Submission completed with errors",
                )
              : this.toastr.error("Submission failed");
          this.commonService.setLoading(false);
          if (
            res?.data?.errors?.length
          ) {
            this.dialog.open(DuplicateResponsePopupComponent, {
              width: "900px",
              disableClose: true,
              data: {
                totalRecords: res.data.totalRecords,
                savedRecords: res.data.affectedRows,
                totalRows: res.data.totalRows,
                errors: res.data.errors,
                duplicateEmployeeNumbers: res.data.duplicateEmployeeNumbers,
              },
            });
          }
        },
        error: (err) => {
          this.commonService.setLoading(false);
          this.toastr.error(err?.error?.message || "Submission failed");
        },
      });
  }

  private toIsoDate(ddmmyyyy: string): string {
    const [dd, mm, yyyy] = ddmmyyyy.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }

  private getDateRange(from: string, to: string): string[] {
    const dates: string[] = [];
    const start = new Date(from);
    const end = new Date(to);
    const current = new Date(start);

    while (current <= end) {
      dates.push(this.formatDate(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  private formatDate(date: Date): string {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  reset(): void {
    this.form.reset();
    this.dayCount = 0;
    this.previewHeader = [];
    this.previewRows = [];
    this.convertedJson = [];
    this.uploadedFileName = "";
    this.rawCsvText = "";
    this.showRawPreview = false;
    this.currentPage = 1;
  }
  markCellEdited(rowIndex: number, colIndex: number): void {
    this.editedCells.add(`${rowIndex}-${colIndex}`);
  }

  isCellEdited(rowIndex: number, colIndex: number): boolean {
    return this.editedCells.has(`${rowIndex}-${colIndex}`);
  }
  deleteRow(index: number): void {
    const dialogRef = this.dialog.open(ConfirmPopupComponent, {
      width: "400px",
      data: {
        title: "Delete Row",
        message:
          "Are you sure you want to delete this row from the formatted CSV?",
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      // ✅ Delete row
      this.previewRows.splice(index, 1);
      this.convertedJson.splice(index, 1);

      // ✅ Reset edited state (row indices shift)
      this.editedCells.clear();

      // ✅ Pagination safety
      this.totalPages = Math.ceil(this.previewRows.length / this.pageSize);
      if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages || 1;
      }
      if (!this.previewRows.length) {
        this.reset();
      }
    });
  }
  storeOriginalValue(event: Event): void {
    const input = event.target as HTMLInputElement;

    // store once per focus
    if (!input.dataset["original"]) {
      input.dataset["original"] = (input.value ?? "").trim();
    }
  }

  onCellChange(rowIndex: number, colIndex: number, newValue: string): void {
    const key = `${rowIndex}-${colIndex}`;
    const input = document.activeElement as HTMLInputElement;

    const originalValue = (input?.dataset["original"] ?? "").trim();
    const currentValue = (newValue ?? "").trim();

    if (currentValue !== originalValue) {
      this.editedCells.add(key);
    } else {
      this.editedCells.delete(key);
    }
  }
  downloadCsvFormat(): void {
    // ---------- FIXED HEADERS ----------
    const headers = [
      "EMPLOYEE NO",
      "NAME",
      "Manager",
      "EMAIL",
      "Day1",
      "Day2",
      "Day3",
    ];

    const sampleRow = [
      "Employee_Number",
      "Employee_Name",
      "Manager_Name",

      "Employee_Email",
      "FD",
      "FD",
      "FD",
    ];

    // ---------- BUILD CSV ----------
    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");

    // ---------- DOWNLOAD ----------
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "attendance_csv_format.csv";
    link.click();

    URL.revokeObjectURL(url);
  }
  private isDayColumn(header: string): boolean {
    return /^day\d+$/i.test(header.trim());
  }

  private extractDayNumber(header: string): number {
    return Number(header.replace(/[^0-9]/g, ""));
  }
  private validateCellLength(): { employeeNumber: string; value: string }[] {
    const employeeNumberIndex = this.previewHeader.findIndex((h) =>
      h.toLowerCase().includes("employee no"),
    );

    if (employeeNumberIndex === -1) return [];

    const invalids: { employeeNumber: string; value: string }[] = [];

    this.previewRows.forEach((row) => {
      const employeeNumber = row[employeeNumberIndex];
      row.slice(this.fixedHeadersCount).forEach((val) => {
        if (val && val.toString().trim().length > 3) {
          invalids.push({ employeeNumber: employeeNumber, value: val });
        }
      });
    });

    return invalids;
  }
}
