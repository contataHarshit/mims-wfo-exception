import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import(
        "../components/create-wfo-exeption-request/create-wfo-exeption-request.component"
      ).then(
        (m) => m.CreateWfoExeptionRequestComponent // ✅ corrected spelling
      ),
    pathMatch: "full",
  },
  {
    path: "dashboard",
    loadComponent: () =>
      import("../components/wfo-dashboard/wfo-dashboard.component").then(
        (m) => m.WfoDashboardComponent
      ),
  },
  {
    path: "create-wfo-exeption-request", // ✅ keep same folder spelling
    loadComponent: () =>
      import(
        "../components/create-wfo-exeption-request/create-wfo-exeption-request.component"
      ).then(
        (m) => m.CreateWfoExeptionRequestComponent // ✅ corrected
      ),
  },
  {
    path: "hr-admin-dashboard",
    loadComponent: () =>
      import(
        "../components/hr-admin-dashboard/hr-admin-dashboard.component"
      ).then((m) => m.HrAdminDashboardComponent),
  },
  {
    path: "attendance-dashboard",
    loadComponent: () =>
      import(
        "../components/attendance-dashboard/attendance-dashboard.component"
      ).then((m) => m.CsvUploadComponent),
  },
  {
    path: "correction-dashboard",
    loadComponent: () =>
      import(
        "../components/correction-dashboard/correction-dashboard.component"
      ).then((m) => m.CorrectionDashboardComponent),
  },
];
