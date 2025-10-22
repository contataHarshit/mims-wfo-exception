import { Component } from "@angular/core";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-common-loader",
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: "./common-loader.component.html",
  styleUrls: ["./common-loader.component.scss"],
})
export class CommonLoaderComponent {}
