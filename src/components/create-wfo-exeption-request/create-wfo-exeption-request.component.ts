import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-create-wfo-exeption-request',
  templateUrl: './create-wfo-exeption-request.component.html',
  styleUrls: ['./create-wfo-exeption-request.component.scss'],
  imports: [CommonModule,FormsModule],
  standalone: true
})
export class CreateWfoExeptionRequestComponent {
  formData = {
    employeeId: 'EMP123',
    employeeName: 'Harshit Shrivastava',
    projectName: '',
    projectManager: 'John Doe',
    exceptions: [
      {
        fromDate: '',
        toDate: '',
        primaryReason: '',
        remarks: '',
      },
    ],
  };

  addMore() {
    this.formData.exceptions.push({
      fromDate: '',
      toDate: '',
      primaryReason: '',
      remarks: '',
    });
  }

  deleteIndex(index: number) {
    if (this.formData.exceptions.length > 1) {
      this.formData.exceptions.splice(index, 1);
    }
  }

  resetForm() {
    this.formData = {
      employeeId: 'EMP123',
      employeeName: 'Harshit Shrivastava',
      projectName: '',
      projectManager: 'John Doe',
      exceptions: [
        {
          fromDate: '',
          toDate: '',
          primaryReason: '',
          remarks: '',
        },
      ],
    };
  }

  onSubmit() {
    console.log('Submitted Data:', this.formData);
    alert('Form submitted! Check console for data.');
  }

  calculateDays(fromDate: string, toDate: string): string {
    if (!fromDate || !toDate) return '';
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diff = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? `${diff + 1} day(s)` : 'Invalid range';
  }
}
