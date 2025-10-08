import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../components/header/header.component';
import { CommonService } from '../service/common.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Mims-exception-wfo';

  constructor(
    public commonService: CommonService,
    private router: Router
  ) {}

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  isActive(path: string): boolean {
    return this.router.url === '/' + path || (path === '' && this.router.url === '/');
  }
}
