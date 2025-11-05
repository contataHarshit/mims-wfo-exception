// src/app/components/login/login.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div class="login-page">
      <h2>Login</h2>
      <button (click)="mockLogin()">Mock Login</button>
    </div>
  `,
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    // Clear local storage whenever login page loads
    localStorage.clear();

    // Redirect if token exists
    const token = localStorage.getItem('jwtToken');
    if (token) {
      this.router.navigate(['/dashboard']);
    }
  }

  mockLogin() {
    // Example mock login
    localStorage.setItem('jwtToken', 'mock-token');
    this.router.navigate(['/dashboard']);
  }
}
