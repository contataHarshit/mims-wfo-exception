import { Routes } from '@angular/router';
import { WfoDashboardComponent } from '../components/wfo-dashboard/wfo-dashboard.component';
import { CreateWfoExeptionRequestComponent } from '../components/create-wfo-exeption-request/create-wfo-exeption-request.component';
export const routes: Routes = [
  {
    path: '',
    component: WfoDashboardComponent,
    pathMatch: 'full' // ensures it matches the exact empty path
  },
  {
    path: 'create-wfo-exception-request',
    component:CreateWfoExeptionRequestComponent,
    pathMatch: 'full'
  }
];
