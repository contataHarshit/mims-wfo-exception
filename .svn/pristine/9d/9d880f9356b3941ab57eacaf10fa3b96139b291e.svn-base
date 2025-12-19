// src/app/components/header/header.component.ts
import { Component, Input } from "@angular/core";
import { Router } from "@angular/router";
import { ConfirmPopupComponent } from "../../popup/confirm-popup/confirm-popup.component";
import { MatDialog } from "@angular/material/dialog";

@Component({
  selector: "app-header",
  standalone: true,
  templateUrl: "./header.component.html",
  styleUrls: ["./header.component.scss"],
})
export class HeaderComponent {
  @Input() header: string = "";
  @Input() role: string = "";

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
}
