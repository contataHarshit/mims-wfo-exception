import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { NgSelectModule } from "@ng-select/ng-select";

@Component({
  selector: "app-common-select",
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: "./common-select.component.html",
  styleUrls: ["./common-select.component.scss"],
})
export class CommonSelectComponent {
  @Input() options: any[] = [];
  @Input() placeholder: string = "Select";
  @Input() searchKey: string = "label";
  @Input() bindValue: string = "";
  @Input() value: any = null;
  @Input() appendTo: string = "body";
  @Input() disabled: boolean = false;
  @Output() valueChange = new EventEmitter<any>();
  @Input() showSubmit: boolean = true;
  @Input() reset: boolean = true;
  onChange(event: any) {
    this.value = event;
    this.valueChange.emit(event);
  }
}
