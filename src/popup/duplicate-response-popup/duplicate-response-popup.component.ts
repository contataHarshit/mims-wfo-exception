import { Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { CommonModule } from "@angular/common";
import { ButtonModule } from "primeng/button";
@Component({
  selector: "app-duplicate-response-popup",
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: "./duplicate-response-popup.component.html",
  styleUrls: ["./duplicate-response-popup.component.scss"],
})
export class DuplicateResponsePopupComponent {
  totalRecords = 0;
  savedRecords = 0;
  totalRows = 0;
  invalidValues: { email: string; value: string }[] = [];
  errors: string[] = [];
  duplicateEmails: { email: string; employeeWithSameEmail?: number, duplicatesEmailInCsv?: number }[] = [];

  constructor(
    private dialogRef: MatDialogRef<DuplicateResponsePopupComponent>,
    @Inject(MAT_DIALOG_DATA) data: any,
  ) {
    this.totalRecords = data?.totalRecords ?? 0;
    this.savedRecords = data?.savedRecords ?? 0;
    this.totalRows = data?.totalRows ?? 0;
    this.invalidValues = data?.invalidValues ?? [];
    this.errors = data?.errors ?? [];
    this.duplicateEmails = data?.duplicateEmails ?? [];
  }

  close(): void {
    this.dialogRef.close();
  }
}
