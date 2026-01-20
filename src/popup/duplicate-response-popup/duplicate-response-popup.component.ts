import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-duplicate-response-popup',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './duplicate-response-popup.component.html',
  styleUrls: ['./duplicate-response-popup.component.scss'],
})
export class DuplicateResponsePopupComponent {
  duplicateEmails: string[] = [];
  message = '';

  constructor(
    private dialogRef: MatDialogRef<DuplicateResponsePopupComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { duplicateEmails: string[]; message: string }
  ) {
    this.duplicateEmails = data?.duplicateEmails || [];
    this.message = data?.message || '';
  }

  close(): void {
    this.dialogRef.close();
  }
}
