import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-duplicate-response-popup',
  standalone: true,
  imports: [],
  templateUrl: './duplicate-response-popup.component.html',
  styleUrl: './duplicate-response-popup.component.scss'
})
export class DuplicateResponsePopupComponent {
  @Input() errors: any[] = [];
  
}
