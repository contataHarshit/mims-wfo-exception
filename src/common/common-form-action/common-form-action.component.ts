import { Component, Output, EventEmitter } from "@angular/core";
import { ButtonModule } from "primeng/button";

@Component({
  selector: "app-common-form-action",
  standalone: true,
  imports: [ButtonModule],
  templateUrl: "./common-form-action.component.html",
  styleUrl: "./common-form-action.component.scss",
})
export class CommonFormActionComponent {
  @Output() submit = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();

  onSubmit() {
    this.submit.emit();
  }

  onReset() {
    this.reset.emit();
  }
}
