import { Component, Input } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-wfo-action-popup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatRadioModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './wfo-action-popup.component.html',
  styleUrls: ['./wfo-action-popup.component.scss']
})
export class WfoActionPopupComponent {
  @Input() data: any; // Contains the selected request

  selectedAction: string = '';
  managerRemarks: string = '';

  constructor(private dialogRef: MatDialogRef<WfoActionPopupComponent>) {}

  onSubmit() {
    if (!this.selectedAction) return;

    const result = {
      action: this.selectedAction,
      remarks: this.managerRemarks
    };

    this.dialogRef.close(result);
  }

  onCancel() {
    this.dialogRef.close();
  }

  get request() {
    return this.data;
  }
}
