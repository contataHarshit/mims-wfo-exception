import { Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ButtonModule } from "primeng/button";
import { CommonFormActionComponent } from "../common-form-action/common-form-action.component";
import { CommonService } from "../../service/common.service";

@Component({
  selector: "app-common-mail-submit",
  standalone: true,
  imports: [CommonModule, ButtonModule, CommonFormActionComponent],
  templateUrl: "./common-mail-submit.component.html",
  styleUrl: "./common-mail-submit.component.scss",
})
export class CommonMailSubmitComponent {
  /* ---------- inputs from parent ---------- */
  @Input() showSubmit: boolean = true;
  @Input() showReset: boolean = true;
  @Input() submitLabel: string = "Submit";
  /* ---------- outputs to parent ---------- */
  @Output() sendWeekly = new EventEmitter<void>();
  @Output() sendMonthly = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
  constructor(public commonService: CommonService) {}
  onSendWeekly() {
    this.commonService.disableSendMail = true;
    this.sendWeekly.emit();
  }

  onSendMonthly() {
    this.sendMonthly.emit();
  }

  onSubmit() {
    this.submit.emit();
  }

  onReset() {
    this.reset.emit();
  }
}
