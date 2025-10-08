import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { WfoActionPopupComponent } from '../../popup/wfo-action-popup/wfo-action-popup.component';
import { CommonService } from '../../service/common.service';
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
  imports: [CommonModule, MatDialogModule],
  templateUrl: './wfo-dashboard.component.html',
  styleUrls: ['./wfo-dashboard.component.scss']
})
export class WfoDashboardComponent {

  constructor(private dialog: MatDialog,private commonService:CommonService){ 
    // this.commonService.header="WFO Exception Dashboard";
  }

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

  openActionDialog(request: ExceptionRequest) {
   const modalRef=  this.dialog.open(WfoActionPopupComponent, {
      width: '500px',
      data: request
    });
    modalRef.componentInstance.data=request
  }
  export() {
    // Logic to export the table data to Excel
    console.log('Exporting to Excel...');
  }
}
