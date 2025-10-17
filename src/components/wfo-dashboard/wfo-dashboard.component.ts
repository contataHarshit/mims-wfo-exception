import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { WfoActionPopupComponent } from '../../popup/wfo-action-popup/wfo-action-popup.component';
import { CommonService } from '../../service/common.service';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';
import { InputTextareaModule } from 'primeng/inputtextarea';

interface ExceptionRequest {
  employeeId: string;
  employeeName: string;
  designation: string;
  projectName: string;
  exceptionDate: string;
  primaryReason: string;
  submissionDate: string;
  exceptionRequestedDays: number;
  exceptionApprovedDays: number;
  status: string;
  managerRemarks: string;
}

@Component({
  selector: 'app-wfo-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    CardModule,
    DropdownModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    CalendarModule,
    InputTextareaModule
  ],
  templateUrl: './wfo-dashboard.component.html',
  styleUrls: ['./wfo-dashboard.component.scss']
})
export class WfoDashboardComponent {
  constructor(private dialog: MatDialog, private commonService: CommonService) {}

  // Dropdown data
  projectList = [
    { label: 'Project Alpha', value: 'Project Alpha' },
    { label: 'Project Beta', value: 'Project Beta' }
  ];

  daysList = [
    { label: '1', value: 1 },
    { label: '2', value: 2 },
    { label: '3', value: 3 }
  ];

  statusList = [
    { label: 'Approved', value: 'Approved' },
    { label: 'Partial Approved', value: 'Partial Approved' },
    { label: 'Rejected', value: 'Rejected' }
  ];

  // Exception Request Data
  exceptionRequests: ExceptionRequest[] = [
    {
      employeeId: 'R151',
      employeeName: 'Ravishankar',
      designation: 'Business Analyst',
      projectName: 'CyberIQ',
      exceptionDate: '03-09-2025',
      primaryReason: 'Health',
      submissionDate: '02-09-2025',
      exceptionRequestedDays: 1,
      exceptionApprovedDays: 1,
      status: 'Approved',
      managerRemarks: 'Approved on time'
    },
    {
      employeeId: 'N1531',
      employeeName: 'Nand Kishor',
      designation: 'Business Analyst',
      projectName: 'CyberIQ',
      exceptionDate: '30-09-2025',
      primaryReason: 'Marriage',
      submissionDate: '29-09-2025',
      exceptionRequestedDays: 2,
      exceptionApprovedDays: 1,
      status: 'Partial Approved',
      managerRemarks: 'Taken many exceptions'
    }
  ];

  filters = {
    employeeId: '',
    employeeName: '',
    projectName: '',
    exceptionRequestedDays: '',
    exceptionApprovedDays: '',
    exceptionDateFrom: '',
    exceptionDateTo: '',
    status: ''
  };

  openActionDialog(request: ExceptionRequest) {
    const modalRef = this.dialog.open(WfoActionPopupComponent, {
      width: '500px',
      data: request
    });
    modalRef.componentInstance.data = request;
  }

  export() {
    console.log('Exporting to Excel...');
  }

  resetFilters() {
    this.filters = {
      employeeId: '',
      employeeName: '',
      projectName: '',
      exceptionRequestedDays: '',
      exceptionApprovedDays: '',
      exceptionDateFrom: '',
      exceptionDateTo: '',
      status: ''
    };
  }
}
