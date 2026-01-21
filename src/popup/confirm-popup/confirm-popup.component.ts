import { Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { CommonModule } from "@angular/common";
import { ButtonModule } from "primeng/button";

@Component({
  selector: "app-confirm-popup",
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: "./confirm-popup.component.html",
  styleUrls: ["./confirm-popup.component.scss"],
})
export class ConfirmPopupComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmPopupComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      message?: string;
      title?: string;
      confirmLabel?: string;
      showCancelButton?: boolean;
      managerEmailCount?: number;
    },
  ) {
    if (!this.data.confirmLabel) {
      this.data.confirmLabel = "Yes";
    }
    if (this.data.showCancelButton === undefined) {
      this.data.showCancelButton = true;
    }
    
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
