import { Component, DoCheck } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../components/header/header.component';
import { CommonService } from '../service/common.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements DoCheck {
  title = 'Mims-exception-wfo';
  tabs = [
    { label: 'Create WFO Exception Request', path: '', isActive: false },
    { label: 'WFO Dashboard', path: 'dashboard', isActive: false }
  ]
  constructor(
    public commonService: CommonService,
    private router: Router
  ) { }
  ngDoCheck(): void {
    this.tabs.forEach(tab => {
      tab.isActive = this.isActive(tab.path)
    })
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  isActive(path: string): boolean {
    const currentUrl = this.router.url.replace(/^\/+/, '');
    const cleanedPath = path.replace(/^\/+/, '');

    if (cleanedPath === '') {
      return currentUrl === '' || currentUrl === 'create-wfo-exception-request';
    }

    return currentUrl === cleanedPath;
  }
}
