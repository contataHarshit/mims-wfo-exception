import { Component, DoCheck, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../components/header/header.component';
import { CommonService } from '../service/common.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpService } from '../service/http.service';
import { ConstantService } from '../service/constant.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, CommonModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements DoCheck, OnInit {
  title = 'Mims-exception-wfo';
  tabs = [
    { label: 'Create WFO Exception Request', path: '', isActive: false },
    { label: 'WFO Dashboard', path: 'dashboard', isActive: false }
  ];

  jwtToken: string | null = null;

  constructor(
    public commonService: CommonService,
    private router: Router,
    private http: HttpService,
    private constants: ConstantService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const sessionId = 'ABC123XYZ'; 
    const storedToken = localStorage.getItem('jwtToken');

    if (!storedToken) {
      this.http.auth(this.constants.auth, { sessionid: "ABC123XYZ" }).subscribe({
        next: (response: any) => {
          console.log('Auth Response:', response);

          const employee = response?.employee || {};
          this.jwtToken = response?.token || null;

          Object.keys(employee).forEach(key => {
            localStorage.setItem(key, employee[key]);
          });
          if (this.jwtToken) localStorage.setItem('jwtToken', this.jwtToken);
        },
        error: (err) => {
          console.error('Auth API Error:', err);
        }
      });
    } else {
      this.jwtToken = storedToken;
    }
  }

  ngDoCheck(): void {
    this.tabs.forEach(tab => {
      tab.isActive = this.isActive(tab.path);
    });
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
