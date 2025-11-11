// src/app/components/header/header.component.ts
import { Component, Input } from "@angular/core";
import { Router } from "@angular/router";

@Component({
  selector: "app-header",
  standalone: true,
  templateUrl: "./header.component.html",
  styleUrls: ["./header.component.scss"],
})
export class HeaderComponent {
  @Input() header: string = "";
  @Input() role: string = "";

  constructor(private router: Router) {}

  logout() {
    localStorage.clear();
    // this.router.navigate(['/login']);
    window.location.href = "http://mims/";
  }
}
