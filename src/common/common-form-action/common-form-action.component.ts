import { Component, Output, EventEmitter, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ButtonModule } from "primeng/button";

@Component({
  selector: "app-common-form-action",
  standalone: true,
  imports: [
    CommonModule, // ✅ REQUIRED for *ngIf
    ButtonModule,
  ],
  templateUrl: "./common-form-action.component.html",
  styleUrl: "./common-form-action.component.scss",
})
export class CommonFormActionComponent {
  @Output() submit = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
  @Input() showSubmit: boolean = true;
  @Input() resetBtn: boolean = true;

  onSubmit() {
    this.submit.emit();
  }

  onReset() {
    this.reset.emit();
  }
}
