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

    this.resetPreviewState();

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

    if (diff > 35) {
      this.toastr.error("Maximum allowed date range is 35 days.");
      this.form.patchValue({ toDate: null });
      this.dayCount = 0;
      return;
    }

    this.dayCount = diff;
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
    console.log("rows", rows);

    // ---------- ROWS ----------
    this.previewRows = rows.slice(1).map((row) => {
      const fixedValues = row.slice(0, fixedHeaders.length);
      console.log("csvvvvvvvvvv", this.previewRows);

      // Take only required number of day values
      const dayValues = row.slice(
        firstDayIndex,
        firstDayIndex + dateHeaders.length,
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
    const emailIndex = this.previewHeader.findIndex((h) =>
      h.toLowerCase().includes("email"),
    );

    if (emailIndex === -1) {
      this.toastr.error("Email column not found");
      return;
    }

    const fromDate = this.form.get("fromDate")?.value!;
    const startDate = new Date(fromDate);

    const result = this.previewRows
      .map((row) => {
        const email = (row[emailIndex] ?? "").trim();
        if (!email || !email.includes("@")) return null;

        const dates = row
          .slice(this.fixedHeadersCount) // ONLY date columns
          .map((value, i) => {
            if (!value || !value.replaceAll(" ", "").length) return null;

            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);

            return {
              date: date.toISOString().split("T")[0],
              value: value.replaceAll(" ", ""),
            };
          })
          .filter(Boolean);

        if (!dates.length) return null;

        return { email, dates };
      })
      .filter(Boolean);

    this.http.postData(result, this.constants.officeAttendance).subscribe({
      next: (res) => {
        res?.success
          ? this.toastr.success(res?.data?.message || "Attendance submitted")
          : this.toastr.error("Submission failed");
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || "Submission failed");
      },
    });

    console.log("FINAL CLEAN PAYLOAD", result);
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
    const headers = ["NAME", "Manager", "EMAIL", "Day1", "Day2", "Day3"];

    const sampleRow = [
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
}
