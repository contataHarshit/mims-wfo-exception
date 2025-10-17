import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../components/create-wfo-exeption-request/create-wfo-exeption-request.component').then(
        (m) => m.CreateWfoExeptionRequestComponent
      ),
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('../components/wfo-dashboard/wfo-dashboard.component').then((m) => m.WfoDashboardComponent),
  },
  {
    path: 'create-wfo-exception-request',
    loadComponent: () =>
      import('../components/create-wfo-exeption-request/create-wfo-exeption-request.component').then(
        (m) => m.CreateWfoExeptionRequestComponent
      ),
  },
];
