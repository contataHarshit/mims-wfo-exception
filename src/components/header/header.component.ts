// src/app/components/header/header.component.ts
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { Router } from "@angular/router";
import { ConfirmPopupComponent } from "../../popup/confirm-popup/confirm-popup.component";
import { MatDialog } from "@angular/material/dialog";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./header.component.html",
  styleUrls: ["./header.component.scss"],
})
export class HeaderComponent {
  @Input() header: string = "";
  @Input() role: string = "";
  @Input() dashboardMode: "wfh" | "od" = "wfh";
  @Input() dashboardModeReady = false;
  @Output() dashboardModeChange = new EventEmitter<"wfh" | "od">();
  
  constructor(private router: Router, private dialog: MatDialog) {}
  close() {
    // Clear app data

    const dialogRef = this.dialog.open(ConfirmPopupComponent, {
      width: "400px",
      data: { message: "Close this tab ?" , title: "Close Tab" },
    });

    dialogRef.afterClosed().subscribe((confirmed: any) => {
      if (confirmed) {
        localStorage.clear();

    // Try multiple methods to close the tab
    window.opener = null;
    window.open("", "_self");
    window.close();

    setTimeout(() => {
      document.body.innerHTML =
        '<div style="text-align:center;padding:50px;font-family:Arial"><h2>Logged Out</h2><p>Please close this tab manually</p></div>';
    }, 100);
      }
    });
    
  }
  onViewChange(event: Event) {
    const mode = (event.target as HTMLSelectElement).value as "wfh" | "od";
    this.dashboardModeChange.emit(mode);
  }
}
