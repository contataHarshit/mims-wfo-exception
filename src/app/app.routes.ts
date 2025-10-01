import { Routes } from '@angular/router';
import { WfoDashboardComponent } from '../components/wfo-dashboard/wfo-dashboard.component';

export const routes: Routes = [
  {
    path: '',
    component: WfoDashboardComponent,
    pathMatch: 'full' // ensures it matches the exact empty path
  }
];
